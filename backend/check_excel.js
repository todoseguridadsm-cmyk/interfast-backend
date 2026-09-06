const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres.rtxgtlwffewlmqhdedzv:TkipSeguridad2026@aws-1-us-west-2.pooler.supabase.com:5432/postgres",
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const res = await client.query(`
      SELECT id, amount, description, "createdAt" 
      FROM "CashMovement" 
      WHERE description LIKE '%Costos MP%' OR description LIKE '%comisiones y retenciones mensuales MP%'
      ORDER BY "createdAt" DESC;
    `);
    
    let totalExcel = 0;
    console.log('EXTRACTOS EXCEL CARGADOS:');
    res.rows.forEach(r => {
      console.log(`- ID: ${r.id} | Monto: $${r.amount} | Fecha: ${r.createdAt.toISOString()} | Desc: ${r.description}`);
      totalExcel += Number(r.amount);
    });
    console.log(`TOTAL DESCONTADO POR EXCEL: $${totalExcel.toFixed(2)}`);

  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

main();
