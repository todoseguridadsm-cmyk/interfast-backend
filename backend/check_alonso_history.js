const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres.rtxgtlwffewlmqhdedzv:TkipSeguridad2026@aws-1-us-west-2.pooler.supabase.com:5432/postgres",
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // Fetch Client ID for Alonso
    const cliRes = await client.query(`
      SELECT id, name FROM "Client" WHERE name ILIKE '%ALONSO MARIA ALEJANDRA%';
    `);
    
    if (cliRes.rows.length === 0) {
       console.log("No client found");
       return;
    }
    const cliId = cliRes.rows[0].id;

    // Buscar todos los CashMovement de Alonso Maria Alejandra históricos usando ILIKE o userId
    const movementsRes = await client.query(`
      SELECT id, amount, description, type, category, operator, "createdAt"
      FROM "CashMovement" 
      WHERE description ILIKE '%ALONSO MARIA ALEJANDRA%' 
         OR description ILIKE '%ALONSO%'
      ORDER BY "createdAt" DESC
      LIMIT 20;
    `);

    console.log(`--- HISTORIAL DE MOVIMIENTOS (Client ID: ${cliId}) ---`);
    movementsRes.rows.forEach(r => {
      console.log(`ID: ${r.id} | Amount: $${r.amount} | Desc: ${r.description} | Date: ${r.createdAt.toISOString()} | Op: ${r.operator}`);
    });

    // Also check payments in July
    const pRes = await client.query(`
      SELECT p.id, p."amountPaid", p.method, p.operator, p."paymentDate"
      FROM "Payment" p
      JOIN "Invoice" i ON p."invoiceId" = i.id
      WHERE i."clientId" = $1
      ORDER BY p."paymentDate" DESC;
    `, [cliId]);
    
    console.log(`\n--- PAGOS HISTORICOS DE FACTURAS ---`);
    pRes.rows.forEach(r => {
      console.log(`Payment ID: ${r.id} | Amount: $${r.amountPaid} | Date: ${r.paymentDate.toISOString()} | Op: ${r.operator}`);
    });


  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

main();
