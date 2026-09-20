const { RouterOSClient } = require('routeros-client');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CPE_USERNAME = 'admin'; 
const CPE_PASSWORD = process.env.CPE_PASSWORD || 'Bran5570'; 

async function runConnectionTest(clientDni) {
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

    const api = new RouterOSClient({
      host: cpeIp,
      user: CPE_USERNAME,
      password: CPE_PASSWORD,
      timeout: 5,
      keepalive: true
    });

    try {
      await api.connect();
    } catch (err) {
      console.error(`[ConnectionTest] Falló conexión a antena ${cpeIp}:`, err.message);
      
      const ticket = await prisma.ticket.create({
        data: {
          clientId: client.id,
          category: 'Sin Señal',
          description: '[DIAGNÓSTICO AUTOMÁTICO] La antena exterior (CPE) no responde a la conexión. Posible corte de energía, POE dañado o cable principal cortado.',
          status: 'OPEN'
        }
      });

      return {
        status: 'error',
        error: 'No pudimos comunicarnos con tu antena exterior.',
        troubleshooting: 'Por favor verifica que el transformador negro (POE) esté enchufado a la corriente y tenga la luz encendida. Verifica que los cables LAN y POE estén bien firmes.',
        ticketCreated: true,
        ticketId: ticket.id
      };
    }

    // --- 1. SEÑAL INALÁMBRICA ---
    let signalData = null;
    let signalWarning = false;
    try {
      const regTable = await api.menu('/interface/wireless/registration-table').get();
      if (regTable && regTable.length > 0) {
        signalData = {
          tx: regTable[0]['tx-signal-strength'],
          rx: regTable[0]['rx-signal-strength'],
          ccq: regTable[0]['tx-ccq'] || regTable[0]['rx-ccq'],
          txRate: regTable[0]['tx-rate'] || 'N/A'
        };
        
        const dbm = parseInt(signalData.tx.replace('dBm', '').trim());
        if (dbm < -78) { // Señal muy degradada
          signalWarning = true;
        }
      }
    } catch (e) {
      console.log(`[ConnectionTest] Error leyendo registro inalambrico en ${cpeIp}:`, e.message);
    }

    // --- 2. DETECCIÓN DEL ROUTER INTERNO Y PING ---
    let routerIp = null;
    let routerPingSuccess = false;
    try {
      const dhcpLeases = await api.menu('/ip/dhcp-server/lease').where('status', 'bound').get();
      if (dhcpLeases && dhcpLeases.length > 0) {
        routerIp = dhcpLeases[0].address;
      } else {
        const arpTable = await api.menu('/ip/arp').whereNot('interface', 'wlan1').get();
        const validArp = arpTable.find(a => a.address && !a.address.startsWith('169.254') && !a.address.endsWith('.255'));
        if (validArp) routerIp = validArp.address;
      }

      if (routerIp) {
        const pingResult = await api.menu('/ping').where('address', routerIp).where('count', '3').get();
        // pingResult usually returns multiple packets, we check if at least one packet received
        const received = pingResult.reduce((acc, p) => acc + (parseInt(p.received) || 0), 0);
        if (received > 0) {
          routerPingSuccess = true;
        }
      }
    } catch (e) {
      console.log(`[ConnectionTest] Error buscando/pingueando router interno en ${cpeIp}:`, e.message);
    }

    api.close();

    // --- 3. EVALUACIÓN Y TICKETS ---
    if (signalWarning) {
      const ticket = await prisma.ticket.create({
        data: {
          clientId: client.id,
          category: 'Problema Tecnico',
          description: `[DIAGNÓSTICO AUTOMÁTICO] Señal degradada detectada. TX: ${signalData.tx}, RX: ${signalData.rx}, CCQ: ${signalData.ccq}`,
          status: 'OPEN'
        }
      });

      return {
        status: 'error',
        error: 'Hemos detectado que la calidad de la señal de tu antena está por debajo del nivel óptimo.',
        troubleshooting: 'No toques ni muevas la antena exterior. Ya hemos generado un ticket para que un técnico revise la alineación o posibles obstrucciones (árboles, construcciones).',
        ticketCreated: true,
        ticketId: ticket.id
      };
    }

    if (!routerPingSuccess) {
      const ticket = await prisma.ticket.create({
        data: {
          clientId: client.id,
          category: 'Problema Tecnico',
          description: `[DIAGNÓSTICO AUTOMÁTICO] Router interno no detectado / no responde a ping desde el CPE. IP Router: ${routerIp || 'Desconocida'}`,
          status: 'OPEN'
        }
      });

      return {
        status: 'error',
        error: 'Tu antena exterior funciona perfecto, pero no podemos comunicarnos con tu router WiFi dentro de casa.',
        troubleshooting: 'Verifica que el cable que sale del puerto LAN del POE esté firmemente conectado a la toma WAN/Internet (generalmente azul) de tu router WiFi. Reinicia tu router desenchufándolo 10 segundos.',
        ticketCreated: true,
        ticketId: ticket.id
      };
    }

    return {
      status: 'ok',
      signal: signalData ? `${signalData.tx} / ${signalData.rx} (CCQ: ${signalData.ccq})` : 'Datos no disponibles',
      message: 'Equipos funcionando correctamente.'
    };

  } catch (error) {
    console.error('[ConnectionTest] Error general:', error);
    return { status: 'error', error: 'Ocurrió un error inesperado al realizar el diagnóstico.' };
  }
}

module.exports = {
  runConnectionTest
};
