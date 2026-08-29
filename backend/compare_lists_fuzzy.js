const fs = require('fs');

const crmListStr = fs.readFileSync('pagados_agosto.txt', 'utf8');
const excelListStr = fs.readFileSync('excel_clients.txt', 'utf8');

const crmList = crmListStr.split('\n')
  .filter(line => line.match(/^\d+\./))
  .map(line => line.replace(/^\d+\.\s*/, '').trim().toUpperCase());

crmList.push('ESPOSITO RODRIGO');
crmList.push('MORON MIGUEL');
crmList.push('FANIN VANESA');

const excelList = excelListStr.split('\n')
  .map(line => line.trim().toUpperCase())
  .filter(line => line.length > 0);

function normalize(name) {
  return name.replace(/[^\w\s]/g, '').split(/\s+/).sort().join(' ');
}

// 1. Remove obvious matches using a set approach based on all words matching
let unmatchedExcel = [];
let matchedCrmIndices = new Set();

for (const excelName of excelList) {
  const exWords = excelName.split(/[\s/,-]+/);
  let bestMatchIdx = -1;
  let maxScore = 0;

  for (let i = 0; i < crmList.length; i++) {
    if (matchedCrmIndices.has(i)) continue;
    const crmName = crmList[i];
    const crmWords = crmName.split(/[\s/,-]+/);
    
    // Calculate overlap
    let overlap = 0;
    for (const w of exWords) {
      if (w.length > 2 && crmWords.includes(w)) overlap++;
    }
    
    if (overlap > maxScore) {
      maxScore = overlap;
      bestMatchIdx = i;
    }
  }

  if (maxScore >= 2) {
    matchedCrmIndices.add(bestMatchIdx);
  } else {
    unmatchedExcel.push(excelName);
  }
}

let unmatchedCrm = [];
for (let i = 0; i < crmList.length; i++) {
  if (!matchedCrmIndices.has(i)) {
    unmatchedCrm.push(crmList[i]);
  }
}

console.log('\n--- En Excel pero NO se encontró match en CRM ---');
console.log(unmatchedExcel);

console.log('\n--- En CRM pero NO se encontró match en Excel ---');
console.log(unmatchedCrm);
