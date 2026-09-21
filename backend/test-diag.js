require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { runConnectionTest } = require('./services/connectionTestService');

async function test() {
  try {
    const client = await prisma.client.findFirst({
      where: { ipNumber: '192.168.19.199' }
    });

    if (!client) {
      console.log('No se encontró cliente con IP 192.168.19.199');
      process.exit(1);
    }

    console.log(`\n===========================================`);
    console.log(`Iniciando prueba de diagnóstico (test-diag)`);
    console.log(`Cliente: ${client.firstName} ${client.lastName} (DNI: ${client.dni})`);
    console.log(`IP CPE: ${client.ipNumber} | Nodo: ${client.mainNode}`);
    console.log(`===========================================\n`);

    const result = await runConnectionTest(client.dni);
    
    console.log(`\n===========================================`);
    console.log(`RESULTADO FINAL QUE RECIBIRÍA LA APP:`);
    console.log(JSON.stringify(result, null, 2));
    console.log(`===========================================\n`);

  } catch (error) {
    console.error('Error fatal en el script de prueba:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

test();
