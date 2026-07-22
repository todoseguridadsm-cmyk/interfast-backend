const fetch = require('node-fetch');

async function payInvoice(invoiceId, payload) {
  const url = `https://interfast-backend-95ww.onrender.com/api/invoices/${invoiceId}/pay`;
  console.log(`Sending PUT request to pay invoice ${invoiceId}...`);
  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'x-api-key': 'InterfastN8NBot2026!',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    console.log(`Invoice ${invoiceId} Status Code:`, res.status);
    const data = await res.json();
    console.log(`Invoice ${invoiceId} Response:`, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error paying invoice ${invoiceId}:`, error);
  }
}

async function run() {
  // 1. Roldan Harold 2
  await payInvoice(450, {
    amountPaid: 24372.28,
    lateFeeApplied: 1380,
    totalRequired: 24372.28,
    method: 'TRANSFERENCIA'
  });

  // 2. Alonso Maria Alejandra
  await payInvoice(330, {
    amountPaid: 24371.00,
    lateFeeApplied: 1380,
    totalRequired: 24371.00,
    method: 'TRANSFERENCIA'
  });

  // 3. Moreno Luis Hector
  await payInvoice(376, {
    amountPaid: 24371.45,
    lateFeeApplied: 1380,
    totalRequired: 24371.45,
    method: 'TRANSFERENCIA'
  });
}

run();
