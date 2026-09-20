const jwt = require('jsonwebtoken');
const axios = require('axios');
const JWT_SECRET = process.env.JWT_SECRET || 'TKIP_SUPER_PRIVATE_KEY_2026';

// El id de Depósito Patagonia. Supongamos que lo busco en BD o lo saco del script.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testMe() {
  const client = await prisma.client.findFirst({ where: { name: { contains: 'Patagonia' } } });
  console.log("Testeando con client:", client.id, client.name);
  
  const token = jwt.sign(
    { clientId: client.id, dni: client.dni, type: 'CLIENT_PORTAL' },
    JWT_SECRET,
    { expiresIn: '60d' }
  );

  // Probar con un require del router? No, el backend local no está levantado.
  // Pero puedo levantar un express mock o importar el middleware y ruta.
  // Más fácil: Extraer la lógica que usaría el backend.
  
  const invoices = await prisma.invoice.findMany({
    where: { clientId: client.id },
    include: { payments: true },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    take: 12
  });

  const pendingInvoices = invoices.filter(i => i.status === 'PENDING').reverse();
  console.log("Facturas pendientes encontradas:", pendingInvoices.length);
  
  if (pendingInvoices.length > 0) {
    console.log("Calculando activeBill...");
    try {
      // Simular getInvoiceTierStatus
      // No lo tengo importado. Lo haré de forma manual para ver si hay un error en alguna parte del loop de pendingInvoices.
      console.log(pendingInvoices.map(i => ({ id: i.id, originalAmount: i.originalAmount })));
    } catch(e) {
      console.log("Error en calculo:", e);
    }
  } else {
    console.log("NO HAY FACTURAS PENDIENTES. ESTA AL DIA.");
  }
}
testMe().catch(console.error).finally(() => prisma.$disconnect());
