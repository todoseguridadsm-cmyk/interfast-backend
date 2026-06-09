const { connectToMikrotik } = require('./mikrotik');

async function run() {
  let conn;
  try {
    conn = await connectToMikrotik("Vialidad");
    console.log("Connected");
    
    // Test write
    conn.client.on('error', (err) => {
       console.log("Global error trapped:", err);
    });

    try {
      const pppoe = await conn.client.rosApi.write('/ppp/active/print');
      console.log("PPPoE:", pppoe.length);
    } catch(e) {
      console.log("Caught PPP error:", e);
    }

    try {
      const dhcp = await conn.client.rosApi.write('/ip/dhcp-server/lease/print');
      console.log("DHCP:", dhcp.length);
    } catch(e) {
      console.log("Caught DHCP error:", e);
    }

  } catch(e) {
    console.error("Connection Error:", e);
  } finally {
    if (conn && conn.client) conn.client.close();
  }
}

run().catch(console.error);
