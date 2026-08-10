const axios = require('axios');

const RENDER_API_KEY = 'rnd_4O7eigW7aUyLz1U4vOEN30mdbe5C';
const headers = { Authorization: `Bearer ${RENDER_API_KEY}`, Accept: 'application/json' };

async function checkRender() {
  try {
    console.log("Fetching Postgres databases...");
    const pgRes = await axios.get('https://api.render.com/v1/postgres', { headers });
    const dbs = pgRes.data;
    if (dbs.length === 0) {
      console.log("No PostgreSQL databases found!");
    } else {
      for (const dbObj of dbs) {
        const db = dbObj.cursor ? dbObj.postgres : dbObj.postgres; // Handle cursor object if present
        console.log(`DB: ${db.name} (ID: ${db.id}) - Status: ${db.status} - Plan: ${db.plan}`);
        
        if (db.status === 'suspended') {
          console.log(`Attempting to resume DB ${db.name}...`);
          try {
            await axios.post(`https://api.render.com/v1/postgres/${db.id}/resume`, {}, { headers });
            console.log(`Resume command sent for DB ${db.name}!`);
          } catch(e) {
            console.log(`Failed to resume DB ${db.name}:`, e.response?.data || e.message);
          }
        }
      }
    }

    console.log("\nFetching Web Services...");
    const svRes = await axios.get('https://api.render.com/v1/services', { headers });
    const services = svRes.data;
    for (const svcObj of services) {
      const svc = svcObj.cursor ? svcObj.service : svcObj.service;
      if (svc.name.includes('n8n') || svc.name.includes('interfast')) {
        console.log(`Service: ${svc.name} (ID: ${svc.id}, Type: ${svc.type})`);
        
        // Let's get the suspended status
        if (svc.suspended === 'suspended') {
          console.log(`Service ${svc.name} is suspended, attempting to resume...`);
          try {
            await axios.post(`https://api.render.com/v1/services/${svc.id}/resume`, {}, { headers });
            console.log(`Resume command sent for ${svc.name}!`);
          } catch(e) {
            console.log(`Failed to resume ${svc.name}:`, e.response?.data || e.message);
          }
        }
      }
    }

  } catch (error) {
    console.error("API Error:", error.response?.data || error.message);
  }
}

checkRender();
