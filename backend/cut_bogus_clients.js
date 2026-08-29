const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { addIpToCutoffList } = require('./mikrotik');

async function main() {
  const clientsToCut = [
    'DIAZ BELEN ', 
    'ESCUDERO MELINA', 
    'MACAY SATURNINA', 
    'FALCON ROMINA', 
    'MOYANO SILVIA'
  ];

  console.log("Iniciando proceso de corte para clientes especificados...");

  for (const name of clientsToCut) {
    const client = await prisma.client.findFirst({
      where: { name: name }
    });

    if (client) {
      console.log(`\nProcesando a ${client.name}...`);
      
      // Actualizar estado en base de datos
      await prisma.client.update({
        where: { id: client.id },
        data: { status: 'SUSPENDED' }
      });
      console.log(`- Estado en DB actualizado a SUSPENDED`);

      // Cortar en Mikrotik si tiene IP y Nodo
      if (client.mainNode && client.ipNumber) {
        try {
          await addIpToCutoffList(client.ipNumber, client.mainNode);
          console.log(`- IP ${client.ipNumber} agregada al address-list en el nodo ${client.mainNode}`);
        } catch (e) {
          console.log(`- Error cortando en Mikrotik para ${client.name}: ${e.message}`);
        }
      } else {
        console.log(`- Cliente no tiene IP o Nodo asignado para corte en Mikrotik.`);
      }
    } else {
      console.log(`\nNo se encontró al cliente: ${name}`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
