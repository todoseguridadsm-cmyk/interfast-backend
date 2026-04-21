const { execSync } = require('child_process');
const fs = require('fs');

try {
  console.log('Running vite build...');
  const output = execSync('npx vite build', { encoding: 'utf-8' });
  fs.writeFileSync('build_output.txt', output);
  console.log('Build successful');
} catch (error) {
  console.log('Build failed!');
  fs.writeFileSync('build_error.txt', error.stdout + '\n' + error.stderr);
}
