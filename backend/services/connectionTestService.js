const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { connectToMikrotik } = require('../mikrotik');

const CPE_USERNAME = 'admin'; 
const CPE_PASSWORD = process.env.CPE_PASSWORD || 'Bran5570'; 

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

    // Nivel 2: Diagnóstico Avanzado (Bloqueado temporalmente por Firewall)
    // El puerto aleatorio del túnel NAT está siendo dropeado por el firewall perimetral del WISP.
    // Hasta definir una ruta alternativa, devolvemos éxito en base al ping del Nivel 1.
    console.log(`[ConnectionTest] CPE ${cpeIp} respondió al ping. Túnel NAT deshabilitado por bloqueo de firewall.`);

    // CASO 5: Todo OK (Temporal)
    return {
      status: 'ok',
      signal: `Ping OK (Pérdida: ${packetLoss}%)`,
      message: 'La antena está comunicándose correctamente con el Nodo. (Métricas de RF suspendidas temporalmente por restricciones de red).'
    };

  } catch (error) {
    console.error('[ConnectionTest] Error general:', error);
    return { status: 'error', error: 'Ocurrió un error inesperado al realizar el diagnóstico avanzado.' };
  } finally {
    if (mikrotikClient) {
      mikrotikClient.close();
    }
  }
}

module.exports = {
  runConnectionTest
};
