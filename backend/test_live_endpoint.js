const axios = require('axios');

async function main() {
  console.log("=== PROBANDO ENDPOINT EN VIVO DE RENDER (/api/bot/verificar-atencion) ===");

  try {
    const res1 = await axios.get("https://interfast-backend-95ww.onrender.com/api/bot/verificar-atencion?phone=5492611234567&timestamp=1786221433652&fromMe=false");
    console.log("Status respuesta 1:", res1.status, res1.data);
  } catch (err) {
    console.error("Error en test 1:", err.response ? err.response.status : err.message, err.response ? err.response.data : '');
  }

  try {
    const res2 = await axios.get("https://interfast-backend-95ww.onrender.com/api/bot/verificar-atencion?phone=&timestamp=&fromMe=");
    console.log("Status respuesta 2:", res2.status, res2.data);
  } catch (err) {
    console.error("Error en test 2:", err.response ? err.response.status : err.message, err.response ? err.response.data : '');
  }
}

main();
