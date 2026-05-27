const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { id: 1, username: 'n8n_agent', role: 'ADMIN', permissions: '["ALL"]' },
  'TKIP_SUPER_PRIVATE_KEY_2026', // El mismo secret que usa tu backend
  { expiresIn: '10y' } // Expira en 10 años
);

console.log("\n=== TOKEN DE LARGA DURACION PARA N8N ===\n");
console.log(token);
console.log("\n========================================\n");
