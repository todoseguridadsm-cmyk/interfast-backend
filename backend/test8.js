require('dotenv').config();
const { addIpToCutoffList } = require('./mikrotik');

async function main() {
  console.log('Intentando agregar a Morosos...');
  await addIpToCutoffList('192.168.20.50', 'Vialidad');
  console.log('Terminado.');
}

main().catch(console.error);
