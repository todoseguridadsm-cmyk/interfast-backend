const { RouterOSClient } = require('routeros-client');

async function testConnection() {
  console.log("Iniciando prueba de conexion...");
  try {
    const client = new RouterOSClient({
      host: 'a7e009d5e5ce.sn.mynetname.net',
      port: 8293,
      user: 'Interfast2020',
      password: 'Bran5570*',
      timeout: 10000
    });
    
    await client.connect();
    console.log("Conexion exitosa!");
    
    const api = client.menu('/ip/firewall/address-list');
    const records = await api.get();
    console.log("Registros actuales en Address List:", records.length);
    
    // Add a test IP
    console.log("Agregando IP de prueba 192.168.99.99...");
    await api.add({ list: 'Morosos', address: '192.168.99.99', comment: 'Prueba API' });
    
    // Get again
    const newRecords = await api.get();
    console.log("Registros tras agregar:", newRecords.length);
    
    // Remove it
    const testRec = await api.where('address', '192.168.99.99').get();
    if (testRec.length > 0) {
      console.log("Removiendo IP de prueba...");
      await api.remove(testRec[0]['.id']);
    }
    
    client.close();
    console.log("Prueba finalizada con exito.");
  } catch (e) {
    console.error("Error en la prueba:", e.message);
  }
}

testConnection();
