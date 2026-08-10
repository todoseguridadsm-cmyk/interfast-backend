const fs = require('fs');
let content = fs.readFileSync('n8n_flow.json', 'utf8');
let match = content.match(/"systemMessage"\s*:\s*"([\s\S]*?)"\n/);
if (match) {
  fs.writeFileSync('scratch_prompt.txt', match[1]);
  console.log('Extracted to scratch_prompt.txt');
} else {
  // try without trailing newline quote
  let match2 = content.match(/"systemMessage"\s*:\s*"([^]*?)(?=",\s*")/);
  if (match2) {
    fs.writeFileSync('scratch_prompt.txt', match2[1]);
    console.log('Extracted to scratch_prompt.txt (method 2)');
  } else {
    console.log('Not found');
  }
}
