const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== REGISTRANDO RETIROS DE MERCADOPAGO DE VICTOR (04/08/2026) ===");

  const adminUser = await prisma.user.findFirst({ where: { username: 'victor' } }) || await prisma.user.findFirst({ where: { username: 'tkip' } });
  const userId = adminUser ? adminUser.id : 1;

  const dateAug04 = new Date('2026-08-04T15:00:00.000Z');

  // Retiro 1: $52,312.00 con detalle A.C.C.C
  const m1 = await prisma.cashMovement.create({
    data: {
      type: 'OUT',
      amount: 52312.00,
      category: 'RETIRO_SOCIO',
      description: '[CAJA: MERCADOPAGO] Retiro de socio Víctor - A.C.C.C',
      userId: userId,
      operator: 'VICTOR',
      createdAt: dateAug04
    }
  });
  console.log(`✅ Registrado Retiro 1 (ID ${m1.id}): $52,312.00 al 04/08/2026 desde MercadoPago asignado a Víctor.`);

  // Retiro 2: $52,312.00 con detalle A.C.C.C
  const m2 = await prisma.cashMovement.create({
    data: {
      type: 'OUT',
      amount: 52312.00,
      category: 'RETIRO_SOCIO',
      description: '[CAJA: MERCADOPAGO] Retiro de socio Víctor - A.C.C.C',
      userId: userId,
      operator: 'VICTOR',
      createdAt: dateAug04
    }
  });
  console.log(`✅ Registrado Retiro 2 (ID ${m2.id}): $52,312.00 al 04/08/2026 desde MercadoPago asignado a Víctor.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
