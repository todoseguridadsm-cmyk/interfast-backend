const axios = require('axios');

async function main() {
  console.log("=== PRUEBA 1: /api/bot/obtener-factura?query=8156139 ===");
  try {
    const res1 = await axios.get('https://interfast-backend-95ww.onrender.com/api/bot/obtener-factura?query=8156139');
    console.log("Respuesta para DNI 8156139:");
    console.log(JSON.stringify(res1.data, null, 2));
  } catch (e) {
    console.error("Error 1:", e.response?.data || e.message);
  }

  console.log("\n=== PRUEBA 2: /api/bot/obtener-factura?query=211 ===");
  try {
    const res2 = await axios.get('https://interfast-backend-95ww.onrender.com/api/bot/obtener-factura?query=211');
    console.log("Respuesta para ID Cliente 211:");
    console.log(JSON.stringify(res2.data, null, 2));
  } catch (e) {
    console.error("Error 2:", e.response?.data || e.message);
  }

  console.log("\n=== PRUEBA 3: /api/bot/obtener-factura?query=506 ===");
  try {
    const res3 = await axios.get('https://interfast-backend-95ww.onrender.com/api/bot/obtener-factura?query=506');
    console.log("Respuesta para query=506:");
    console.log(JSON.stringify(res3.data, null, 2));
  } catch (e) {
    console.error("Error 3:", e.response?.data || e.message);
  }
}

main();
