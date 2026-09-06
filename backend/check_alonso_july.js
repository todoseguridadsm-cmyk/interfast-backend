const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres.rtxgtlwffewlmqhdedzv:TkipSeguridad2026@aws-1-us-west-2.pooler.supabase.com:5432/postgres",
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    const movementsRes = await client.query(`
      SELECT id, amount, description, type, category, operator, "createdAt"
      FROM "CashMovement" 
      WHERE "createdAt" >= '2026-07-13T19:30:00Z' AND "createdAt" <= '2026-07-13T19:40:00Z'
      ORDER BY "createdAt" DESC;
    `);

    console.log(`--- MOVIMIENTOS EN LA FECHA DE PAGO DE JULIO ---`);
    movementsRes.rows.forEach(r => {
      console.log(`ID: ${r.id} | Amount: $${r.amount} | Desc: ${r.description} | Date: ${r.createdAt.toISOString()}`);
    });

  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

main();
