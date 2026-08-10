const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== REVISANDO METODOS DE PAGO Y SALDOS DE MERCADOPAGO ===");

  const payments = await prisma.payment.findMany({
    include: { invoice: { include: { client: true } } },
    orderBy: { paymentDate: 'desc' }
  });

  console.log(`Total Pagos en BD: ${payments.length}`);

  const methodsMap = {};
  payments.forEach(p => {
    methodsMap[p.method] = (methodsMap[p.method] || 0) + 1;
  });

  console.log("Métodos de pago encontrados en BD:", methodsMap);

  const startOfDay = new Date('2026-07-31T00:00:00.000Z');
  const endOfDay = new Date('2026-08-09T23:59:59.999Z');

  const mpPayments = payments.filter(p => {
    const m = (p.method || '').toUpperCase();
    const isMp = m.includes('MERCADO') || m.includes('MP') || m.includes('TRANSFERENCIA') || m.includes('DEBITO');
    const inRange = new Date(p.paymentDate) >= startOfDay && new Date(p.paymentDate) <= endOfDay;
    return isMp && inRange;
  });

  const totalMp = mpPayments.reduce((s, p) => s + p.amountPaid, 0);
  console.log(`Total acumulado MercadoPago (desde 31/07 a hoy): $${totalMp.toLocaleString('es-AR', {minimumFractionDigits: 2})}`);
  console.log(`Cantidad de cobros MP en rango: ${mpPayments.length}`);

  // Listar métodos inusuales
  const oddPayments = payments.filter(p => {
    const m = (p.method || '').toUpperCase();
    return !m.startsWith('CASH') && !m.includes('ROELA') && !m.includes('MERCADO') && !m.includes('MP');
  });

  if (oddPayments.length > 0) {
    console.log("\n⚠️ Pagos con método atípico (que podrían no estar sumando a MercadoPago):");
    oddPayments.forEach(p => {
      console.log(` - ID ${p.id}: $${p.amountPaid} | Método: "${p.method}" | Cliente: ${p.invoice?.client?.name || 'S/D'} | Fecha: ${p.paymentDate}`);
    });
  }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
