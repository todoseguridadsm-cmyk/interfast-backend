const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== REGISTRANDO PAGO DE VILA GONZALO ($22,990.66) ===");

  const client = await prisma.client.findFirst({
    where: {
      OR: [
        { name: { contains: 'VILA', mode: 'insensitive' } },
        { name: { contains: 'GONZALO VILA', mode: 'insensitive' } }
      ]
    }
  });

  if (!client) {
    console.error("❌ No se encontró ningún cliente con el nombre 'VILA GONZALO' o 'VILA'.");
    return;
  }

  console.log(`Cliente encontrado: ID ${client.id} - "${client.name}" | DNI: ${client.dni}`);

  const invoice = await prisma.invoice.findFirst({
    where: { clientId: client.id, month: 8, year: 2026 },
    include: { payments: true }
  }) || await prisma.invoice.findFirst({
    where: { clientId: client.id, status: 'PENDING' },
    orderBy: { id: 'desc' },
    include: { payments: true }
  });

  if (!invoice) {
    console.error(`❌ El cliente ID ${client.id} no tiene facturas activas o pendientes.`);
    return;
  }

  // Actualizar estado de la factura a PAID
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { status: 'PAID' }
  });

  const adminUser = await prisma.user.findFirst({ where: { username: 'tkip' } });
  const userId = adminUser ? adminUser.id : 1;

  // Crear el pago por MercadoPago
  const newPayment = await prisma.payment.create({
    data: {
      invoiceId: invoice.id,
      method: 'MERCADOPAGO',
      amountPaid: 22990.66,
      paymentDate: new Date(),
      userId: userId,
      operator: 'MERCADOPAGO'
    }
  });

  console.log(`✅ Pago ID ${newPayment.id} registrado exitosamente por $22,990.66 (MERCADOPAGO) para Factura #${invoice.id} del Cliente "${client.name}".`);
  console.log("🟢 Impacto listo en la tarjeta de MercadoPago y Caja General del Cierre Diario.");
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
