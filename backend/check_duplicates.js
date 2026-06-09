const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const clients = await prisma.client.findMany({
            select: { id: true, name: true, dni: true, ipNumber: true }
        });

        const dnis = {};
        const ips = {};

        const duplicateDnis = [];
        const duplicateIps = [];

        clients.forEach(c => {
            if (c.dni && c.dni.trim() !== '') {
                if (!dnis[c.dni]) dnis[c.dni] = [];
                dnis[c.dni].push(c);
            }
            if (c.ipNumber && c.ipNumber.trim() !== '') {
                if (!ips[c.ipNumber]) ips[c.ipNumber] = [];
                ips[c.ipNumber].push(c);
            }
        });

        for (const [dni, list] of Object.entries(dnis)) {
            if (list.length > 1) {
                duplicateDnis.push({ dni, clients: list.map(x => `${x.name} (ID: ${x.id})`) });
            }
        }

        for (const [ip, list] of Object.entries(ips)) {
            if (list.length > 1) {
                duplicateIps.push({ ip, clients: list.map(x => `${x.name} (ID: ${x.id})`) });
            }
        }

        console.log(JSON.stringify({ duplicateDnis, duplicateIps }, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
