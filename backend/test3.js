const axios = require('axios');
(async() => {
  try {
     const resAuth = await axios.post('http://localhost:4000/api/auth/login', {username: 'tkip', password: 'Bran5570'});
     const token = resAuth.data.token;
     
     try {
       const resGet = await axios.get('http://localhost:4000/api/invoices', { headers: { Authorization: 'Bearer ' + token } });
       console.log('INVOICES GET SUCCESS:', resGet.data.length);
     } catch(e) {
       console.log('INVOICES GET FAILED:', e.response?.status, e.response?.data);
     }
  } catch(e) {
     console.error('AUTH FAILED:', e.response?.data || e.message);
  }
})();
