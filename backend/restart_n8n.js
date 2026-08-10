const axios = require('axios');

const RENDER_API_KEY = 'rnd_4O7eigW7aUyLz1U4vOEN30mdbe5C';
const headers = { Authorization: `Bearer ${RENDER_API_KEY}`, Accept: 'application/json' };

async function restartN8n() {
  try {
    const serviceId = 'srv-d8ecn3f7f7vs73d1sie0';
    console.log(`Sending restart command to n8n service (${serviceId})...`);
    await axios.post(`https://api.render.com/v1/services/${serviceId}/restart`, {}, { headers });
    console.log("Restart command successful!");
  } catch(e) {
    console.log("Failed to restart:", e.response?.data || e.message);
  }
}

restartN8n();
