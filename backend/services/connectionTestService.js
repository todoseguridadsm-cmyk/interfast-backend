const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { connectToMikrotik } = require('../mikrotik');

async function runConnectionTest(clientDni) {
  let mikrotikClient = null;
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

    // Nivel 2: Diagnóstico Avanzado (Stub temporal hasta próxima instrucción)
    // El CPE respondió al ping. 
    console.log(`[ConnectionTest] CPE ${cpeIp} respondió correctamente. Preparando extracción de RF...`);

    // TODO: Extraer RF (Señal/CCQ) y Ethernet desde el CCR
    
    // CASO 5: Todo OK (Temporal)
    return {
      status: 'ok',
      signal: `Ping OK (Pérdida: ${packetLoss}%)`,
      message: 'Equipos comunicándose con el nodo correctamente. Fase 2 de RF pendiente de implementación.'
    };

  } catch (error) {
    console.error('[ConnectionTest] Error general:', error);
    return { status: 'error', error: 'Ocurrió un error al conectar con el nodo principal.' };
  } finally {
    if (mikrotikClient) {
      mikrotikClient.close();
    }
  }
}

module.exports = {
  runConnectionTest
};
