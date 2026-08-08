const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== ARREGLANDO CAJA VICTOR PARA CLAUDIA ALEJANDRA LOPEZ ===");
  
  const clients = await prisma.client.findMany({
    where: {
      name: { contains: 'LOPEZ', mode: 'insensitive' }
    }
  });

  const targetClients = clients.filter(c => c.name.toLowerCase().includes('claudia'));

  if (targetClients.length === 0) {
    console.log("No se encontró a Claudia Alejandra López.");
    return;
  }

  for (const client of targetClients) {
    console.log(`Cliente encontrado: ${client.name} (ID: ${client.id})`);

    const invoices = await prisma.invoice.findMany({
      where: { clientId: client.id },
      include: { payments: true }
    });

    for (const inv of invoices) {
      for (const payment of inv.payments) {
        console.log(`Evaluando Pago ID ${payment.id}: Método ${payment.method}, Monto $${payment.amountPaid}`);
        if (payment.method !== 'CASH_VICTOR') {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { method: 'CASH_VICTOR', operator: 'VICTOR' }
          });

          const movements = await prisma.cashMovement.findMany({
            where: {
              amount: payment.amountPaid,
              type: 'IN'
            }
          });

          for (const mov of movements) {
             console.log(`Actualizando movimiento de caja ID ${mov.id} a VICTOR...`);
             await prisma.cashMovement.update({
                where: { id: mov.id },
                data: { operator: 'VICTOR' }
             });
          }
          
          console.log(`✅ Pago ID ${payment.id} de $${payment.amountPaid} pasado a la caja de VÍCTOR.`);
        }
      }
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
