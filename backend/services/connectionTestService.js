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

    // Nivel 2: Diagnóstico Avanzado vía mANTBox (Fetch Interno)
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

    console.log(`[ConnectionTest] Panel encontrado: ${panel.ipAddress}. Ejecutando consulta interna /tool fetch desde CCR...`);
    
    let rfData = null;
    try {
      const fetchResult = await mikrotikClient.rosApi.write('/tool/fetch', [
        `=url=http://${panel.ipAddress}/rest/interface/wireless/registration-table`,
        `=user=${panel.user || 'admin'}`,
        `=password=${panel.password || ''}`,
        '=output=user',
        '=as-value='
      ]);
      
      const responseData = fetchResult.find(item => item.data);
      if (responseData && responseData.data) {
        const jsonData = JSON.parse(responseData.data);
        const clientReg = jsonData.find(entry => entry['mac-address'] === cpeMac || entry['mac-address']?.toLowerCase() === cpeMac?.toLowerCase());
        
        if (clientReg) {
          rfData = {
            signal: parseInt(clientReg['signal-strength']?.replace('dBm', '').trim() || clientReg['signal-strength'] || '-100'),
            txSignal: parseInt(clientReg['tx-signal-strength']?.replace('dBm', '').trim() || clientReg['tx-signal-strength'] || '-100'),
            txCcq: parseInt(clientReg['tx-ccq'] || '0'),
            rxCcq: parseInt(clientReg['rx-ccq'] || '0'),
            uptime: clientReg['uptime']
          };
          console.log(`[ConnectionTest] Métricas extraídas: Señal ${rfData.signal}, CCQ ${rfData.txCcq}%`);
        } else {
          console.log(`[ConnectionTest] MAC ${cpeMac} no encontrada en el JSON devuelto por la mANTBox.`);
        }
      } else {
        console.log(`[ConnectionTest] No se recibió el campo 'data' en el fetch. Resultado:`, fetchResult);
      }
    } catch (e) {
      console.log(`[ConnectionTest] Error en consulta interna a mANTBox:`, e.message);
    }

    // CASO 4: Falla de Radiofrecuencia (Degradada)
    if (rfData && (rfData.signal < -75 || rfData.txCcq < 70)) {
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
    return { status: 'error', error: 'Ocurrió un error inesperado al realizar el diagnóstico de red.' };
  } finally {
    if (mikrotikClient) {
      mikrotikClient.close();
    }
  }
}

module.exports = {
  runConnectionTest
};
