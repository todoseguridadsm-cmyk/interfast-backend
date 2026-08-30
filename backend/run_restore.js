const fs = require('fs');
let env = fs.readFileSync('.env', 'utf8');
const dbUrlMatch = env.match(/DATABASE_URL=([^\n]+)/);
if (dbUrlMatch) {
  let url = dbUrlMatch[1].replace(/"/g, '').trim();
  url = url.replace(':6543', ':5432');
  console.log('Running with URL', url.substring(0, 30) + '...');
  
  const { execSync } = require('child_process');
  try {
    const res = execSync('node restore_20.js', { 
      env: Object.assign({}, process.env, { DATABASE_URL: url }),
      encoding: 'utf8'
    });
    console.log(res);
  } catch (err) {
    console.error(err.stdout);
    console.error(err.stderr);
  }
}
