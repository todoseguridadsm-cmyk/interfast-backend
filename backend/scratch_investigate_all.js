const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const clients = await prisma.client.findMany({
    select: { id: true, name: true, dni: true }
  });
  
  const matches = clients.filter(c => 
    c.name.toLowerCase().includes('olivo') || 
    c.name.toLowerCase().includes('patagonia') ||
    c.name.toLowerCase().includes('deposito') ||
    c.name.toLowerCase().includes('depósito')
  );
  
  console.log("Coincidencias encontradas:", matches.length);
  for (const m of matches) {
    const invs = await prisma.invoice.findMany({ where: { clientId: m.id } });
    console.log(`Cliente: ${m.name} | DNI: ${m.dni}`);
    console.log(`Facturas totales: ${invs.length}`);
    const pendings = invs.filter(i => i.status === 'PENDING' || i.status === 'UNPAID');
    console.log(`Facturas pendientes: ${pendings.length}`);
    for (const p of pendings) {
      console.log(`- Mes ${p.month}/${p.year} | Status: ${p.status}`);
    }
    console.log("-------------------");
  }
}
check().catch(console.error).finally(() => prisma.$disconnect());
