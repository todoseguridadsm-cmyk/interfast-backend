const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== ARREGLANDO CAJA VICTOR ===");
  
  // Buscar a Muñoz Carolina
  const clients = await prisma.client.findMany({
    where: { name: { contains: 'MUÑOZ CAROLINA', mode: 'insensitive' } }
  });

  if (clients.length === 0) {
    console.log("No se encontró el cliente Muñoz Carolina.");
    return;
  }

  const clientId = clients[0].id;
  console.log(`Cliente encontrado: ${clients[0].name} (ID: ${clientId})`);

  // Buscar pagos de hoy (o de los últimos días) por unos 22990 pesos de la cajera Humberto pero que debió ser de Victor
  // En Prisma: buscar payments donde el invoiceId pertenece a este cliente y method = CASH_HUMBERTO
  const invoices = await prisma.invoice.findMany({
    where: { clientId: clientId },
    include: { payments: true }
  });

  let pagoCorregido = false;

  for (const inv of invoices) {
    for (const payment of inv.payments) {
      if (payment.method === 'CASH_HUMBERTO' || payment.method === 'HUMBERTO') {
        console.log(`Pago encontrado en factura ${inv.id}: Monto $${payment.amountPaid}, Fecha: ${payment.paymentDate}`);
        
        await prisma.payment.update({
          where: { id: payment.id },
          data: { method: 'CASH_VICTOR', operator: 'VICTOR' }
        });

        // Buscar también en cashMovements el registro de ingreso de ese mismo monto y aproximada misma hora o descripción
        const movements = await prisma.cashMovement.findMany({
          where: {
            amount: payment.amountPaid,
            type: 'INGRESO'
            // no filtramos fecha para no fallar
          }
        });

        for (const mov of movements) {
          if (mov.description.includes(clients[0].name) && mov.description.includes(inv.id.toString())) {
             console.log(`Movimiento de caja encontrado: ID ${mov.id}. Corrigiendo operador a VICTOR...`);
             await prisma.cashMovement.update({
                where: { id: mov.id },
                data: { operator: 'VICTOR' }
             });
          }
        }
        
        console.log(`✅ Pago ID ${payment.id} de $${payment.amountPaid} pasado a la caja de VÍCTOR.`);
        pagoCorregido = true;
      }
    }
  }

  if (!pagoCorregido) {
    console.log("No se encontraron pagos recientes de MUÑOZ CAROLINA registrados por HUMBERTO para corregir.");
  }
}

main()
  .catch(e => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
