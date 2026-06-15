const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkAdmin() {
  const { data, error } = await supabase.from('profiles').select('*');
  console.log('Profiles:', data);
}

checkAdmin();
