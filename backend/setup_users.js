// Script para actualizar usuario tkip y crear usuario victor
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  console.log('--- Gestión de Usuarios INTERFAST ---\n');

  // 1. Actualizar contraseña de tkip (cuenta de Matías)
  const hashTkip = await bcrypt.hash('BRN2347', 10);
  const tkipUser = await prisma.user.update({
    where: { username: 'tkip' },
    data: { passwordHash: hashTkip },
    select: { id: true, username: true, role: true }
  });
  console.log('✅ Contraseña de tkip (Matías) actualizada:', tkipUser);

  // 2. Crear o actualizar usuario victor
  const hashVictor = await bcrypt.hash('BRN2347', 10);
  const victorUser = await prisma.user.upsert({
    where: { username: 'victor' },
    create: {
      username: 'victor',
      passwordHash: hashVictor,
      role: 'ADMIN',
      permissions: JSON.stringify(['ALL'])
    },
    update: {
      passwordHash: hashVictor,
      role: 'ADMIN',
      permissions: JSON.stringify(['ALL'])
    },
    select: { id: true, username: true, role: true }
  });
  console.log('✅ Usuario victor creado/actualizado:', victorUser);

  console.log('\n✅ Gestión de usuarios completada con éxito.');
}

main()
  .catch(e => { console.error('❌ Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
