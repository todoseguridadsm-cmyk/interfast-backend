const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase.from('profiles').select('id').limit(1);
  if (data && data.length > 0) {
    const { error: updErr } = await supabase.from('profiles').update({ role: 'empleado' }).eq('id', data[0].id);
    if (updErr) {
       console.log('Error:', updErr);
    } else {
       console.log('Success altering role to empleado');
       await supabase.from('profiles').update({ role: 'admin' }).eq('id', data[0].id); // revert
    }
  }
}
check();
