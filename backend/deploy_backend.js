const axios = require('axios');

const RENDER_API_KEY = 'rnd_4O7eigW7aUyLz1U4vOEN30mdbe5C';
const headers = { Authorization: `Bearer ${RENDER_API_KEY}`, Accept: 'application/json' };

async function restartBackend() {
  try {
    const serviceId = 'srv-d79ei3uuk2gs73ecbag0';
    console.log(`Sending deploy command to backend service (${serviceId})...`);
    await axios.post(`https://api.render.com/v1/services/${serviceId}/deploys`, { clearCache: 'do_not_clear' }, { headers });
    console.log("Deploy command successful!");
  } catch(e) {
    console.log("Failed to deploy:", e.response?.data || e.message);
  }
}

restartBackend();
