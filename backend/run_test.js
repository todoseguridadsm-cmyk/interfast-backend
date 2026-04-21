const { exec } = require('child_process');
const fs = require('fs');

console.log('Running build in frontend...');
exec('npm run build', { cwd: '../frontend' }, (error, stdout, stderr) => {
    const log = `--- STDOUT ---\n${stdout}\n\n--- STDERR ---\n${stderr}\n\n--- ERROR ---\n${error ? error.message : 'No Error'}`;
    fs.writeFileSync('build_result.log', log);
    console.log('Build finished, log saved.');
});
