const xlsx = require('xlsx');

function inspect() {
    try {
        const filePath = 'C:\\Users\\MATIAS BRANDI\\Downloads\\Vialidad.xlsx';
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Read first 5 rows to understand the structure
        const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
        console.log("Primeras 5 filas del Excel:");
        console.log(data.slice(0, 5));
    } catch (error) {
        console.error("Error leyendo Excel:", error);
    }
}

inspect();
