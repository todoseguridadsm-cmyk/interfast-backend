const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres.rtxgtlwffewlmqhdedzv:TkipSeguridad2026@aws-1-us-west-2.pooler.supabase.com:5432/postgres",
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    const movementsRes = await client.query(`
      SELECT count(*) as count
      FROM "CashMovement" 
      WHERE "createdAt" >= '2026-07-01T00:00:00Z' AND "createdAt" <= '2026-07-31T23:59:59Z';
    `);

    console.log(`TOTAL CashMovements en Julio: ${movementsRes.rows[0].count}`);

  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

main();
