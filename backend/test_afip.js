const Afip = require('@afipsdk/afip.js');

async function testAfip() {
  console.log('Testing Homologacion (production: false)...');
  try {
    const afipTest = new Afip({
      CUIT: 30717010554,
      res_folder: './afip_certs/',
      production: false
    });
    const statusTest = await afipTest.ElectronicBilling.getServerStatus();
    console.log('Homologacion SUCCESS!', statusTest);
    return;
  } catch (err) {
    console.log('Homologacion FAILED:', err.message);
  }

  console.log('\nTesting Produccion (production: true)...');
  try {
    const afipProd = new Afip({
      CUIT: 30717010554,
      res_folder: './afip_certs/',
      production: true
    });
    const statusProd = await afipProd.ElectronicBilling.getServerStatus();
    console.log('Produccion SUCCESS!', statusProd);
  } catch (err) {
    console.log('Produccion FAILED:', err.message);
  }
}

testAfip();
