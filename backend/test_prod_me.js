const jwt = require('jsonwebtoken');
const axios = require('axios');
const JWT_SECRET = process.env.JWT_SECRET || 'TKIP_SUPER_PRIVATE_KEY_2026';
const BACKEND_URL = 'https://interfast-backend-95ww.onrender.com';

const clientId = 22; // Depósito Patagonia (visto en test anterior)
const dni = '31950190';

async function testProd() {
  const token = jwt.sign(
    { clientId, dni, type: 'CLIENT_PORTAL' },
    JWT_SECRET,
    { expiresIn: '60d' }
  );

  console.log("Token generado. Consultando Producción...");
  try {
    const res = await axios.get(`${BACKEND_URL}/api/portal/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("STATUS:", res.status);
    console.log("ACTIVE BILL (PROD):", JSON.stringify(res.data.activeBill, null, 2));
    if (!res.data.activeBill) {
      console.log("Invoices PENDING en History:", res.data.invoicesHistory.filter(i => i.status === 'PENDING').length);
    }
  } catch (err) {
    console.error("ERROR EN PROD:", err.response ? err.response.data : err.message);
  }
}
testProd();
