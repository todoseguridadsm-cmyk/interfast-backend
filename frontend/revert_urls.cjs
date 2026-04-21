const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.jsx')) results.push(file);
    }
  });
  return results;
}

const files = walk('./src/components');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('https://interfast-backend-95ww.onrender.com/api')) {
    const updated = content.replace(/https:\/\/interfast-backend-95ww\.onrender\.com\/api/g, 'http://localhost:4000/api');
    fs.writeFileSync(file, updated, 'utf8');
    console.log('Reverted:', file);
  }
});
console.log('Revert Complete.');
