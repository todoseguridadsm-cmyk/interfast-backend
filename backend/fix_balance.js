const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres.rtxgtlwffewlmqhdedzv:TkipSeguridad2026@aws-1-us-west-2.pooler.supabase.com:5432/postgres",
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    const amount = 221234.00;
    
    console.log(`Insertando ajuste de saldo por $${amount}...`);

    const res = await client.query(`
      INSERT INTO "CashMovement" (type, amount, category, description, operator, "userId", "createdAt")
      VALUES ('IN', $1, 'INGRESO_MANUAL', 'Ajuste de Saldo Inicial (Conciliación)', 'SISTEMA', 1, NOW())
      RETURNING id, amount, description;
    `, [amount]);

    console.log('Movimiento creado exitosamente:');
    console.log(res.rows[0]);

  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

main();
