const xlsx = require('xlsx');

function analyzeExcel() {
  const filePath = 'C:\\Users\\MATIAS BRANDI\\Desktop\\reportes mercadopago\\CAJA AL DIA DE LA FECHA.xlsx';
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log(`ANALISIS DE EXCEL: ${filePath}`);
    console.log(`TOTAL FILAS: ${data.length}`);
    
    // Dump first 3 rows to understand column names
    console.log("MUESTRA COLUMNAS:", Object.keys(data[0]));
    
    for(let i=0; i<3; i++) {
        console.log(`Fila ${i+1}:`, data[i]);
    }

  } catch (error) {
    console.error('Error reading Excel file:', error.message);
  }
}

analyzeExcel();
