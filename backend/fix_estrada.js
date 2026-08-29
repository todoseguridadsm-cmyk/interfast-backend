require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const mikrotik = require('./mikrotik');

async function fixEstrada() {
  try {
    const invoiceId = 663;
    const clientId = 190;

    console.log("Actualizando factura a PAID...");
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'PAID' }
    });

    console.log("Actualizando estado del cliente...");
    const client = await prisma.client.update({
      where: { id: clientId },
      data: { status: 'ACTIVE' }
    });

    console.log("Removiendo de cortes...");
    await prisma.cutoffList.deleteMany({
      where: { invoiceId: invoiceId }
    });

    if (client.ipNumber && client.mainNode) {
      try {
        await mikrotik.removeIpFromCutoffList(client.ipNumber, client.mainNode);
        console.log("IP removida de Mikrotik.");
      } catch (e) {
        console.error("Error en mikrotik:", e.message);
      }
    }

    console.log("Completado con éxito.");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixEstrada();
