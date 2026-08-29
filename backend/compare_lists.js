const fs = require('fs');

const crmListStr = fs.readFileSync('pagados_agosto.txt', 'utf8');
const excelListStr = fs.readFileSync('excel_clients.txt', 'utf8');

const crmList = crmListStr.split('\n')
  .filter(line => line.match(/^\d+\./))
  .map(line => line.replace(/^\d+\.\s*/, '').trim().toUpperCase());

// We manually added these 3 to the CRM earlier today
crmList.push('ESPOSITO RODRIGO');
crmList.push('MORON MIGUEL');
crmList.push('FANIN VANESA');

const excelList = excelListStr.split('\n')
  .map(line => line.trim().toUpperCase())
  .filter(line => line.length > 0);

console.log(`CRM List (known): ${crmList.length}`);
console.log(`Excel List: ${excelList.length}`);

console.log('\n--- En Excel pero NO en CRM (conocido) ---');
for (const excelName of excelList) {
  const found = crmList.find(crmName => 
    crmName.includes(excelName) || excelName.includes(crmName)
  );
  if (!found) {
    console.log(excelName);
  }
}

console.log('\n--- En CRM (conocido) pero NO en Excel ---');
for (const crmName of crmList) {
  const found = excelList.find(excelName => 
    excelName.includes(crmName) || crmName.includes(excelName)
  );
  if (!found) {
    console.log(crmName);
  }
}
