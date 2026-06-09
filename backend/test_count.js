const { connectToMikrotik } = require('./mikrotik');

async function run() {
  let conn;
  try {
    conn = await connectToMikrotik("Vialidad");
    console.log("Connected");
    
    try {
      const dhcpCount = await conn.client.rosApi.write('/ip/dhcp-server/lease/print', ['=count-only=']);
      console.log("DHCP Count:", dhcpCount);
    } catch(e) {
      console.log("Caught count error:", e);
    }
  } catch(e) {
    console.error("Connection Error:", e);
  } finally {
    if (conn && conn.client) conn.client.close();
  }
}

run().catch(console.error);
