const fs = require('fs');
const path = require('path');

try {
  const content = fs.readFileSync(path.join(__dirname, 'n8n_flow.json'), 'utf8');
  
  // Find all occurrences of "name" and "description" inside the nodes or tools
  // Let's use a regex to find tool names and descriptions
  const regex = /"name"\s*:\s*"([^"]+)"|description\s*:\s*"([^"]+)"/g;
  let match;
  const matches = [];
  while ((match = regex.exec(content)) !== null) {
    if (match[1]) {
      matches.push(`Name: ${match[1]}`);
    } else if (match[2]) {
      matches.push(`Description: ${match[2]}`);
    }
  }
  
  console.log("Found matches in n8n_flow.json:");
  console.log(matches.slice(0, 100).join('\n'));

} catch (e) {
  console.error("Error reading file:", e);
}
