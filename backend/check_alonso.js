const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres.rtxgtlwffewlmqhdedzv:TkipSeguridad2026@aws-1-us-west-2.pooler.supabase.com:5432/postgres",
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // Buscar CashMovement
    const movementsRes = await client.query(`
      SELECT id, amount, description, type, category, operator, "createdAt", "userId"
      FROM "CashMovement" 
      WHERE description LIKE '%ALONSO MARIA ALEJANDRA%' 
        AND "createdAt" >= '2026-08-13' AND "createdAt" <= '2026-08-16'
      ORDER BY "createdAt" DESC;
    `);

    console.log('--- CASH MOVEMENTS ALONSO MARIA ALEJANDRA (Agosto 14) ---');
    movementsRes.rows.forEach(r => {
      console.log(`ID: ${r.id} | Amount: $${r.amount} | Desc: ${r.description} | Date: ${r.createdAt.toISOString()} | Op: ${r.operator}`);
    });

    // Buscar Pagos en Payment
    const invoiceRes = await client.query(`
      SELECT p.id, p."amountPaid", p.method, p.operator, p."paymentDate", c.name
      FROM "Payment" p
      JOIN "Invoice" i ON p."invoiceId" = i.id
      JOIN "Client" c ON i."clientId" = c.id
      WHERE c.name LIKE '%ALONSO MARIA ALEJANDRA%'
        AND p."paymentDate" >= '2026-08-13' AND p."paymentDate" <= '2026-08-16';
    `);

    console.log('\n--- PAGOS DE ALONSO MARIA ALEJANDRA ---');
    invoiceRes.rows.forEach(r => {
      console.log(`Payment #${r.id} | Amount: $${r.amountPaid} | Date: ${r.paymentDate.toISOString()} | Method: ${r.method} | Op: ${r.operator}`);
    });

  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

main();
