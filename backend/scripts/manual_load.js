const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '../.env' });
const prisma = new PrismaClient();

const manualPayments = [
  { name: "CARMAGNANI EDITH MARGARITA", amount: 22991.74 },
  { name: "ANDREA MICAELA BENZONI", amount: 22990.75 },
  { name: "LETICIA PAOLA DOMINGUEZ", amount: 22990.24 }, // LETECIA corregido a LETICIA para facilitar búsqueda
  { name: "PATRICIA SILVANA SFREDDO", amount: 22991.43 },
  { name: "MABEL ZORRILLA", amount: 22991.73 },
  { name: "ADRIANA ELISA PETIOT", amount: 22992.01 },
  { name: "FUNES ELISA NOEMI", amount: 22991.52 },
  { name: "RAUL AMBROSIO", amount: 22990.93 }
];

async function run() {
  console.log(`=== INICIANDO CARGA MANUAL DIRECTA ===\n`);
  
  // Fecha inyectada: 4 de septiembre de 2026
  const operationDate = new Date("2026-09-04T12:00:00Z");
  const currentOperator = 'CARGA_MANUAL_DIRECTA';

  for (const record of manualPayments) {
    try {
      // 1. Buscar cliente por coincidencia de nombre para evitar errores tipográficos menores
      const targetNameClean = record.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      
      const clients = await prisma.client.findMany({
          where: { status: 'ACTIVE' }
      });
      
      const clientMatched = clients.find(c => {
          const cNameClean = c.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
          return cNameClean.includes(targetNameClean) || targetNameClean.includes(cNameClean);
      });

      if (!clientMatched) {
          console.log(`❌ ERROR: Cliente no encontrado en Base de Datos -> ${record.name}`);
          continue;
      }

      // 2. Buscar su factura PENDING
      const pendingInvoices = await prisma.invoice.findMany({
          where: { clientId: clientMatched.id, status: 'PENDING' },
          orderBy: [{ year: 'asc' }, { month: 'asc' }],
          take: 1
      });

      if (pendingInvoices.length === 0) {
          console.log(`⚠️ ATENCIÓN: ${record.name} no tiene facturas PENDING para asimilar.`);
          continue;
      }

      const invoice = pendingInvoices[0];
      
      // ID simulado de Mercado Pago (Timestamp único para cumplir validación)
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
                  method: 'MERCADOPAGO', // Se requiere método válido en schema
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
                  description: `Ingreso Manual Directo Cliente ${clientMatched.name}`,
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
