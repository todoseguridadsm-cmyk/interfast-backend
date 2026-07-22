const fetch = require('node-fetch');

async function run() {
  const invoiceId = 414;
  const url = `https://interfast-backend-95ww.onrender.com/api/invoices/${invoiceId}/pay`;
  
  const payload = {
    amountPaid: 24371.68,
    lateFeeApplied: 1380,
    totalRequired: 24371.68,
    method: 'TRANSFERENCIA'
  };

  console.log("Sending PUT request to register payment for Claudia Aguilera (Invoice 414)...");
  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'x-api-key': 'InterfastN8NBot2026!',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    console.log("HTTP STATUS:", res.status);
    const data = await res.json();
    console.log("RESPONSE:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

run();
