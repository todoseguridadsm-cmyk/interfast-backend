const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
    try {
        const moves = await prisma.cashMovement.findMany({ include: { user: true } });
        console.log("MOVEMENTS:", moves);
    } catch(e) {
        console.log(e);
    } finally {
        await prisma.$disconnect();
    }
})();
