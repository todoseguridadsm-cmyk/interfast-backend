const xlsx = require('xlsx');

function main() {
  const filePath = 'C:\\Users\\MATIAS BRANDI\\Desktop\\reportes mercadopago\\CAJA AL DIA DE LA FECHA.xlsx';
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let totalTransferenciasSalientes = 0;
    let totalComisionesEImpuestos = 0;
    
    // Filtro a partir del 1ro de Agosto
    const cutoffDate = new Date('2026-08-01T00:00:00Z');

    data.forEach((row) => {
      let valorCompraStr = row['VALOR DE LA COMPRA'];
      let netoStr = row['MONTO NETO DE LA OPERACIÓN QUE IMPACTÓ TU DINERO'];
      let dateStr = row['FECHA DE APROBACIÓN'] || row['FECHA DE ORIGEN'];

      if (valorCompraStr !== undefined && valorCompraStr !== null && netoStr !== undefined && netoStr !== null) {
        let valCompra = Number(String(valorCompraStr).replace(',', '.'));
        let valNeto = Number(String(netoStr).replace(',', '.'));
        const rowDate = new Date(dateStr);

        if (rowDate >= cutoffDate) {
           // Si el valor de la compra es positivo (Ingreso de un cliente)
           if (valCompra > 0 && valNeto > 0) {
              // La comisión/impuesto es la diferencia entre el Bruto y el Neto
              let comision = valCompra - valNeto;
              if (comision > 0) {
                 totalComisionesEImpuestos += comision;
              }
           } 
           // Si el valor neto es negativo (Salida de dinero de la cuenta: Transferencia a proveedor, socio, compras, etc)
           else if (valNeto < 0) {
              totalTransferenciasSalientes += Math.abs(valNeto);
           }
        }
      }
    });

    console.log(`=== DESGLOSE DE EGRESOS REALES (APP MERCADOPAGO) ===`);
    console.log(`Impuestos y Comisiones cobradas por MP: $${totalComisionesEImpuestos.toFixed(2)}`);
    console.log(`Salidas de Dinero (Transferencias, compras, retiros): $${totalTransferenciasSalientes.toFixed(2)}`);
    console.log(`TOTAL EGRESOS EN APP: $${(totalComisionesEImpuestos + totalTransferenciasSalientes).toFixed(2)}`);

  } catch (error) {
    console.error('Error reading Excel file:', error.message);
  }
}

main();
