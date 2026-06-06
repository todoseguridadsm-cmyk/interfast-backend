require('dotenv').config();
const { RouterOSClient } = require('routeros-client');

async function main() {
  const client = new RouterOSClient({
    host: 'a7e009d5e5ce.sn.mynetname.net', // Vialidad host
    port: 8787,
    user: 'Interfast2020',
    password: 'Bran5570*',
    timeout: 10000
  });

  const api = await client.connect();
  
  console.log('--- Verificando estado de Morosos ---');
  const menu = api.menu('/ip/firewall/address-list');
  const list = await menu.where('address', '192.168.20.50').get();
  
  if (list.length > 0) {
    console.log('📝 La IP 192.168.20.50 ESTÁ en las siguientes Address Lists:');
    list.forEach(item => console.log(` - Lista: ${item.list} | Comentario: ${item.comment || 'Ninguno'} | Deshabilitada: ${item.disabled}`));
  } else {
    console.log('📝 La IP 192.168.20.50 NO ESTÁ en ninguna Address List de Mikrotik (ni en Morosos).');
  }

  console.log('\n--- Haciendo PING desde el Mikrotik hacia la antena del cliente (192.168.20.50) ---');
  try {
    const pingResult = await api.menu('/ping').where('address', '192.168.20.50').where('count', '3').get();
    console.log('Resultados del ping:');
    pingResult.forEach(res => {
      console.log(` Status: ${res.status || 'OK'} | Time: ${res.time} | Sent: ${res.sent} | Received: ${res.received} | Packet Loss: ${res['packet-loss']}%`);
    });
  } catch (err) {
    console.log('Error haciendo ping:', err.message);
  }

  client.close();
}

main().catch(console.error);
