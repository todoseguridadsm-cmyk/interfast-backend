const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres.rtxgtlwffewlmqhdedzv:TkipSeguridad2026@aws-1-us-west-2.pooler.supabase.com:5432/postgres",
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    const startOfDay = new Date(Date.UTC(2026, 6, 31, 0, 0, 0, 0)).toISOString();

    // 1. All Payments that are MP
    const paymentsRes = await client.query(`
      SELECT "amountPaid", "method", "paymentDate"
      FROM "Payment" 
      WHERE "method" != 'OTRO_SISTEMA' AND "paymentDate" >= $1;
    `, [startOfDay]);

    let totalMpPayments = 0;
    for (const p of paymentsRes.rows) {
      const m = (p.method || '').toUpperCase();
      const isMp = m.includes('MERCADO') || m.includes('MP') || m.includes('TRANSFER') || m.includes('DEBITO') || m.includes('RAPIPAGO');
      if (isMp) {
        totalMpPayments += Number(p.amountPaid);
      }
    }

    // 2. All Cash Movements
    const movementsRes = await client.query(`
      SELECT amount, operator, description, type, category, "createdAt"
      FROM "CashMovement" 
      WHERE "createdAt" >= $1;
    `, [startOfDay]);

    let manualMpIn = 0;
    let manualMpOut = 0;

    for (const m of movementsRes.rows) {
      const descMatch = m.description.match(/^\[CAJA:\s*([^\]]+)\]\s*(.*)$/);
      const opUpper = (m.operator || '').toUpperCase();
      const boxFromDesc = descMatch ? descMatch[1].trim().toUpperCase() : '';

      // Ignore PAGO_FACTURA because they are already counted in totalMpPayments
      if (m.category === 'PAGO_FACTURA') continue;

      if (boxFromDesc === 'MERCADOPAGO' || opUpper === 'MERCADOPAGO') {
        const normalizedType = (m.type === 'INGRESO' || m.type === 'IN') ? 'IN' : 'OUT';
        if (normalizedType === 'IN') {
          manualMpIn += Number(m.amount);
        } else {
          manualMpOut += Number(m.amount);
        }
      }
    }

    console.log(`--- AUDITORIA MERCADO PAGO ---`);
    console.log(`TOTAL PAGOS DE FACTURAS (IN): $${totalMpPayments.toFixed(2)}`);
    console.log(`TOTAL INGRESOS MANUALES (IN): $${manualMpIn.toFixed(2)}`);
    console.log(`TOTAL INGRESOS MP (SUM):      $${(totalMpPayments + manualMpIn).toFixed(2)}`);
    console.log(`TOTAL EGRESOS MP (OUT):       $${manualMpOut.toFixed(2)}`);
    
    const saldoNeto = totalMpPayments + manualMpIn - manualMpOut;
    console.log(`SALDO NETO (Generado):        $${saldoNeto.toFixed(2)}`);
    console.log(`SALDO INICIAL (Reportado):    $356234.00`);
    console.log(`SALDO TOTAL EN SISTEMA:       $${(saldoNeto + 356234).toFixed(2)}`);

  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

main();
