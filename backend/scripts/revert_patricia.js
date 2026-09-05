const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '../.env' });
const prisma = new PrismaClient();

async function run() {
    const invoiceIdToRevert = 916;
    console.log(`Iniciando reversión de Factura #${invoiceIdToRevert}...`);
    
    try {
        await prisma.$transaction(async (tx) => {
            await tx.invoice.update({
                where: { id: invoiceIdToRevert },
                data: { status: 'PENDING', operator: 'SISTEMA_REVERSION' }
            });
            
            await tx.payment.deleteMany({
                where: { invoiceId: invoiceIdToRevert }
            });
            
            await tx.cashMovement.deleteMany({
                where: { 
                    amount: 27000,
                    createdAt: new Date("2026-09-04T12:00:00Z"),
                    description: { contains: "GOMEZ" }
                }
            });
        });
        console.log("✅ Revertida la segunda factura duplicada de Patricia Gomez (#916)");
    } catch (err) {
        console.error("🚨 Error revirtiendo factura:", err.message);
    }
}
run().finally(() => prisma.$disconnect());
