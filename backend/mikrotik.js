const { RouterOSClient } = require('routeros-client');

// Parche para evitar el error 'RosException: Tried to process unknown reply: !empty'
// en RouterOS v7 cuando una lista o consulta en la API devuelve 0 elementos o está vacía.
try {
  const { Channel } = require('node-routeros/dist/Channel');
  if (Channel && Channel.prototype && !Channel.prototype._patchedEmpty) {
    const origProcessPacket = Channel.prototype.processPacket;
    Channel.prototype.processPacket = function(packet) {
      if (packet && packet[0] === '!empty') {
        return; // Ignoramos la etiqueta !empty; el siguiente paquete !done resolverá la consulta con []
      }
      return origProcessPacket.apply(this, arguments);
    };
    Channel.prototype._patchedEmpty = true;
  }
} catch (e) {
  console.error('No se pudo aplicar el parche a node-routeros para !empty:', e.message);
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function connectToMikrotik(nodeName) {
  if (!nodeName) {
    throw new Error('El nombre del nodo (mainNode) es requerido para conectarse al Mikrotik.');
  }

  const node = await prisma.node.findFirst({
    where: { name: { equals: nodeName, mode: 'insensitive' } }
  });

  if (!node) {
    throw new Error(`El nodo '${nodeName}' no está registrado en el sistema. Asegúrese de agregarlo en la pestaña Nodos.`);
  }

  if (!node.isActive) {
    throw new Error(`El nodo '${nodeName}' está desactivado.`);
  }

  const client = new RouterOSClient({
    host: node.host,
    port: node.port,
    user: node.user,
    password: node.password,
    timeout: 10000 // 10 segundos de timeout
  });

  const api = await client.connect();
  return { client, api };
}

/**
 * Agrega una IP a la lista de morosos (cortados) en Mikrotik.
 * @param {string} ipAddress - La IP estática del cliente
 * @param {string} listName - El nombre de la Address List (por defecto 'Morosos')
 */
async function addIpToCutoffList(ipAddress, nodeName, listName = 'Morosos', comment = 'Corte Automático CRM') {
  let client = null;
  try {
    let finalComment = comment;
    if (!finalComment || finalComment === 'Corte Automático CRM') {
      try {
        const dbClient = await prisma.client.findFirst({ where: { ipNumber: ipAddress } });
        if (dbClient && dbClient.name) {
          finalComment = `${dbClient.name} (ID: ${dbClient.id}) - Corte CRM`;
        }
      } catch (e) {}
    }
    const conn = await connectToMikrotik(nodeName);
    client = conn.client;
    const api = conn.api.menu('/ip/firewall/address-list');

    const cleanIp = (ipAddress || '').split('/')[0].trim();
    const records = await api.get();
    const existing = (Array.isArray(records) ? records : []).filter(r => {
      if (!r || !r.address) return false;
      const rIp = r.address.split('/')[0].trim();
      if (rIp !== cleanIp) return false;
      const rList = (r.list || '').toLowerCase();
      const tList = (listName || '').toLowerCase();
      return rList === tList || rList === 'morosos' || rList === 'corte' || rList === 'cortados' || rList === 'moroso';
    });
    
    if (existing.length === 0) {
      await api.add({
        list: listName,
        address: cleanIp,
        comment: finalComment
      });
      console.log(`✅ Mikrotik: IP ${cleanIp} agregada a la lista '${listName}' exitosamente con comentario '${finalComment}'.`);
    } else {
      console.log(`ℹ️ Mikrotik: La IP ${cleanIp} ya se encontraba en la lista '${listName}'.`);
    }
  } catch (err) {
    const msg = err.message || JSON.stringify(err);
    console.error(`❌ Mikrotik Error al agregar IP ${ipAddress}:`, msg);
    throw err;
  } finally {
    if (client) {
      client.close();
    }
  }
}

/**
 * Elimina una IP de la lista de morosos (restaura el servicio) en Mikrotik.
 * @param {string} ipAddress - La IP estática del cliente
 * @param {string} listName - El nombre de la Address List (por defecto 'Morosos')
 */
async function removeIpFromCutoffList(ipAddress, nodeName, listName = 'Morosos') {
  let client = null;
  try {
    const conn = await connectToMikrotik(nodeName);
    client = conn.client;
    const api = conn.api.menu('/ip/firewall/address-list');

    const cleanIp = (ipAddress || '').split('/')[0].trim();
    const records = await api.get();
    const targetRecords = (Array.isArray(records) ? records : []).filter(r => {
      if (!r || !r.address) return false;
      const rIp = r.address.split('/')[0].trim();
      if (rIp !== cleanIp) return false;
      const rList = (r.list || '').toLowerCase();
      const tList = (listName || '').toLowerCase();
      return rList === tList || rList === 'morosos' || rList === 'corte' || rList === 'cortados' || rList === 'moroso';
    });
    
    if (targetRecords.length > 0) {
      // Eliminar por su id verificando estrictamente que sea la IP solicitada
      for (const record of targetRecords) {
        const recordId = record.id || record['.id'];
        if (recordId) {
          await api.remove(recordId);
        }
      }
      console.log(`✅ Mikrotik: IP ${cleanIp} eliminada de la lista '${listName}' exitosamente. Servicio restaurado.`);
    } else {
      console.log(`ℹ️ Mikrotik: La IP ${cleanIp} no estaba en la lista '${listName}', nada que remover.`);
    }
  } catch (err) {
    const msg = err.message || JSON.stringify(err);
    console.error(`❌ Mikrotik Error al remover IP ${ipAddress}:`, msg);
    throw err;
  } finally {
    if (client) {
      client.close();
    }
  }
}

async function pingIp(ipAddress, nodeName) {
  let client = null;
  try {
    const conn = await connectToMikrotik(nodeName);
    client = conn.client;
    
    // Ejecutamos 3 pings a la IP
    const results = await client.rosApi.write('/ping', [`=address=${ipAddress}`, '=count=3']);
    
    // El último resultado suele tener los promedios totales
    const lastResult = results[results.length - 1];
    
    // Extraemos estadísticas
    const packetLoss = parseInt(lastResult['packet-loss'] || '100', 10);
    const avgRtt = lastResult['avg-rtt'] || 'N/A';
    const isOnline = packetLoss < 100;

    return {
      success: true,
      isOnline,
      packetLoss,
      avgRtt,
      raw: results
    };
  } catch (err) {
    const msg = err.message || JSON.stringify(err);
    console.error(`❌ Mikrotik Error al hacer ping a ${ipAddress}:`, msg);
    return {
      success: false,
      isOnline: false,
      error: msg
    };
  } finally {
    if (client) {
      client.close();
    }
  }
}

async function getMikrotikActiveClients(nodeName) {
  let client = null;
  const activeClients = new Map(); // Use Map to prevent duplicates by IP

  try {
    const conn = await connectToMikrotik(nodeName);
    client = conn.client;
    
    // Helper function to safely get a menu if it's not empty
    const safeGet = async (menuPath) => {
      try {
        const countRes = await client.rosApi.write(`${menuPath}/print`, ['=count-only=']);
        if (countRes && countRes[0] && countRes[0].ret === '0') {
          return [];
        }
        return await conn.api.menu(menuPath).get();
      } catch (e) {
        console.error(`Error safely getting ${menuPath} from ${nodeName}:`, e.message || e);
        return [];
      }
    };

    // 1. Get PPPoE
    const pppoe = await safeGet('/ppp/active');
    pppoe.forEach(c => {
      if (c.address) {
        activeClients.set(c.address, {
          type: 'PPPoE',
          ip: c.address,
          mac: c.callerId || 'N/A',
          uptime: c.uptime,
          mikrotikName: c.name
        });
      }
    });

    // 2. Get DHCP Leases
    const dhcp = await safeGet('/ip/dhcp-server/lease');
    dhcp.forEach(c => {
      if (c.address && !activeClients.has(c.address)) {
        activeClients.set(c.address, {
          type: 'DHCP',
          ip: c.address,
          mac: c.macAddress || 'N/A',
          uptime: c.expiresAfter || 'N/A',
          mikrotikName: c.hostName || 'N/A'
        });
      }
    });

    // 3. Get ARP
    const arp = await safeGet('/ip/arp');
    arp.forEach(c => {
      if (c.address && !activeClients.has(c.address)) {
        activeClients.set(c.address, {
          type: 'ARP (Estática)',
          ip: c.address,
          mac: c.macAddress || 'N/A',
          uptime: 'N/A',
          mikrotikName: 'N/A'
        });
      }
    });

    return Array.from(activeClients.values());

  } catch (err) {
    console.error(`❌ Error al obtener clientes activos de ${nodeName}:`, err.message || JSON.stringify(err));
    return [];
  } finally {
    if (client) {
      client.close();
    }
  }
}

async function advancedDiagnosis(ipAddress, nodeName) {
  let client = null;
  try {
    const conn = await connectToMikrotik(nodeName);
    client = conn.client;

    // 1. Ping avanzado (5 paquetes a la IP del cliente)
    let pingStats = { isOnline: false, packetLoss: 100, avgRtt: 'N/A', status: 'CRITICO', message: 'Sin respuesta (Offline)' };
    try {
      const pingResults = await client.rosApi.write('/ping', [`=address=${ipAddress}`, '=count=5']);
      if (pingResults && pingResults.length > 0) {
        const lastResult = pingResults[pingResults.length - 1];
        const loss = parseInt(lastResult['packet-loss'] || '100', 10);
        const rtt = lastResult['avg-rtt'] || '0ms';
        const online = loss < 100;
        
        let status = 'OPTIMO';
        let msg = `Conexión estable. Latencia: ${rtt}, Pérdida: ${loss}%`;
        if (loss > 0 && loss < 100) {
          status = 'CRITICO';
          msg = `¡Alerta! Pérdida de paquetes del ${loss}%. Posible interferencia o desalineación.`;
        } else if (loss === 100) {
          status = 'CRITICO';
          msg = 'Equipo 100% Offline (Sin respuesta al ping).';
        } else if (parseInt(rtt) > 80) {
          status = 'OBSERVADO';
          msg = `Latencia elevada (${rtt}). Posible saturación o enlace degradado.`;
        }

        pingStats = { isOnline: online, packetLoss: loss, avgRtt: rtt, status, message: msg };
      }
    } catch (e) {
      console.error('Error en ping avanzado:', e.message);
    }

    // 2. Estado en Tabla ARP (Capa 2 / Enlace físico con el Nodo)
    let arpStats = { found: false, macAddress: 'N/A', interface: 'N/A', status: 'CRITICO', layer2Status: 'CRITICO', message: 'No figura en tabla ARP del nodo (Desconectado)' };
    try {
      const arpResults = await client.rosApi.write('/ip/arp/print', [`?address=${ipAddress}`]);
      if (arpResults && arpResults.length > 0) {
        const arp = arpResults[0];
        const st = arp.status || 'unknown';
        const mac = arp['mac-address'] || 'Desconocida';
        const iface = arp.interface || 'Desconocida';
        
        let l2Status = (st === 'reachable' || st === 'delay' || st === 'stale' || st === 'permanent') ? 'OPTIMO' : 'CRITICO';
        let msg = st === 'reachable' || st === 'delay' ? `Enlace Capa 2 activo por puerto "${iface}".` : `Estado ARP: ${st} en puerto "${iface}".`;
        
        arpStats = {
          found: true,
          macAddress: mac,
          interface: iface,
          status: st,
          layer2Status: l2Status,
          message: msg
        };
      }
    } catch (e) {
      console.error('Error en consulta ARP:', e.message);
    }

    // 3. DHCP & Conflictos MAC
    let dhcpStats = { hasLease: false, status: 'OPTIMO', message: 'Configuración de IP normal en el nodo.' };
    try {
      if (arpStats.found && arpStats.macAddress !== 'N/A' && arpStats.macAddress !== 'Desconocida') {
        const arpsWithMac = await client.rosApi.write('/ip/arp/print', [`?mac-address=${arpStats.macAddress}`]);
        if (arpsWithMac && arpsWithMac.length > 1) {
          dhcpStats = {
            hasLease: true,
            status: 'OBSERVADO',
            message: `¡Atención! La MAC ${arpStats.macAddress} tiene ${arpsWithMac.length} IPs asociadas en el nodo. Revisar posible conflicto o Doble NAT.`
          };
        }
      }
    } catch (e) {
      console.error('Error en consulta DHCP/MAC:', e.message);
    }

    // Evaluación global
    let overallStatus = 'OPTIMO';
    if (pingStats.status === 'CRITICO' || arpStats.layer2Status === 'CRITICO') {
      overallStatus = 'CRITICO';
    } else if (pingStats.status === 'OBSERVADO' || dhcpStats.status === 'OBSERVADO') {
      overallStatus = 'OBSERVADO';
    }

    return {
      success: true,
      pingStats,
      arpStats,
      dhcpStats,
      wirelessStats: {
        available: false,
        status: 'INFO',
        message: 'Telemetría de señal inalámbrica y cable UTP domiciliario requiere acceso directo a IP LAN privada.'
      },
      overallStatus
    };
  } catch (err) {
    console.error(`Error general en diagnóstico avanzado para ${ipAddress}:`, err.message);
    return {
      success: false,
      error: err.message || 'Error al conectar con el router MikroTik'
    };
  } finally {
    if (client) {
      client.close();
    }
  }
}

module.exports = {
  addIpToCutoffList,
  removeIpFromCutoffList,
  pingIp,
  advancedDiagnosis,
  connectToMikrotik,
  getMikrotikActiveClients
};
