const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres.rtxgtlwffewlmqhdedzv:TkipSeguridad2026@aws-1-us-west-2.pooler.supabase.com:5432/postgres",
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    const cutoffDate = new Date(Date.UTC(2026, 7, 1, 0, 0, 0, 0)).toISOString(); // August 1, 2026

    const res = await client.query(`
      SELECT method, COUNT(*) as cantidad, SUM("amountPaid") as total
      FROM "Payment" 
      WHERE "paymentDate" >= $1
      GROUP BY method
      ORDER BY cantidad DESC;
    `, [cutoffDate]);

    console.log('--- PAGOS EN CMR DESDE EL 01/AGOSTO ---');
    let totalFacturas = 0;
    res.rows.forEach(r => {
      console.log(`- Método: ${r.method.padEnd(20)} | Cantidad: ${r.cantidad} | Total: $${Number(r.total).toFixed(2)}`);
      totalFacturas += Number(r.cantidad);
    });
    console.log(`\nTOTAL DE PAGOS REGISTRADOS: ${totalFacturas}`);

  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

main();
