const fs = require('fs');
const path = require('path');

try {
  const content = fs.readFileSync(path.join(__dirname, 'n8n_flow.json'), 'utf8');
  // Since it starts with <USER_REQUEST> ... we need to extract the JSON part
  const jsonStart = content.indexOf('{');
  const jsonEnd = content.lastIndexOf('}') + 1;
  const jsonStr = content.substring(jsonStart, jsonEnd);
  const data = JSON.parse(jsonStr);

  console.log("WORKFLOW NAME:", data.name);
  console.log("NODES:");
  data.nodes.forEach(node => {
    console.log(`- Type: ${node.type} | Name: ${node.name}`);
    if (node.type === 'ai_tool') {
      console.log(`  Tool details:`, JSON.stringify(node.parameters, null, 2));
    }
  });
} catch (e) {
  console.error("Error parsing n8n_flow.json:", e);
}
