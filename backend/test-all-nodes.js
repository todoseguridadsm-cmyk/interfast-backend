require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { RouterOSClient } = require('routeros-client');

const prisma = new PrismaClient();

async function checkAllNodes() {
  const nodes = await prisma.node.findMany({ where: { isActive: true } });
  
  if (nodes.length === 0) {
    console.log("No hay nodos activos cargados en la base de datos.");
    return;
  }

  console.log(`Verificando conectividad con ${nodes.length} nodos activos...\n`);

  for (const node of nodes) {
    console.log(`[${node.name}] Intentando conectar a ${node.host}:${node.port}...`);
    
    const client = new RouterOSClient({
      host: node.host,
      port: node.port,
      user: node.user,
      password: node.password,
      timeout: 5000 // 5 segundos maximo
    });

    try {
      const api = await client.connect();
      console.log(`✅ [${node.name}] Conexión Exitosa!`);
      
      // Probar leer el address list para asegurar permisos
      await api.menu('/ip/firewall/address-list').get();
      console.log(`✅ [${node.name}] Permisos de lectura/escritura correctos.\n`);
      
    } catch (err) {
      console.log(`❌ [${node.name}] Falla en la conexión:`, err.message || JSON.stringify(err), '\n');
    } finally {
      client.close();
    }
  }
}

checkAllNodes().catch(console.error).finally(() => prisma.$disconnect());
