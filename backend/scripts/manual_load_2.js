const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '../.env' });
const prisma = new PrismaClient();

const manualPayments = [
  { name: "ZORRILLA MABEL ALICIA", amount: 22991.73 },
  { name: "RAUL AMBROSIO", amount: 22990.93 },
  { name: "BRITO SILVIO", amount: 22991.66 },
  { name: "MORALES BETINA EMILSE", amount: 22991.19 },
  { name: "SANDRA ELIZABETH CASTILLO", amount: 22990.79 },
  { name: "MATUS MARIANA SOLEDAD", amount: 22990.46 },
  { name: "GUARDIA ANDREA LUISINA", amount: 22991.83 },
  { name: "ANGLADA HILDA DEL CARMEN", amount: 22991.80 },
  { name: "ARTURO CRISTIAN DAVID GONZALEZ", amount: 22991.18 },
  { name: "ARTURO CRISTIAN DAVID GONZALEZ", amount: 22990.35 },
  { name: "JOHANA GISEL PALOMO", amount: 22992.00 },
  { name: "PERALTA GERARDO", amount: 22991.89 },
  { name: "PATRICIA GOMEZ", amount: 27000.00 },
  { name: "MACHADO MARTIN", amount: 20300.43 },
  { name: "MARIANA DENISE TORRIS", amount: 22990.06 }
];

async function run() {
  console.log(`=== INICIANDO CARGA MANUAL (LOTE 2) ===\n`);
  
  // Fecha inyectada: 4 de septiembre de 2026
  const operationDate = new Date("2026-09-04T12:00:00Z");
  const currentOperator = 'CARGA_MANUAL_DIRECTA';

  for (const record of manualPayments) {
    try {
      // 1. Buscar cliente por coincidencia parcial (contains) ignorando mayúsculas/minúsculas
      const clients = await prisma.client.findMany({
        where: {
          name: { contains: record.name, mode: 'insensitive' },
          status: 'ACTIVE'
        }
      });

      if (clients.length === 0) {
          console.log(`❌ ERROR: Cliente no encontrado con "contains" -> ${record.name}`);
          continue;
      }
      
      const clientMatched = clients[0]; // Se asume el primer hit como el correcto

      // 2. Buscar sus facturas PENDING
      const pendingInvoices = await prisma.invoice.findMany({
          where: { clientId: clientMatched.id, status: 'PENDING' },
          orderBy: [{ year: 'asc' }, { month: 'asc' }]
      });

      if (pendingInvoices.length === 0) {
          console.log(`⚠️ ATENCIÓN: ${clientMatched.name} no tiene facturas PENDING para asimilar.`);
          continue;
      }

      // Tomamos la primera factura PENDING disponible. Si el cliente figura 2 veces en el lote, 
      // en la 2da vuelta tomará la siguiente factura pendiente.
      const invoice = pendingInvoices[0];
      
      const simulatedMpId = `MANUAL_REG_${new Date().getTime()}_${clientMatched.id}`;

      // 3. Ejecutar transacción atómica
      await prisma.$transaction(async (tx) => {
          // A. Marcar Invoice a PAID
          await tx.invoice.update({
              where: { id: invoice.id },
              data: { status: 'PAID', operator: currentOperator }
          });

          // B. Crear Payment
          await tx.payment.create({
              data: {
                  amountPaid: record.amount,
                  method: 'MERCADOPAGO',
                  operator: currentOperator,
                  mpPaymentId: simulatedMpId,
                  paymentDate: operationDate,
                  invoiceId: invoice.id,
                  userId: 1
              }
          });

          // C. Asentar CashMovement (Ingreso a Caja del 4/Sep/26)
          await tx.cashMovement.create({
              data: {
                  type: 'IN',
                  amount: record.amount,
                  category: 'PAGO_FACTURA',
                  description: `Ingreso Manual Directo Lote 2 Cliente ${clientMatched.name}`,
                  createdAt: operationDate,
                  operator: currentOperator,
                  userId: 1
              }
          });
      });

      console.log(`✅ ÉXITO: Cargado pago de $${record.amount} a ${clientMatched.name} (Factura #${invoice.id})`);
    } catch (err) {
        console.error(`🚨 ERROR CRÍTICO al procesar a ${record.name}:`, err.message);
    }
  }
}

run().finally(() => prisma.$disconnect());
