const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres.rtxgtlwffewlmqhdedzv:TkipSeguridad2026@aws-1-us-west-2.pooler.supabase.com:5432/postgres",
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const res = await client.query(`
      SELECT id, amount, description, "createdAt", type 
      FROM "CashMovement" 
      WHERE description LIKE '%[CAJA: MERCADOPAGO]%' AND type = 'OUT'
      ORDER BY amount DESC
      LIMIT 10;
    `);
    
    console.log('TOP 10 EGRESOS MAS GRANDES EN MP:');
    res.rows.forEach(r => {
      console.log(`- ID: ${r.id} | Monto: $${r.amount} | Fecha: ${r.createdAt.toISOString()} | Desc: ${r.description}`);
    });

  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

main();
