const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres.rtxgtlwffewlmqhdedzv:TkipSeguridad2026@aws-1-us-west-2.pooler.supabase.com:5432/postgres",
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // The payment of Alonso was Payment ID: 325 | Amount: $24371 | Date: 2026-07-13T19:36:37.437Z
    // Let's find all CashMovements around that date +/- 1 hour
    const movementsRes = await client.query(`
      SELECT id, amount, description, type, category, operator, "createdAt"
      FROM "CashMovement" 
      WHERE "createdAt" >= '2026-07-13T18:30:00Z' AND "createdAt" <= '2026-07-13T20:30:00Z'
        AND amount = 24371
      ORDER BY "createdAt" DESC;
    `);

    console.log(`--- MOVIMIENTOS EN JULIO POR EL MONTO ORIGINAL DE ALONSO ---`);
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
