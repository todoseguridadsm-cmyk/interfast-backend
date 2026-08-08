const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== ARREGLANDO CAJA VICTOR PARA ROBERTO JOSE ===");
  
  // Buscar a Doña Roberto Jose o Roberto Jose
  const clients = await prisma.client.findMany({
    where: {
      OR: [
        { name: { contains: 'ROBERTO JOSE', mode: 'insensitive' } },
        { name: { contains: 'DOÑA ROBERTO', mode: 'insensitive' } }
      ]
    }
  });

  if (clients.length === 0) {
    console.log("No se encontró el cliente Doña Roberto Jose / Roberto Jose.");
    return;
  }

  for (const client of clients) {
    console.log(`Cliente encontrado: ${client.name} (ID: ${client.id})`);

    const invoices = await prisma.invoice.findMany({
      where: { clientId: client.id },
      include: { payments: true }
    });

    for (const inv of invoices) {
      for (const payment of inv.payments) {
        if (payment.method === 'CASH_HUMBERTO' || payment.method === 'HUMBERTO') {
          console.log(`Pago encontrado en factura ${inv.id}: Monto $${payment.amountPaid}, Fecha: ${payment.paymentDate}`);
          
          await prisma.payment.update({
            where: { id: payment.id },
            data: { method: 'CASH_VICTOR', operator: 'VICTOR' }
          });

          // Buscar también en cashMovements el registro de ingreso
          const movements = await prisma.cashMovement.findMany({
            where: {
              amount: payment.amountPaid,
              type: 'IN'
            }
          });

          for (const mov of movements) {
            if (mov.description.includes(client.name) || mov.description.includes(inv.id.toString())) {
               console.log(`Movimiento de caja encontrado: ID ${mov.id}. Corrigiendo a VICTOR...`);
               await prisma.cashMovement.update({
                  where: { id: mov.id },
                  data: { operator: 'VICTOR' }
               });
            }
          }
          
          console.log(`✅ Pago ID ${payment.id} de $${payment.amountPaid} pasado a la caja de VÍCTOR.`);
        }
      }
    }
  }
}

main()
  .catch(e => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
