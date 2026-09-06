const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres.rtxgtlwffewlmqhdedzv:TkipSeguridad2026@aws-1-us-west-2.pooler.supabase.com:5432/postgres",
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    console.log(`Deshaciendo el movimiento de ajuste que creé...`);
    await client.query(`DELETE FROM "CashMovement" WHERE id = 376;`);
    console.log(`Eliminado.`);

    console.log(`Buscando el Saldo Inicial original de $356,234...`);
    const initialRes = await client.query(`
      SELECT id FROM "CashMovement" 
      WHERE amount = 356234 
      ORDER BY id ASC LIMIT 1;
    `);

    if (initialRes.rows.length > 0) {
      const originalId = initialRes.rows[0].id;
      const newAmount = 356234 + 221234; // 577468
      console.log(`ID Original encontrado: ${originalId}. Modificando monto a $${newAmount}...`);

      await client.query(`
        UPDATE "CashMovement" 
        SET amount = $1 
        WHERE id = $2;
      `, [newAmount, originalId]);

      console.log(`Saldo inicial actualizado exitosamente a $${newAmount}.`);
    } else {
      console.log(`No se encontró un movimiento de 356234 exacto.`);
    }

  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

main();
