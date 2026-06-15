const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function update() {
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users.users.find(u => u.email === 'transporte2026@admin.com');
  
  if (user) {
    // update password
    await supabase.auth.admin.updateUserById(user.id, { password: 'BRN2347' });
    // update profile
    await supabase.from('profiles').update({ role: 'admin' }).eq('id', user.id);
    console.log('Updated user transporte2026@admin.com');
  } else {
    console.log('User not found');
  }
}
update();
