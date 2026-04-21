const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const date = '2026-04-03';
        const [year, month, day] = date.split('-');
        const startOfDay = new Date(year, parseInt(month) - 1, parseInt(day), 0, 0, 0, 0);
        const endOfDay = new Date(year, parseInt(month) - 1, parseInt(day), 23, 59, 59, 999);
        console.log("START:", startOfDay.toISOString());
        console.log("END:", endOfDay.toISOString());
        
        const payments = await prisma.payment.findMany({
          where: { paymentDate: { gte: startOfDay, lte: endOfDay } },
          include: { 
            invoice: { include: { client: true } },
            user: { select: { username: true } } 
          }
        });
        
        const movements = await prisma.cashMovement.findMany({
          where: { createdAt: { gte: startOfDay, lte: endOfDay } },
          include: { user: { select: { username: true } } },
          orderBy: { createdAt: 'asc' }
        });
        console.log("FOUND PAYMENTS => ", payments.length);
        console.log("FOUND MOVEMENTS => ", movements.length);
    } catch(e) {
        console.error(e);
    }
}
run();
