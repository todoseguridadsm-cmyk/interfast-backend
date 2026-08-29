require('dotenv').config();
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clients = await prisma.client.findMany({
    where: {
      name: {
        in: ['ESPOSITO RODRIGO', 'MORON MIGUEL']
      }
    },
    include: {
      invoices: {
        where: {
          status: {
            in: ['PARTIAL', 'PENDING']
          }
        }
      }
    }
  });
  console.dir(clients, { depth: null });
}
main().catch(console.error).finally(() => prisma.$disconnect());
