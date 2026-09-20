const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDNI() {
  const clients = await prisma.client.findMany({
    where: { dni: '31950190' },
    include: { invoices: true }
  });
  
  console.log(`Encontrados ${clients.length} clientes para el DNI 31950190`);
  clients.forEach(c => {
    console.log(`- ID: ${c.id} | NAME: ${c.name} | STATUS: ${c.status}`);
    const pendings = c.invoices.filter(i => i.status === 'PENDING');
    console.log(`  Facturas PENDING: ${pendings.length}`);
  });
}
checkDNI().catch(console.error).finally(() => prisma.$disconnect());
