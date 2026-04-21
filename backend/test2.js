const axios = require('axios');
(async() => {
  try {
     const resAuth = await axios.post('http://localhost:4000/api/auth/login', {username: 'tkip', password: 'Bran5570'});
     const token = resAuth.data.token;
     
     try {
       const resGet = await axios.get('http://localhost:4000/api/cash/daily', { headers: { Authorization: 'Bearer ' + token } });
       console.log('GET SUCCESS:', Object.keys(resGet.data));
     } catch(e) {
       console.log('GET FAILED:', e.response?.status, e.response?.data);
     }
     
     try {
       const resPost = await axios.post('http://localhost:4000/api/cash/movement', { type: 'IN', amount: 50, description: 'Test' }, { headers: { Authorization: 'Bearer ' + token } });
       console.log('POST SUCCESS:', resPost.data);
     } catch(e) {
       console.log('POST FAILED:', e.response?.status, e.response?.data);
     }
  } catch(e) {
     console.error('AUTH FAILED:', e.response?.data || e.message);
  }
})();
