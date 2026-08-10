const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixMovement149() {
  const mov = await prisma.cashMovement.update({
    where: { id: 149 },
    data: {
      operator: 'VICTOR',
      description: '[CAJA: MERCADOPAGO] Retiro de socio Víctor - TRANSFERENCIA'
    }
  });

  console.log('✅ Movement 149 updated:', mov);
  await prisma.$disconnect();
}

fixMovement149().catch(console.error);
