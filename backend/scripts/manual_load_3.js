const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '../.env' });
const prisma = new PrismaClient();

const manualPayments = [
  { name: "AMBROSIO RAUL CESAR", amount: 22990.93 },
  { name: "GONZALEZ ARTURO (todo lustre) 1", amount: 22991.18 },
  { name: "GONZALEZ ARTURO (todo lustre) 2", amount: 22990.35 }
];

async function run() {
  console.log(`=== INICIANDO CARGA MANUAL (LOTE 3 - CORRECCIONES) ===\n`);
  const operationDate = new Date("2026-09-04T12:00:00Z");
  const currentOperator = 'CARGA_MANUAL_DIRECTA';

  for (const record of manualPayments) {
      const clients = await prisma.client.findMany({
        where: { name: record.name, status: 'ACTIVE' }
      });
      if (clients.length === 0) {
          console.log(`❌ ERROR: Cliente no encontrado -> ${record.name}`);
          continue;
      }
      
      const clientMatched = clients[0];
      const pendingInvoices = await prisma.invoice.findMany({
          where: { clientId: clientMatched.id, status: 'PENDING' },
          orderBy: [{ year: 'asc' }, { month: 'asc' }],
          take: 1
      });

      if (pendingInvoices.length === 0) {
          console.log(`⚠️ ATENCIÓN: ${clientMatched.name} no tiene facturas PENDING.`);
          continue;
      }

      const invoice = pendingInvoices[0];
      const simulatedMpId = `MANUAL_REG_${new Date().getTime()}_${clientMatched.id}`;

      await prisma.$transaction(async (tx) => {
          await tx.invoice.update({
              where: { id: invoice.id },
              data: { status: 'PAID', operator: currentOperator }
          });
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
          await tx.cashMovement.create({
              data: {
                  type: 'IN',
                  amount: record.amount,
                  category: 'PAGO_FACTURA',
                  description: `Ingreso Manual Directo Lote 3 Cliente ${clientMatched.name}`,
                  createdAt: operationDate,
                  operator: currentOperator,
                  userId: 1
              }
          });
      });
      console.log(`✅ ÉXITO: Cargado pago de $${record.amount} a ${clientMatched.name} (Factura #${invoice.id})`);
  }
}
run().finally(() => prisma.$disconnect());
