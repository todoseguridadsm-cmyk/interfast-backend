const { RouterOSClient } = require('routeros-client');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { connectToMikrotik } = require('../mikrotik');

async function runConnectionTest(clientDni) {
  let mikrotikClient = null;
  let panelApi = null;
  const staticNatPort = 65432;

  try {
    const client = await prisma.client.findFirst({
      where: { dni: clientDni }
    });

    if (!client) {
      return { status: 'error', error: 'Cliente no encontrado en la base de datos.' };
    }

    const cpeIp = client.ipNumber;
    if (!cpeIp) {
      return { 
        status: 'error', 
        error: 'No hay una IP asignada a tu servicio.', 
        troubleshooting: 'El sistema no detecta una IP asignada. Por favor, abre un ticket manual para que lo revisemos.'
      };
    }
    
    if (!client.mainNode) {
      return { status: 'error', error: 'El cliente no tiene un nodo principal asignado.' };
    }

    const node = await prisma.node.findFirst({ where: { name: client.mainNode } });
    if (!node) {
      return { status: 'error', error: 'El nodo principal asignado no existe.' };
    }

    // Nivel 1: Conexión al CCR (Nodo Principal)
    console.log(`[ConnectionTest] Intentando conectar al CCR: ${node.host}:${node.port} (Nodo: ${client.mainNode})`);
    const conn = await connectToMikrotik(client.mainNode);
    mikrotikClient = conn.client;

    // Ping al CPE desde el CCR
    console.log(`[ConnectionTest] Realizando ping a ${cpeIp} desde el CCR...`);
    const pingResults = await mikrotikClient.rosApi.write('/ping', [`=address=${cpeIp}`, '=count=3']);
    
    let packetLoss = 100;
    if (pingResults && pingResults.length > 0) {
      const lastResult = pingResults[pingResults.length - 1];
      packetLoss = parseInt(lastResult['packet-loss'] || '100', 10);
    }

    console.log(`[ConnectionTest] Ping a ${cpeIp} -> Pérdida: ${packetLoss}%`);

    if (packetLoss === 100) {
      // CASO 1: CPE Inaccesible / Timeout
      const ticket = await prisma.ticket.create({
        data: {
          clientId: client.id,
          title: '[CRÍTICO] Antena Offline / Sin alimentación',
          description: `**Acción/Repuesto para el Técnico:** Llevar fuente PoE de repuesto, tester de red exterior y verificar suministro eléctrico en domicilio.\n\n**Datos:** IP Antena: ${cpeIp} | Nodo: ${client.mainNode || 'N/A'}`,
          status: 'OPEN',
          priority: 'HIGH'
        }
      });

      return {
        status: 'error',
        error: 'No detectamos conexión con tu equipo exterior. Por favor, verifica que la fuente de alimentación negra (PoE) tenga la luz encendida y esté bien enchufada.',
        troubleshooting: 'Asegúrate también de que los cables LAN y POE estén firmemente conectados.',
        ticketCreated: true,
        ticketId: ticket.id
      };
    }

    // Nivel 2: Diagnóstico Avanzado vía mANTBox
    console.log(`[ConnectionTest] Ping exitoso. Buscando MAC address en CCR ARP...`);
    
    let cpeMac = null;
    try {
      const arpResults = await mikrotikClient.rosApi.write('/ip/arp/print', [`?address=${cpeIp}`]);
      if (arpResults && arpResults.length > 0) {
        cpeMac = arpResults[0]['mac-address'];
      }
    } catch (e) {
      console.log(`[ConnectionTest] Error leyendo ARP:`, e.message);
    }

    if (!cpeMac) {
      return {
        status: 'ok',
        signal: `Ping OK (${packetLoss}%) | MAC: Desconocida`,
        message: 'La antena está conectada, pero no pudimos validar la señal RF (Falta MAC en tabla ARP).'
      };
    }

    if (!client.panelRefId) {
      return {
        status: 'ok',
        signal: `Ping OK (${packetLoss}%) | MAC: ${cpeMac}`,
        message: 'La antena está conectada (Sin panel asociado en BD para medir RF).'
      };
    }

    const panel = await prisma.panel.findUnique({ where: { id: client.panelRefId } });
    if (!panel || !panel.ipAddress) {
      return {
        status: 'ok',
        signal: `Ping OK (${packetLoss}%) | MAC: ${cpeMac}`,
        message: 'La antena está conectada (Panel sin IP configurada en BD).'
      };
    }

    console.log(`[ConnectionTest] Panel encontrado: ${panel.ipAddress}. Creando Túnel NAT Estático en puerto ${staticNatPort}...`);
    const commentLabel = `TempPortalDiag_Panel_${panel.ipAddress}`;

    // Limpieza proactiva de túneles anteriores
    try {
      const existingRules = await mikrotikClient.rosApi.write('/ip/firewall/nat/print', [`?comment=${commentLabel}`]);
      for (const rule of existingRules) {
        if (rule['.id']) await mikrotikClient.rosApi.write('/ip/firewall/nat/remove', [`=.id=${rule['.id']}`]);
      }
    } catch (e) {
      // Ignorar errores de limpieza proactiva
    }

    // Regla Dst-NAT
    await mikrotikClient.rosApi.write('/ip/firewall/nat/add', [
      '=chain=dstnat', 
      '=protocol=tcp', 
      `=dst-port=${staticNatPort}`, 
      '=action=dst-nat', 
      `=to-addresses=${panel.ipAddress}`, 
      '=to-ports=8728', 
      `=comment=${commentLabel}`
    ]);

    // Regla Src-NAT (Hairpinning)
    await mikrotikClient.rosApi.write('/ip/firewall/nat/add', [
      '=chain=srcnat',
      `=dst-address=${panel.ipAddress}`,
      '=protocol=tcp',
      '=dst-port=8728',
      '=action=masquerade',
      `=comment=${commentLabel}`
    ]);

    console.log(`[ConnectionTest] Conectando a mANTBox vía CCR: ${node.host}:${staticNatPort}`);
    
    panelApi = new RouterOSClient({
      host: node.host,
      port: staticNatPort,
      user: panel.user || 'admin',
      password: panel.password || '',
      timeout: 10000,
      keepalive: true
    });

    await panelApi.connect();
    console.log(`[ConnectionTest] Conectado a mANTBox. Extrayendo métricas para MAC ${cpeMac}...`);

    let rfData = null;
    const regTable = await panelApi.menu('/interface/wireless/registration-table').where('mac-address', cpeMac).get();
    
    if (regTable && regTable.length > 0) {
      const clientReg = regTable[0];
      rfData = {
        signal: parseInt(clientReg['signal-strength']?.replace('dBm', '').trim() || '-100'),
        txSignal: parseInt(clientReg['tx-signal-strength']?.replace('dBm', '').trim() || '-100'),
        txCcq: parseInt(clientReg['tx-ccq'] || '0'),
        rxCcq: parseInt(clientReg['rx-ccq'] || '0'),
        uptime: clientReg['uptime']
      };
    } else {
      console.log(`[ConnectionTest] MAC ${cpeMac} no encontrada en registration-table de la mANTBox.`);
    }

    // CASO 4: Falla de Radiofrecuencia (Degradada)
    if (rfData && (rfData.signal < -76 || rfData.txCcq < 70)) {
      const ticket = await prisma.ticket.create({
        data: {
          clientId: client.id,
          title: '[RF / SEÑAL] Señal degradada',
          description: `**Métricas Reales (mANTBox):** Señal ${rfData.signal} dBm | TX ${rfData.txSignal} dBm | CCQ TX ${rfData.txCcq}% / RX ${rfData.rxCcq}%\n**Acción/Repuesto para el Técnico:** Llevar escalera/arnés para realineación de antena SXT o aumento de caño por posible obstáculo (árbol).`,
          status: 'OPEN',
          priority: 'NORMAL'
        }
      });

      return {
        status: 'error',
        error: 'La señal inalámbrica entre la central y tu antena está fuera de los parámetros óptimos (interferencias o desalineación). Ya abrimos un ticket para que un técnico calibre la antena.',
        troubleshooting: 'No toques ni intentes orientar la antena. Espera el contacto de nuestro equipo.',
        ticketCreated: true,
        ticketId: ticket.id
      };
    }

    // CASO 5: Todo OK
    return {
      status: 'ok',
      signal: rfData ? `${rfData.signal}dBm (CCQ: ${rfData.txCcq}%)` : `Ping OK (${packetLoss}%)`,
      message: 'Tu antena cuenta con una conexión óptima a la red central. Si notas lentitud en alguna app, el problema podría estar dentro de tu router Wi-Fi local. Reinícialo.'
    };

  } catch (error) {
    console.error('[ConnectionTest] Error general:', error);
    return { status: 'error', error: 'Ocurrió un error inesperado al realizar el diagnóstico de RF.' };
  } finally {
    if (panelApi) {
      panelApi.close();
    }
    if (mikrotikClient) {
      console.log(`[ConnectionTest] Limpiando Túnel NAT del panel en CCR...`);
      try {
        const rulesToRemove = await mikrotikClient.rosApi.write('/ip/firewall/nat/print', [`?comment=TempPortalDiag_Panel_${clientDni}`]); // En el finally no tenemos scope fácil a panel.ipAddress, usamos otra estrategia
        // Mejor limpiamos todas las que contengan TempPortalDiag_Panel
        const allRules = await mikrotikClient.rosApi.write('/ip/firewall/nat/print', []);
        for (const rule of allRules) {
          if (rule.comment && rule.comment.startsWith('TempPortalDiag_Panel_')) {
            await mikrotikClient.rosApi.write('/ip/firewall/nat/remove', [`=.id=${rule['.id']}`]);
          }
        }
      } catch (e) {
        console.error('[ConnectionTest] Error limpiando túnel NAT:', e.message);
      }
      mikrotikClient.close();
    }
  }
}

module.exports = {
  runConnectionTest
};
