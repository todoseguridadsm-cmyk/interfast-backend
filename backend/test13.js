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

  try {
    const api = await client.connect();
    
    // Method 1: using raw promise
    console.log('Testing rosApi.write...');
    client.rosApi.write('/ping', ['=address=8.8.8.8', '=count=3'])
      .then((data) => { console.log('Write success:', data); })
      .catch((err) => { console.error('Write error:', err.message); });
      
  } catch (err) {
    console.error('Connection error:', err);
  } finally {
    // client.close(); // let it finish write
  }
}

main();
