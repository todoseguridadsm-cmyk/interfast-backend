const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const movements = await prisma.cashMovement.findMany({ include: { user: true }});
        console.log("MOVEMENTS => ", JSON.stringify(movements, null, 2));

        const payments = await prisma.payment.findMany({ include: { user: true }});
        console.log("PAYMENTS => ", JSON.stringify(payments, null, 2));

    } catch (e) {
        console.error(e);
    }
}
run();
