require('dotenv').config();
const { RouterOSClient } = require('routeros-client');

async function main() {
  const client = new RouterOSClient({
    host: 'a7e009d5e5ce.sn.mynetname.net',
    port: 8787,
    user: 'Interfast2020',
    password: 'Bran5570*',
    timeout: 5000
  });

  const api = await client.connect();
  console.log('Connected');

  try {
    const list = await api.write('/ip/firewall/address-list/print', [
      '?address=192.168.20.50',
      '?list=Morosos'
    ]);
    console.log(list);
  } catch (err) {
    console.error('API Error:', err);
  }

  client.close();
}

main().catch(console.error);
