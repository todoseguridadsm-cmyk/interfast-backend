const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== INSPECCIONANDO Y LIMPIANDO MOVIMIENTOS DUPLICADOS EN CAJA ===");

  // Buscar movimientos que se hayan creado como "Pago Abono - ..."
  const movements = await prisma.cashMovement.findMany({
    where: {
      description: { contains: 'Pago Abono -', mode: 'insensitive' }
    }
  });

  console.log(`Encontrados ${movements.length} movimientos de 'Pago Abono -' en cashMovement.`);

  for (const m of movements) {
    console.log(`Eliminando movimiento de caja duplicado ID ${m.id}: "${m.description}" ($${m.amount})`);
    await prisma.cashMovement.delete({
      where: { id: m.id }
    });
  }

  console.log("✅ Movimientos duplicados eliminados. Los pagos quedan registrados exclusivamente mediante la tabla Payment como MERCADOPAGO.");
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
