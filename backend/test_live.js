const { getMikrotikActiveClients } = require('./mikrotik');

async function run() {
  console.log("Fetching live clients...");
  const data = await getMikrotikActiveClients("Vialidad");
  console.log("Total:", data.length);
  process.exit(0);
}

run().catch(console.error);
