const xlsx = require('xlsx');

function main() {
  const filePath = 'C:\\Users\\MATIAS BRANDI\\Desktop\\reportes mercadopago\\CAJA AL DIA DE LA FECHA.xlsx';
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let count = 0;
    let totalAmount = 0;
    
    // Filtro a partir del 1ro de Agosto
    const cutoffDate = new Date('2026-08-01T00:00:00Z');

    data.forEach((row) => {
      let valorCompraStr = row['VALOR DE LA COMPRA'];
      let dateStr = row['FECHA DE APROBACIÓN'] || row['FECHA DE ORIGEN'];
      let descStr = row['DETALLE DE LA VENTA'] || row['TIPO DE OPERACIÓN'] || '';

      if (valorCompraStr !== undefined && valorCompraStr !== null) {
        let valCompra = Number(String(valorCompraStr).replace(',', '.'));
        const rowDate = new Date(dateStr);

        // Ignorar rendimientos y asegurar que es desde el 1 de Agosto
        if (!isNaN(valCompra) && valCompra > 0 && !String(descStr).toLowerCase().includes('rendimiento') && rowDate >= cutoffDate) {
          
          // Contar los que estén entre 22000 y 27000
          if (valCompra >= 22000 && valCompra <= 27000) {
             count++;
             totalAmount += valCompra;
          }
        }
      }
    });

    console.log(`=== ANALISIS DE FACTURAS PAGADAS VS EXCEL ===`);
    console.log(`Cantidad de facturas cobradas en el sistema (CMR): 249`);
    console.log(`Cantidad de ingresos entre $22.000 y $27.000 en el Excel MP (Desde 01/Ago): ${count}`);
    console.log(`Diferencia: ${count - 249}`);
    console.log(`Monto total de esos ${count} ingresos en MP: $${totalAmount.toFixed(2)}`);

  } catch (error) {
    console.error('Error reading Excel file:', error.message);
  }
}

main();
