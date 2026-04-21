const axios = require('axios');
(async() => {
  try {
     const res = await axios.post('http://localhost:4000/api/auth/login', {username: 'tkip', password: 'Bran5570'});
     const token = res.data.token;
     
     const res2 = await axios.post('http://localhost:4000/api/cash/movement', { type: 'IN', amount: 50, description: 'Test' }, { headers: { Authorization: 'Bearer ' + token } });
     
     console.log('SUCCESS:', res2.data);
  } catch(e) {
     console.error('FAILED:', e.response?.data || e.message);
  }
})();
