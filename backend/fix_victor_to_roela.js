const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== REAJUSTE DE PAGOS DE VICTOR A BANCO ROELA ===");

  // 1. Eliminar movimientos de traspaso creados en el setup anterior
  const traspasos = await prisma.cashMovement.findMany({
    where: {
      description: { contains: 'Traspaso Cobros Fisicos Victor a Banco Roela', mode: 'insensitive' }
    }
  });
  for (const t of traspasos) {
    console.log(`Eliminando movimiento de traspaso previo ID ${t.id}`);
    await prisma.cashMovement.delete({ where: { id: t.id } });
  }

  // 2. Clientes específicos que deben decir BANCO_ROELA:
  // MAZARA DAVID, MAZARA DOMINGO, CLAUDIA ALEJANDRA LOPEZ, DOÑA ROBERTO JOSE, MUÑOZ CAROLINA
  const clientNames = [
    'MAZARA DAVID',
    'MAZARA DOMINGO',
    'CLAUDIA ALEJANDRA LOPEZ',
    'DOÑA ROBERTO JOSE',
    'MUÑOZ CAROLINA'
  ];

  for (const name of clientNames) {
    const clients = await prisma.client.findMany({
      where: { name: { contains: name, mode: 'insensitive' } }
    });

    for (const c of clients) {
      console.log(`Procesando cliente ${c.name} (ID: ${c.id})...`);
      const invoices = await prisma.invoice.findMany({
        where: { clientId: c.id },
        include: { payments: true }
      });

      for (const inv of invoices) {
        for (const p of inv.payments) {
          console.log(`Cambiando pago ID ${p.id} ($${p.amountPaid}) a BANCO_ROELA`);
          await prisma.payment.update({
            where: { id: p.id },
            data: { method: 'BANCO_ROELA', operator: 'BANCO_ROELA' }
          });

          // Actualizar en cashMovement si existe
          const movs = await prisma.cashMovement.findMany({
            where: {
              amount: p.amountPaid,
              description: { contains: c.name }
            }
          });
          for (const m of movs) {
            await prisma.cashMovement.update({
              where: { id: m.id },
              data: { operator: 'BANCO_ROELA' }
            });
          }
        }
      }
    }
  }

  // 3. Pasar cualquier cobro físico anterior de Víctor a BANCO_ROELA para que la caja de Víctor quede en $0
  const victorPayments = await prisma.payment.findMany({
    where: {
      method: { startsWith: 'CASH_VICTOR' }
    }
  });

  for (const vp of victorPayments) {
    console.log(`Transfiriendo pago histórico de Víctor ID ${vp.id} ($${vp.amountPaid}) a BANCO_ROELA`);
    await prisma.payment.update({
      where: { id: vp.id },
      data: { method: 'BANCO_ROELA', operator: 'BANCO_ROELA' }
    });
  }

  console.log("✅ Reajuste completado. Caja de Víctor queda en $0.00 y los 5 clientes figuran en BANCO_ROELA.");
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
