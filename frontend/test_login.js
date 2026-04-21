const axios = require('axios');
async function test() {
  try {
    const res = await axios.post('https://interfast-backend-95ww.onrender.com/api/auth/login', {
      username: 'tkip',
      password: 'Bran5570'
    });
    console.log('Login success:', res.data.token);
    
    // Now fetch clients
    const clients = await axios.get('https://interfast-backend-95ww.onrender.com/api/clients', {
      headers: { Authorization: `Bearer ${res.data.token}` }
    });
    console.log('Clients count:', clients.data.length);
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}
test();
