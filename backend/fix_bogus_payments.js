const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const paymentIds = [622, 623, 625, 631, 632, 633, 634, 635];
  const invoiceIds = [602, 513, 652, 600, 508, 668, 678, 573];

  console.log("Iniciando limpieza de pagos falsos...");
  
  // 1. Eliminar pagos
  const deletedPayments = await prisma.payment.deleteMany({
    where: {
      id: {
        in: paymentIds
      }
    }
  });
  console.log(`Se eliminaron ${deletedPayments.count} pagos.`);

  // 2. Volver las facturas a estado PENDING
  const updatedInvoices = await prisma.invoice.updateMany({
    where: {
      id: {
        in: invoiceIds
      }
    },
    data: {
      status: 'PENDING'
    }
  });
  console.log(`Se actualizaron ${updatedInvoices.count} facturas a estado PENDING.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
