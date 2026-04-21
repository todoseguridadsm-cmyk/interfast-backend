require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Abrir la base de datos local preexistente
const db = new sqlite3.Database('./prisma/dev.db', sqlite3.OPEN_READONLY, (err) => {
  if (err) console.error('Error al abrir dev.db:', err.message);
  else console.log('Conectado a la BD SQLite local (dev.db)');
});

const queryAll = (query) => new Promise((resolve, reject) => {
  db.all(query, [], (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
});

async function runMigration() {
  try {
    console.log('Iniciando volcado a Supabase...');

    // 1. Users
    const users = await queryAll('SELECT * FROM User');
    console.log(`Migrando ${users.length} Usuarios...`);
    for (const u of users) {
      await prisma.user.upsert({
        where: { id: u.id },
        update: {},
        create: {
          id: u.id,
          username: u.username,
          passwordHash: u.passwordHash,
          role: u.role,
          permissions: u.permissions,
          createdAt: new Date(u.createdAt),
          updatedAt: new Date(u.updatedAt)
        }
      });
    }

    // 2. Plans
    const plans = await queryAll('SELECT * FROM Plan');
    console.log(`Migrando ${plans.length} Planes...`);
    for (const p of plans) {
      await prisma.plan.upsert({
        where: { id: p.id },
        update: {},
        create: {
          id: p.id,
          name: p.name,
          megas: p.megas,
          basePrice: p.basePrice,
          ivaAmount: p.ivaAmount,
          totalPrice: p.totalPrice,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt)
        }
      });
    }

    // 3. Clients
    const clients = await queryAll('SELECT * FROM Client');
    console.log(`Migrando ${clients.length} Clientes...`);
    for (const c of clients) {
      await prisma.client.upsert({
        where: { id: c.id },
        update: {},
        create: {
          id: c.id,
          dni: c.dni,
          name: c.name,
          email: c.email,
          phone: c.phone,
          address: c.address,
          city: c.city,
          province: c.province,
          mainNode: c.mainNode,
          panelId: c.panelId,
          ipNumber: c.ipNumber,
          cuit: c.cuit,
          taxCondition: c.taxCondition,
          status: c.status,
          planId: c.planId,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt)
        }
      });
    }

    // 4. Invoices
    const invoices = await queryAll('SELECT * FROM Invoice');
    console.log(`Migrando ${invoices.length} Facturas...`);
    for (const inv of invoices) {
      await prisma.invoice.upsert({
        where: { id: inv.id },
        update: {},
        create: {
          id: inv.id,
          clientId: inv.clientId,
          month: inv.month,
          year: inv.year,
          originalAmount: inv.originalAmount,
          dueDate: new Date(inv.dueDate),
          status: inv.status,
          createdAt: new Date(inv.createdAt),
          updatedAt: new Date(inv.updatedAt)
        }
      });
    }

    // 5. Payments
    const payments = await queryAll('SELECT * FROM Payment');
    console.log(`Migrando ${payments.length} Pagos...`);
    for (const p of payments) {
      await prisma.payment.upsert({
        where: { id: p.id },
        update: {},
        create: {
          id: p.id,
          invoiceId: p.invoiceId,
          method: p.method,
          amountPaid: p.amountPaid,
          lateFeeApplied: p.lateFeeApplied,
          paymentDate: new Date(p.paymentDate),
          userId: p.userId
        }
      });
    }

    // 6. CashMovements
    const cash = await queryAll('SELECT * FROM CashMovement');
    console.log(`Migrando ${cash.length} Movimientos de Caja...`);
    for (const m of cash) {
      await prisma.cashMovement.upsert({
        where: { id: m.id },
        update: {},
        create: {
          id: m.id,
          type: m.type,
          amount: m.amount,
          description: m.description,
          userId: m.userId,
          createdAt: new Date(m.createdAt)
        }
      });
    }

    // 7. Tickets
    const tickets = await queryAll('SELECT * FROM Ticket');
    console.log(`Migrando ${tickets.length} Tickets de Soporte...`);
    for (const t of tickets) {
      await prisma.ticket.upsert({
        where: { id: t.id },
        update: {},
        create: {
          id: t.id,
          clientId: t.clientId,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt)
        }
      });
    }

    console.log('✅ ¡MIGRACIÓN COMPLETADA EXITOSAMENTE! Todos los datos locales están en Supabase.');
  } catch (error) {
    console.error('❌ Error general durante migración:', error);
  } finally {
    await prisma.$disconnect();
    db.close();
  }
}

runMigration();
