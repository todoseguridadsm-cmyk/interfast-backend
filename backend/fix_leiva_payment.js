require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const mikrotik = require('./mikrotik');
const Afip = require('@afipsdk/afip.js');
const { emitAfipInvoiceHelper } = require('./afip_helper');

async function fixLeivaPayment() {
  const invoiceId = 595;
  const clientId = 86;
  const paymentIdMP = '174169413798';
  const transactionAmount = 22990;

  try {
    console.log(`Buscando factura ${invoiceId}...`);
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { client: true }
    });

    if (!invoice) throw new Error("Factura no encontrada");
    if (invoice.status === 'PAID') {
      console.log("La factura ya está pagada.");
      return;
    }

    console.log("Registrando pago...");
    await prisma.payment.create({
      data: {
        invoiceId: invoiceId,
        method: 'MERCADOPAGO',
        amountPaid: transactionAmount,
        mpFee: 1796.6,
        mpTax: 137.94,
        paymentDate: new Date('2026-08-16T15:04:54.000-04:00')
      }
    });

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'PAID' }
    });

    await prisma.cutoffList.deleteMany({
      where: { invoiceId: invoiceId }
    });

    await prisma.client.update({
      where: { id: clientId },
      data: { status: 'ACTIVE' }
    });

    console.log("Actualizando Mikrotik...");
    if (invoice.client && invoice.client.ipNumber && invoice.client.mainNode) {
      try {
        await mikrotik.removeIpFromCutoffList(invoice.client.ipNumber, invoice.client.mainNode);
        console.log("IP removida del address-list de cortes en Mikrotik.");
      } catch (err) {
        console.error("Error en Mikrotik:", err.message || err);
      }
    }

    console.log("Emitiendo factura AFIP...");
    let afip = null;
    try {
      afip = new Afip({
        CUIT: 30717010554,
        res_folder: './afip_certs/',
        production: true
      });
      await emitAfipInvoiceHelper(invoiceId, afip);
      console.log("Factura AFIP emitida correctamente.");
    } catch (e) {
      console.error("Error emitiendo AFIP:", e.message);
    }

    console.log(`✅ Pago de LEIVA ANDREA registrado con éxito y factura #${invoiceId} cerrada.`);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixLeivaPayment();
