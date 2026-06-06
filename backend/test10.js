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
  const list = await api.menu('/ip/firewall/address-list').get();
  const existing = list.filter(item => item.address === '192.168.20.50' && item.list === 'Morosos');
  console.log('Existing:', existing);

  client.close();
}

main().catch(console.error);
