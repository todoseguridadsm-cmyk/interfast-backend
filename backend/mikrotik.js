const { RouterOSClient } = require('routeros-client');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function connectToMikrotik(nodeName) {
  if (!nodeName) {
    throw new Error('El nombre del nodo (mainNode) es requerido para conectarse al Mikrotik.');
  }

  const node = await prisma.node.findUnique({
    where: { name: nodeName }
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
    const conn = await connectToMikrotik(nodeName);
    client = conn.client;
    const api = conn.api.menu('/ip/firewall/address-list');

    // Revisar si la IP ya está en la lista (descargando toda la lista para evitar el bug de routeros v7 con !empty)
    const list = await api.get();
    const existing = list.filter(item => item.address === ipAddress && item.list === listName);
    
    if (existing.length === 0) {
      await api.add({
        list: listName,
        address: ipAddress,
        comment: comment
      });
      console.log(`✅ Mikrotik: IP ${ipAddress} agregada a la lista '${listName}' exitosamente.`);
    } else {
      console.log(`ℹ️ Mikrotik: La IP ${ipAddress} ya se encontraba en la lista '${listName}'.`);
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

    // Buscar el registro de la IP en la lista (descargando la lista completa)
    const list = await api.get();
    const records = list.filter(item => item.address === ipAddress && item.list === listName);
    
    if (records.length > 0) {
      // Eliminar por su .id
      for (const record of records) {
        await api.remove(record['.id']);
      }
      console.log(`✅ Mikrotik: IP ${ipAddress} eliminada de la lista '${listName}' exitosamente. Servicio restaurado.`);
    } else {
      console.log(`ℹ️ Mikrotik: La IP ${ipAddress} no estaba en la lista '${listName}', nada que remover.`);
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
    
    // 1. Get PPPoE
    try {
      const pppoe = await conn.api.menu('/ppp/active').get();
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
    } catch(e) {
      if (!e.message || !e.message.includes('!empty')) {
        console.error(`Error reading PPPoE from ${nodeName}:`, e.message);
      }
    }

    // 2. Get DHCP Leases
    try {
      const dhcp = await conn.api.menu('/ip/dhcp-server/lease').get();
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
    } catch(e) {
      if (!e.message || !e.message.includes('!empty')) {
        console.error(`Error reading DHCP from ${nodeName}:`, e.message);
      }
    }

    // 3. Get ARP
    try {
      const arp = await conn.api.menu('/ip/arp').get();
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
    } catch(e) {
      if (!e.message || !e.message.includes('!empty')) {
        console.error(`Error reading ARP from ${nodeName}:`, e.message);
      }
    }

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

module.exports = {
  addIpToCutoffList,
  removeIpFromCutoffList,
  pingIp,
  connectToMikrotik,
  getMikrotikActiveClients
};
