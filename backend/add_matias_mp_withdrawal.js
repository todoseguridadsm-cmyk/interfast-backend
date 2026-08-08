const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== REGISTRANDO RETIRO DE MERCADOPAGO DE MATIAS (04/08/2026) ===");

  const adminUser = await prisma.user.findFirst({ where: { username: 'tkip' } });
  const userId = adminUser ? adminUser.id : 1;

  const dateAug04 = new Date('2026-08-04T16:00:00.000Z');

  // Retiro de Matías: $600,000.00 con detalle "Transferencia a cuenta"
  const m = await prisma.cashMovement.create({
    data: {
      type: 'OUT',
      amount: 600000.00,
      category: 'RETIRO_SOCIO',
      description: '[CAJA: MERCADOPAGO] Transferencia a cuenta',
      userId: userId,
      operator: 'MATIAS',
      createdAt: dateAug04
    }
  });

  console.log(`✅ Registrado Retiro de Matías (ID ${m.id}): $600,000.00 al 04/08/2026 desde MercadoPago.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
