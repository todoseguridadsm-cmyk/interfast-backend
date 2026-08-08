const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const adminUser = await prisma.user.findFirst({ where: { username: 'tkip' } });
  const userId = adminUser ? adminUser.id : 1;

  console.log("=== PROCESANDO PAGO INDIVIDUAL ===");
  const paymentsText = `GAUNA GUSTAVO 22991.78
REYMOND SERGIO 22990.14
FERREYRA MARIA FLORENCIA 22991.63
LIPARI VANESA SILVINA 22991.37
SANCHEZ OSCAR GABRIEL 22990.96
MARQUEZ OSCAR 22990.53
BAIGORRIA JOSE MANUEL 22990.69
GUSTAVO GUILLERMO FIADINO 22991.51
LEANDRO MARTIN BARRERA LUCERO 22990.86
DUTTO ROXANA PATRICIA 22990.59
HERMOSO MIGUEL PEDRO 23000
CLAUDIA ANALIA AGUILERA 22990.70
FUNES ELISA NOEMI 22991.50
MAURICIO NICOLAS MORALES 22991.57`;

  const lines = paymentsText.split('\n').filter(l => l.trim() !== '');

  for (const line of lines) {
    const amountMatch = line.match(/[\d]+[.,]?[\d]*$/);
    if (!amountMatch) {
      console.log(`⚠️ No se pudo extraer el monto de la línea: ${line}`);
      continue;
    }
    
    let amountStr = amountMatch[0].replace(',', '.');
    const amountPaid = parseFloat(amountStr);
    
    let nameRaw = line.substring(0, amountMatch.index).trim();
    nameRaw = nameRaw.replace(/IGUAL PAGO[:]?/g, '').replace(/PAGO[:]?/g, '').trim();

    console.log(`\n🔍 Buscando cliente: "${nameRaw}" - Monto a pagar: $${amountPaid}`);

    const nameParts = nameRaw.split(' ').filter(p => p.length > 2);
    
    let clients = await prisma.client.findMany({
      where: { name: { contains: nameRaw, mode: 'insensitive' } }
    });
    
    if (clients.length === 0 && nameParts.length > 1) {
      clients = await prisma.client.findMany({
        where: {
          AND: nameParts.map(part => ({
            name: { contains: part, mode: 'insensitive' }
          }))
        }
      });
    }

    if (clients.length === 0) {
      console.log(`❌ Cliente NO encontrado: ${nameRaw}`);
      continue;
    }
    if (clients.length > 1) {
      console.log(`⚠️ Múltiples clientes encontrados para: ${nameRaw}. Saltando por seguridad.`);
      continue;
    }

    const client = clients[0];
    
    const invoices = await prisma.invoice.findMany({
      where: { clientId: client.id, status: { in: ['PENDING', 'PARTIAL'] } },
      orderBy: { createdAt: 'asc' }
    });

    if (invoices.length === 0) {
      console.log(`❌ No hay facturas pendientes para: ${client.name}`);
      continue;
    }

    const inv = invoices[0]; 

    await prisma.payment.create({
      data: {
        invoiceId: inv.id,
        amountPaid: amountPaid,
        method: 'MERCADOPAGO',
        operator: 'MERCADOPAGO',
        userId: userId,
        paymentDate: new Date(),
      }
    });

    await prisma.invoice.update({
      where: { id: inv.id },
      data: { status: 'PAID' }
    });

    console.log(`✅ ÉXITO: ${client.name} (ID: ${client.id}) - Factura ${inv.month}/${inv.year} pagada por MERCADOPAGO.`);
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
