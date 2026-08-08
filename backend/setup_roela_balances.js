const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== SETUP SALDOS INICIALES DE BANCO ROELA Y MERCADOPAGO (31/07/2026) ===");
  
  const adminUser = await prisma.user.findFirst({ where: { username: 'tkip' } });
  const userId = adminUser ? adminUser.id : 1;

  const dateJuly31 = new Date('2026-07-31T12:00:00.000Z');

  // 1. Ingreso MercadoPago ($356,234.00) al 31/07/2026
  const existingMp = await prisma.cashMovement.findFirst({
    where: {
      description: { contains: 'Saldo Inicial MercadoPago', mode: 'insensitive' }
    }
  });

  if (!existingMp) {
    await prisma.cashMovement.create({
      data: {
        type: 'IN',
        amount: 356234.00,
        category: 'INGRESO_MANUAL',
        description: 'Dinero en cuenta - Saldo Inicial MercadoPago',
        userId: userId,
        operator: 'MERCADOPAGO',
        createdAt: dateJuly31
      }
    });
    console.log("✅ Creado saldo inicial de MercadoPago: $356,234.00 al 31/07/2026");
  } else {
    console.log("ℹ️ Saldo inicial de MercadoPago ya existía.");
  }

  // 2. Ingreso Banco Roela ($298,535.00) al 31/07/2026
  const existingRoela = await prisma.cashMovement.findFirst({
    where: {
      description: { contains: 'Saldo Inicial Banco Roela', mode: 'insensitive' }
    }
  });

  if (!existingRoela) {
    await prisma.cashMovement.create({
      data: {
        type: 'IN',
        amount: 298535.00,
        category: 'INGRESO_MANUAL',
        description: 'Dinero en cuenta - Saldo Inicial Banco Roela',
        userId: userId,
        operator: 'BANCO_ROELA',
        createdAt: dateJuly31
      }
    });
    console.log("✅ Creado saldo inicial de Banco Roela: $298,535.00 al 31/07/2026");
  } else {
    console.log("ℹ️ Saldo inicial de Banco Roela ya existía.");
  }

  // 3. Reajuste de Cobros Físicos de Víctor ($114,950.00) hacia Banco Roela
  // Creamos un movimiento de ajuste que lleva a $0 el cobro físico de Víctor y lo transfiere a Banco Roela
  const existingTransfer = await prisma.cashMovement.findFirst({
    where: {
      description: { contains: 'Traspaso Cobros Fisicos Victor a Banco Roela', mode: 'insensitive' }
    }
  });

  if (!existingTransfer) {
    // Restamos de la caja de Víctor
    await prisma.cashMovement.create({
      data: {
        type: 'OUT',
        amount: 114950.00,
        category: 'RETIRO_SOCIO',
        description: '[CAJA: VICTOR] Traspaso Cobros Fisicos Victor a Banco Roela',
        userId: userId,
        operator: 'VICTOR',
        createdAt: dateJuly31
      }
    });

    // Sumamos a la caja de Banco Roela
    await prisma.cashMovement.create({
      data: {
        type: 'IN',
        amount: 114950.00,
        category: 'INGRESO_MANUAL',
        description: 'Traspaso Cobros Fisicos Victor a Banco Roela',
        userId: userId,
        operator: 'BANCO_ROELA',
        createdAt: dateJuly31
      }
    });

    console.log("✅ Reajustado cobro físico de Víctor ($114,950.00) transferido a Banco Roela.");
  } else {
    console.log("ℹ️ Traspaso de cobro físico de Víctor a Banco Roela ya fue registrado.");
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
