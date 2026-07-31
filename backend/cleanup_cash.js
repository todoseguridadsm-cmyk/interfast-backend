const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanCashMovements() {
  console.log("Checking Cash Movements for today...");
  
  // Get start of today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const movements = await prisma.cashMovement.findMany({
    where: {
      createdAt: { gte: today },
      category: 'PAGO_FACTURA'
    }
  });

  console.log(`Found ${movements.length} payment movements today.`);

  const seenDescriptions = new Set();
  let deletedCount = 0;

  for (const mov of movements) {
    // 1. Check if duplicate description
    if (seenDescriptions.has(mov.description)) {
      console.log(`Duplicate found: ${mov.description} (ID: ${mov.id}). Deleting...`);
      await prisma.cashMovement.delete({ where: { id: mov.id } });
      deletedCount++;
      continue;
    }

    // 2. Extract invoice ID to check if it's orphaned (invoice was deleted)
    // Description format: "Cobro CASH_HUMBERTO - Factura #419 (GAUNA GUSTAVO)"
    const match = mov.description.match(/Factura #(\d+)/);
    if (match) {
      const invId = parseInt(match[1]);
      const inv = await prisma.invoice.findUnique({ where: { id: invId } });
      if (!inv) {
         console.log(`Orphan found (invoice ${invId} deleted): ${mov.description} (ID: ${mov.id}). Deleting...`);
         await prisma.cashMovement.delete({ where: { id: mov.id } });
         deletedCount++;
         continue;
      }
    }

    seenDescriptions.add(mov.description);
  }

  console.log(`Done. Deleted ${deletedCount} bad cash movements.`);
  await prisma.$disconnect();
}

cleanCashMovements();
