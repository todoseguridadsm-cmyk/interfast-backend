const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const names = [
    "ADRIAN LEONEL GAVIOLA",
    "ALDANA BELEN SANCHEZ",
    "ALTAMIRANO MIGUEL",
    "ANDREA MICAELA BENZONI",
    "ALTAMIRANO NADIA",
    "AMBROSIO RAUL CESAR",
    "ANA ROCIO CHIMENDO",
    "ANGLADA HILDA DEL CARMEN",
    "ADRIANA ELISA PETIOT",
    "ACEBEDO ELISABETH ESMERALDA",
    "FERNANDO SEBASTIAN GONZALEZ",
    "ALLISIARDI FEDERICO MARTIN",
    "ADARO RAUL",
    "ALEJANDRO IRAÑETA",
    "DELACOURT MONICA MARISA",
    "ARROJO MELINA",
    "COMPLEJO EL OLIVO",
    "GENTILE CECILIA",
    "PATRICIA GOMEZ",
    "ZALAZAR AILEN"
  ];
  for (const n of names) {
    const cl = await prisma.client.findFirst({ where: { name: { contains: n.trim(), mode: 'insensitive' } } });
    if (cl) {
      await prisma.invoice.updateMany({
        where: { clientId: cl.id, status: 'PENDING' },
        data: { notifiedAt: new Date() }
      });
      console.log('Restored', n);
    }
  }
}
run().catch(console.error).finally(() => prisma.$disconnect());
