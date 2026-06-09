const { connectToMikrotik } = require('./mikrotik');

async function test() {
  try {
    console.log("Trying to connect to Vialidad...");
    const conn = await connectToMikrotik("Vialidad");
    console.log("Connection object acquired.");
    
    // Test a basic API call
    const result = await conn.api.menu('/system/resource').get();
    console.log("Resource info:", result);
    conn.client.close();
  } catch(e) {
    console.error("Error:", e);
  }
}

test().then(() => process.exit(0));
