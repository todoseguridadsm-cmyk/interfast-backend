const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== INSPECCIONANDO BANNO MIGUEL Y VILLEGAS NIDIA Y TICKETS DE SOPORTE ===");

  const banno = await prisma.client.findMany({
    where: { name: { contains: 'BANNO', mode: 'insensitive' } },
    include: { tickets: { orderBy: { id: 'desc' } } }
  });

  const villegas = await prisma.client.findMany({
    where: { name: { contains: 'VILLEGAS', mode: 'insensitive' } },
    include: { tickets: { orderBy: { id: 'desc' } } }
  });

  console.log("\nClientes Banno:");
  for (const c of banno) {
    console.log(`- ID ${c.id}: "${c.name}" | DNI: "${c.dni}" | Phone: "${c.phone}" | Phone2: "${c.phone2}"`);
    console.log("  Tickets:", c.tickets);
  }

  console.log("\nClientes Villegas:");
  for (const c of villegas) {
    console.log(`- ID ${c.id}: "${c.name}" | DNI: "${c.dni}" | Phone: "${c.phone}" | Phone2: "${c.phone2}"`);
    console.log("  Tickets:", c.tickets);
  }

  console.log("\nÚltimos 5 tickets de soporte creados:");
  const recentTickets = await prisma.ticket.findMany({
    take: 5,
    orderBy: { id: 'desc' },
    include: { client: true }
  });
  recentTickets.forEach(t => {
    console.log(`Ticket #${t.id} -> Cliente ID ${t.clientId}: "${t.client?.name}" | Teléfono: "${t.client?.phone}" | Asunto: "${t.title}" | Desc: "${t.description}"`);
  });
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
