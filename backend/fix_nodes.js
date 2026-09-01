const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('--- DIAGNÓSTICO DE NODOS EN CLIENTES ---');
  
  // Buscar el primer nodo disponible que funcionará como matriz principal
  const firstNode = await prisma.node.findFirst({ orderBy: { id: 'asc' } });
  
  if (!firstNode) {
    console.error('❌ ERROR CRÍTICO: No hay ningún nodo configurado en la base de datos (tabla Node).');
    process.exit(1);
  }

  console.log(`✅ Nodo Principal Encontrado: [ID: ${firstNode.id}] ${firstNode.name}`);

  // Encontrar clientes activos con nodeId nulo o mainNode nulo
  const affectedClients = await prisma.client.count({
    where: {
      status: 'ACTIVE',
      OR: [
        { nodeRefId: null },
        { mainNode: null },
        { mainNode: '' }
      ]
    }
  });

  console.log(`⚠️  Clientes Activos afectados (sin nodo): ${affectedClients}`);

  if (affectedClients > 0) {
    console.log(`⏳ Reparando base de datos. Asignando clientes al nodo ${firstNode.name}...`);
    
    // Parche: Asignar tanto el String (mainNode) como la Relación (nodeRefId)
    const result = await prisma.client.updateMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { nodeRefId: null },
          { mainNode: null },
          { mainNode: '' }
        ]
      },
      data: {
        nodeRefId: firstNode.id,
        mainNode: firstNode.name
      }
    });

    console.log(`✅ ¡ÉXITO! ${result.count} clientes reparados exitosamente.`);
    console.log(`   El frontend y las reconexiones de Mikrotik volverán a funcionar de inmediato.`);
  } else {
    console.log(`👍 Todos los clientes activos ya tienen un nodo asignado.`);
  }

  await prisma.$disconnect();
}

run().catch(console.error);
