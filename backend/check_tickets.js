const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tickets = await prisma.ticket.findMany({
    include: {
      client: true,
      history: true
    }
  });
  console.log('Tickets found in DB:', tickets.length);
  console.log(JSON.stringify(tickets, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
