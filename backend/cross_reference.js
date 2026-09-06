const xlsx = require('xlsx');
const { Client } = require('pg');

async function main() {
  const filePath = 'C:\\Users\\MATIAS BRANDI\\Desktop\\reportes mercadopago\\CAJA AL DIA DE LA FECHA.xlsx';
  const client = new Client({
    connectionString: "postgresql://postgres.rtxgtlwffewlmqhdedzv:TkipSeguridad2026@aws-1-us-west-2.pooler.supabase.com:5432/postgres",
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    const startOfDay = new Date(Date.UTC(2026, 6, 31, 0, 0, 0, 0)).toISOString();
    const paymentsRes = await client.query(`
      SELECT "amountPaid", "method", "paymentDate"
      FROM "Payment" 
      WHERE "method" != 'OTRO_SISTEMA' AND "paymentDate" >= $1;
    `, [startOfDay]);

    const dbPayments = [];
    for (const p of paymentsRes.rows) {
      const m = (p.method || '').toUpperCase();
      const isMp = m.includes('MERCADO') || m.includes('MP') || m.includes('TRANSFER') || m.includes('DEBITO') || m.includes('RAPIPAGO');
      if (isMp) {
        dbPayments.push({
          amount: Number(p.amountPaid),
          date: new Date(p.paymentDate)
        });
      }
    }

    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const missingIncomes = [];
    let totalMissing = 0;

    data.forEach((row) => {
      let valorCompraStr = row['VALOR DE LA COMPRA'];
      let netoStr = row['MONTO NETO DE LA OPERACIÓN QUE IMPACTÓ TU DINERO'];
      let dateStr = row['FECHA DE APROBACIÓN'] || row['FECHA DE ORIGEN'];
      let pagador = row['PAGADOR'] || row['NOMBRE DEL EMISOR'] || '';
      let descStr = row['DETALLE DE LA VENTA'] || row['TIPO DE OPERACIÓN'] || '';

      if (valorCompraStr !== undefined && valorCompraStr !== null) {
        let valCompra = Number(String(valorCompraStr).replace(',', '.'));
        let valNeto = Number(String(netoStr).replace(',', '.'));

        // If it's a positive income
        if (!isNaN(valCompra) && valCompra > 0 && valNeto > 0 && !String(descStr).toLowerCase().includes('rendimiento')) {
          const excelDate = new Date(dateStr);
          
          // Match by amount exactly (valor de la compra), and date within +/- 2 days
          const matchIdx = dbPayments.findIndex(p => {
             const timeDiff = Math.abs(p.date - excelDate) / (1000 * 60 * 60 * 24);
             return Math.abs(p.amount - valCompra) < 1.0 && timeDiff <= 2.5; 
          });

          if (matchIdx !== -1) {
             dbPayments.splice(matchIdx, 1);
          } else {
             missingIncomes.push({
               date: dateStr,
               amount: valCompra,
               neto: valNeto,
               desc: descStr,
               pagador: pagador
             });
             totalMissing += valNeto;
          }
        }
      }
    });

    console.log(`--- POSIBLES INGRESOS NO CARGADOS EN CMR ---`);
    missingIncomes.sort((a,b) => b.amount - a.amount).forEach(m => {
       console.log(`Fecha: ${m.date.split('T')[0]} | Compra: $${m.amount} | Neto: $${m.neto} | Pagador: ${m.pagador}`);
    });
    console.log(`TOTAL NETO SOSPECHOSO: $${totalMissing.toFixed(2)}`);

  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

main();
