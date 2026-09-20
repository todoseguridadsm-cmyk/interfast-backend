const { RouterOSClient } = require('routeros-client');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { connectToMikrotik } = require('../mikrotik');

const CPE_USERNAME = 'admin'; 
const CPE_PASSWORD = process.env.CPE_PASSWORD || 'Bran5570'; 

async function runConnectionTest(clientDni) {
  let mikrotikClient = null;
  let cpeApi = null;
  let natRuleId = null;

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
    console.log(`[ConnectionTest] Conectando al CCR del nodo: ${client.mainNode}`);
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

    // Nivel 2: Diagnóstico Avanzado (Túnel NAT Dinámico)
    console.log(`[ConnectionTest] CPE ${cpeIp} respondió al ping. Creando Túnel NAT en el CCR...`);
    
    const randomPort = Math.floor(Math.random() * (65000 - 60000 + 1)) + 60000;
    const commentLabel = `TempPortalDiag_${cpeIp}`;

    // Limpieza proactiva: Si el proceso de Render crasheó en un intento anterior, borramos la regla huérfana
    try {
      const existingRules = await mikrotikClient.rosApi.write('/ip/firewall/nat/print', [`?comment=${commentLabel}`]);
      for (const rule of existingRules) {
        if (rule['.id']) {
          await mikrotikClient.rosApi.write('/ip/firewall/nat/remove', [`=.id=${rule['.id']}`]);
          console.log(`[ConnectionTest] Regla huérfana eliminada en CCR para ${cpeIp}`);
        }
      }
    } catch (e) {
      console.log('[ConnectionTest] No se requirió limpieza proactiva o falló:', e.message);
    }

    const natResult = await mikrotikClient.rosApi.write('/ip/firewall/nat/add', [
      '=chain=dstnat', 
      '=protocol=tcp', 
      `=dst-port=${randomPort}`, 
      '=action=dst-nat', 
      `=to-addresses=${cpeIp}`, 
      '=to-ports=8728', 
      `=comment=${commentLabel}`
    ]);
    
    natRuleId = natResult[0]?.ret;

    console.log(`[ConnectionTest] Túnel NAT creado en puerto ${randomPort}. Conectando al CPE...`);
    
    // Conectamos al CPE a través del puerto desviado en la IP pública del CCR
    cpeApi = new RouterOSClient({
      host: node.host,
      port: randomPort,
      user: CPE_USERNAME,
      password: CPE_PASSWORD,
      timeout: 10000,
      keepalive: true
    });

    await cpeApi.connect();
    console.log(`[ConnectionTest] ¡Conectado exitosamente al CPE ${cpeIp}! Extrayendo métricas...`);

    // --- 1. SEÑAL INALÁMBRICA Y ESTADO DE ETHERNET ---
    let signalData = null;
    let signalWarning = false;
    let ethernetWarning = false;
    
    try {
      const regTable = await cpeApi.menu('/interface/wireless/registration-table').get();
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
      console.log(`[ConnectionTest] Error leyendo registro inalámbrico en ${cpeIp}:`, e.message);
    }

    try {
      // Verificamos si negocia a 10Mbps (Cable dañado o sulfatado)
      const ethMonitor = await cpeApi.menu('/interface/ethernet/monitor').where('name', 'ether1').where('once', '').get();
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
      const dhcpLeases = await cpeApi.menu('/ip/dhcp-server/lease').where('status', 'bound').get();
      if (dhcpLeases && dhcpLeases.length > 0) {
        routerIp = dhcpLeases[0].address;
      } else {
        const arpTable = await cpeApi.menu('/ip/arp').whereNot('interface', 'wlan1').get();
        const validArp = arpTable.find(a => a.address && !a.address.startsWith('169.254') && !a.address.endsWith('.255'));
        if (validArp) routerIp = validArp.address;
      }

      if (routerIp) {
        const pingResult = await cpeApi.menu('/ping').where('address', routerIp).where('count', '3').get();
        const received = pingResult.reduce((acc, p) => acc + (parseInt(p.received) || 0), 0);
        if (received > 0) {
          routerPingSuccess = true;
        }
      }
    } catch (e) {
      console.log(`[ConnectionTest] Error buscando/pingueando router interno en ${cpeIp}:`, e.message);
    }

    // --- 3. EVALUACIÓN Y TICKETS (Matriz Prescriptiva) ---

    // CASO 2: Falla Física de Cable (10Mbps)
    if (ethernetWarning) {
      const ticket = await prisma.ticket.create({
        data: {
          clientId: client.id,
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
          title: '[RF / SEÑAL] Señal degradada',
          description: `**Niveles:** TX ${signalData?.tx} | RX ${signalData?.rx} | CCQ ${signalData?.ccq}%\n**Acción/Repuesto para el Técnico:** Llevar escalera/arnés para realineación de antena o aumento de caño por posible obstáculo (árbol).`,
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
      message: 'Equipos comunicándose con el nodo correctamente. Si notas lentitud en alguna app, te sugerimos reiniciar tu dispositivo celular.'
    };

  } catch (error) {
    console.error('[ConnectionTest] Error general:', error);
    return { status: 'error', error: 'Ocurrió un error inesperado al realizar el diagnóstico avanzado.' };
  } finally {
    if (cpeApi) {
      cpeApi.close();
    }
    
    // Limpieza de la regla NAT
    if (mikrotikClient) {
      if (natRuleId) {
        console.log(`[ConnectionTest] Eliminando Túnel NAT ${natRuleId} del CCR...`);
        try {
          await mikrotikClient.rosApi.write('/ip/firewall/nat/remove', [`=.id=${natRuleId}`]);
        } catch (e) {
          console.error('[ConnectionTest] Error eliminando túnel NAT por ID:', e.message);
        }
      }
      mikrotikClient.close();
    }
  }
}

module.exports = {
  runConnectionTest
};
