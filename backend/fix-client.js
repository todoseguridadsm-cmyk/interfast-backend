const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const updatedClient = await prisma.client.update({
      where: { id: 14 },
      data: { phone: '0000000000', dni: '00000000' }
    });
    console.log('Cliente 14 saneado correctamente:', {
      id: updatedClient.id,
      name: updatedClient.name,
      phone: updatedClient.phone,
      dni: updatedClient.dni
    });
  } catch (error) {
    console.error('Error al actualizar el cliente:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
