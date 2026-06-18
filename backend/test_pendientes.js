const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const docs = await prisma.content_library.findMany({ where: { estado: 'Pendiente' } });
  console.log('Docs encontrados:', docs.length);
  if (docs.length > 0) {
    const doc = docs[0];
    console.log('Actualizando doc:', doc.id);
    await prisma.content_library.update({
      where: { id: doc.id },
      data: {
        url_media: 'https://images.unsplash.com/photo-1575936123452-b67c3203c357?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        contenido_post: 'Prueba de publicación automatizada desde el CRM 🚀',
        tipo_media: 'imagen'
      }
    });
    console.log('Documento actualizado correctamente.');
  } else {
    console.log('No hay documentos pendientes para actualizar.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
