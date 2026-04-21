const axios = require('axios');
async function test() {
  try {
    const res = await axios.post('https://interfast-backend-95ww.onrender.com/api/auth/login', {
      username: 'tkip',
      password: 'Bran5570'
    });
    console.log('Login success');
    
    // Pick an invoice
    const clients = await axios.get('https://interfast-backend-95ww.onrender.com/api/invoices', {
      headers: { Authorization: `Bearer ${res.data.token}` }
    });
    const invs = clients.data;
    if (invs.length > 0) {
      console.log('Trying to delete invoice:', invs[0].id, 'Status:', invs[0].status);
      try {
        const delRes = await axios.delete(`https://interfast-backend-95ww.onrender.com/api/invoices/${invs[0].id}`, {
          headers: { Authorization: `Bearer ${res.data.token}` }
        });
        console.log('Delete successful:', delRes.data);
      } catch(e) {
        console.error('Delete failed:', e.response?.data || e.message);
      }
    } else {
      console.log('No invoices found');
    }
  } catch (err) {
       console.error('Error Status:', err.response?.status);
       console.error('Error Data:', err.response?.data);
  }
}
test();
