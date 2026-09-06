const xlsx = require('xlsx');

function analyzeExcel() {
  const filePath = 'C:\\Users\\MATIAS BRANDI\\Desktop\\reportes mercadopago\\CAJA AL DIA DE LA FECHA.xlsx';
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let minDate = new Date('2099-01-01');
    let maxDate = new Date('1970-01-01');

    data.forEach(row => {
      const fechaStr = row['FECHA DE ORIGEN'] || row['FECHA DE APROBACIÓN'];
      if (fechaStr) {
        const d = new Date(fechaStr);
        if (d < minDate) minDate = d;
        if (d > maxDate) maxDate = d;
      }
    });

    console.log(`Rango de fechas del Excel:`);
    console.log(`Desde: ${minDate.toISOString()}`);
    console.log(`Hasta: ${maxDate.toISOString()}`);

  } catch (error) {
    console.error('Error reading Excel file:', error.message);
  }
}

analyzeExcel();
