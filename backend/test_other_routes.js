const axios = require('axios');

async function main() {
  try {
    const res = await axios.get("https://interfast-backend-95ww.onrender.com/api/bot/check-status");
    console.log("Check-status response:", res.status, res.data);
  } catch(e) {
    console.error("Check-status error:", e.response ? e.response.status : e.message, e.response ? e.response.data : '');
  }

  try {
    const res2 = await axios.post("https://interfast-backend-95ww.onrender.com/api/bot/verificar-atencion", { phone: "5492611234567" });
    console.log("POST verificar-atencion response:", res2.status, res2.data);
  } catch(e) {
    console.error("POST verificar-atencion error:", e.response ? e.response.status : e.message, e.response ? e.response.data : '');
  }
}

main();
