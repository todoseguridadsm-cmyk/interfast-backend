const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Buscar el cliente
  const client = await prisma.client.findFirst({
    where: { name: { contains: 'AMBROCIO', mode: 'insensitive' } },
    select: { id: true, name: true, phone: true }
  });

  if (!client) {
    console.log('❌ Cliente AMBROCIO no encontrado');
    await prisma.$disconnect();
    return;
  }

  console.log('✅ Cliente encontrado:', client.name, '| ID:', client.id);

  // Buscar sus facturas pendientes
  const invoices = await prisma.invoice.findMany({
    where: { clientId: client.id, status: { in: ['PENDING', 'PARTIAL'] } },
    orderBy: { createdAt: 'desc' }
  });

  console.log('Facturas pendientes:', JSON.stringify(invoices, null, 2));

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
