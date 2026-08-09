const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== REASIGNANDO TICKET #89 A NIDIA EMILSE VILLEGAS (ID 67) ===");

  const ticket = await prisma.ticket.findUnique({ where: { id: 89 } });
  if (!ticket) {
    console.error("❌ No se encontró el ticket #89");
    return;
  }

  const updatedTicket = await prisma.ticket.update({
    where: { id: 89 },
    data: {
      clientId: 67,
      description: ticket.description.replace('(ID: 10)', '(ID: 67)')
    },
    include: { client: true }
  });

  console.log(`✅ Ticket #89 reasignado exitosamente al cliente ID 67 ("${updatedTicket.client.name}").`);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
