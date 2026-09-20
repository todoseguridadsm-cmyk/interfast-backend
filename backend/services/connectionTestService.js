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
      
      // CASO 1: CPE Inaccesible / Timeout
      const ticket = await prisma.ticket.create({
        data: {
          clientId: client.id,
          category: 'Problema Tecnico',
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

    // --- 1. SEÑAL INALÁMBRICA Y ESTADO DE ETHERNET ---
    let signalData = null;
    let signalWarning = false;
    let ethernetWarning = false;
    
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

    try {
      // Verificamos si negocia a 10Mbps (Cable dañado o sulfatado)
      const ethMonitor = await api.menu('/interface/ethernet/monitor').where('name', 'ether1').where('once', '').get();
      if (ethMonitor && ethMonitor.length > 0) {
        if (ethMonitor[0].rate === '10Mbps') {
          ethernetWarning = true;
        }
      }
    } catch (e) {
      console.log(`[ConnectionTest] Error verificando monitor ethernet en ${cpeIp}:`, e.message);
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
        const received = pingResult.reduce((acc, p) => acc + (parseInt(p.received) || 0), 0);
        if (received > 0) {
          routerPingSuccess = true;
        }
      }
    } catch (e) {
      console.log(`[ConnectionTest] Error buscando/pingueando router interno en ${cpeIp}:`, e.message);
    }

    api.close();

    // --- 3. EVALUACIÓN Y TICKETS (Matriz Prescriptiva) ---

    // CASO 2: Falla Física de Cable (10Mbps)
    if (ethernetWarning) {
      const ticket = await prisma.ticket.create({
        data: {
          clientId: client.id,
          category: 'Problema Tecnico',
          title: '[FALLA FÍSICA] Cable UTP dañado o no-link en ether1',
          description: `**Acción/Repuesto para el Técnico:** Llevar crimpeadora, conectores RJ45 y tramo de cable UTP para rearmar bajada/patchcord.\n\n**Datos:** IP Antena: ${cpeIp} | Nodo: ${client.mainNode || 'N/A'}`,
          status: 'OPEN',
          priority: 'HIGH'
        }
      });

      return {
        status: 'error',
        error: 'Detectamos un falso contacto en el cable de red que conecta el transformador con tu router Wi-Fi. Revisa que las fichas estén bien apretadas.',
        troubleshooting: 'No fuerces ni dobles el cable abruptamente.',
        ticketCreated: true,
        ticketId: ticket.id
      };
    }

    // CASO 3: Falla de Router Wi-Fi
    if (!routerPingSuccess) {
      const ticket = await prisma.ticket.create({
        data: {
          clientId: client.id,
          category: 'Problema Tecnico',
          title: '[EQUIPO LOCAL] Falla en Router Wi-Fi domiciliario',
          description: `**Acción/Repuesto para el Técnico:** Llevar router Wi-Fi de recambio o realizar reinicio de fábrica en domicilio.\n\n**Datos:** IP Antena: ${cpeIp} | IP Router: ${routerIp || 'Desconocida'}`,
          status: 'OPEN',
          priority: 'NORMAL'
        }
      });

      return {
        status: 'error',
        error: 'Tu antena funciona bien, pero tu router Wi-Fi no responde. Desenchúfalo de la corriente por 30 segundos y vuelve a probar.',
        troubleshooting: 'Verifica que el cable celeste/gris esté conectado en el puerto Internet o WAN del router.',
        ticketCreated: true,
        ticketId: ticket.id
      };
    }

    // CASO 4: Falla de Radiofrecuencia
    if (signalWarning) {
      const ticket = await prisma.ticket.create({
        data: {
          clientId: client.id,
          category: 'Problema Tecnico',
          title: '[RF / SEÑAL] Señal degradada',
          description: `**Niveles:** TX ${signalData.tx} | RX ${signalData.rx} | CCQ ${signalData.ccq}%\n**Acción/Repuesto para el Técnico:** Llevar escalera/arnés para realineación de antena o aumento de caño por posible obstáculo (árbol).`,
          status: 'OPEN',
          priority: 'NORMAL'
        }
      });

      return {
        status: 'error',
        error: 'La señal entre la central y tu antena presenta interferencias o desalineación climática. Derivamos la calibración a un técnico.',
        troubleshooting: 'No toques ni intentes orientar la antena. Ya coordinamos la visita.',
        ticketCreated: true,
        ticketId: ticket.id
      };
    }

    // CASO 5: Todo OK
    return {
      status: 'ok',
      signal: signalData ? `${signalData.tx} / ${signalData.rx} (CCQ: ${signalData.ccq})` : 'Datos no disponibles',
      message: 'Equipos funcionando correctamente. Si notas lentitud en alguna app, te sugerimos reiniciar tu dispositivo celular.'
    };

  } catch (error) {
    console.error('[ConnectionTest] Error general:', error);
    return { status: 'error', error: 'Ocurrió un error inesperado al realizar el diagnóstico.' };
  }
}

module.exports = {
  runConnectionTest
};
