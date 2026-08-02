const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const clients = await prisma.client.findMany({
      where: { name: { contains: 'Janina', mode: 'insensitive' } }
    });

    if (clients.length === 0) {
      console.log('Cliente no encontrado por Janina');
      const allClients = await prisma.client.findMany();
      console.log("Total clients:", allClients.length);
      console.log("Names:", allClients.map(c=>c.name).filter(n => typeof n === 'string' && n.toLowerCase().includes('coria')));
      return;
    }
    
    const client = clients[0];
    console.log('Cliente encontrado:', client.name);

    const techPhones = ['5492634302101', '5492634757105'];
    const techMessage = `🚀 *NUEVA ALTA DE CLIENTE CREADA* 🚀\n\n` +
                        `👤 *Cliente:* ${client.name}\n` +
                        `📞 *Teléfono:* ${client.phone || 'No registrado'}\n` +
                        `📍 *Dirección:* ${client.address || 'No registrada'}\n` +
                        `🆔 *DNI/CUIT:* ${client.dni || client.cuit || 'No registrado'}\n` +
                        `📡 *IP Asignada:* ${client.ipNumber || 'Sin IP'}\n\n` +
                        `✅ *N° de Cliente:* TK${client.id}\n` +
                        `🔗 *Revisalo en el CRM para coordinar la instalación.*`;
    
    require('dotenv').config();

    for (const techPhone of techPhones) {
      if (process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY) {
        console.log(`Enviando a ${techPhone}...`);
        await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE_NAME || 'interfast'}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': process.env.EVOLUTION_API_KEY },
          body: JSON.stringify({ number: techPhone, options: { delay: 1200 }, textMessage: { text: techMessage } })
        }).then(r => r.json()).then(console.log).catch(console.error);
      } else {
        console.log('Falta EVOLUTION_API_URL en .env');
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}
run();
