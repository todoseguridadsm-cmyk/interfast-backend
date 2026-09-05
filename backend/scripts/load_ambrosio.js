const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '../.env' });
const prisma = new PrismaClient();

async function run() {
    const clientMatched = await prisma.client.findFirst({
        where: { id: 93 }
    });
    
    const pendingInvoices = await prisma.invoice.findMany({
        where: { clientId: clientMatched.id, status: 'PENDING' },
        orderBy: [{ year: 'asc' }, { month: 'asc' }],
        take: 1
    });

    const invoice = pendingInvoices[0];
    const operationDate = new Date("2026-09-04T12:00:00Z");
    const currentOperator = 'CARGA_MANUAL_DIRECTA';
    const simulatedMpId = `MANUAL_REG_${new Date().getTime()}_${clientMatched.id}`;

    await prisma.$transaction(async (tx) => {
        await tx.invoice.update({
            where: { id: invoice.id },
            data: { status: 'PAID', operator: currentOperator }
        });
        await tx.payment.create({
            data: {
                amountPaid: 22990.93,
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
                amount: 22990.93,
                category: 'PAGO_FACTURA',
                description: `Ingreso Manual Directo Cliente ${clientMatched.name}`,
                createdAt: operationDate,
                operator: currentOperator,
                userId: 1
            }
        });
    });
    console.log(`✅ ÉXITO: Cargado pago de $22990.93 a ${clientMatched.name} (Factura #${invoice.id})`);
}
run().finally(() => prisma.$disconnect());
