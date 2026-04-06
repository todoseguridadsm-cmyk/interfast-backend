const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { MercadoPagoConfig, Preference } = require('mercadopago');
const { Client, LocalAuth } = require('whatsapp-web.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// AFIP Configuration
const Afip = require('@afipsdk/afip.js');
let afip = null;
try {
  // Cuando tengas los certificados, reemplaza el cuit y coloca los archivos cert y key en una carpeta /afip_certs
  // afip = new Afip({ CUIT: 20111111112, res_folder: './afip_certs/' });
  console.log('AFIP Module Loaded: Pendiente de certificados para inicialización real.');
} catch (e) {
  console.error('Error inicializando AFIP:', e);
}

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;

// Crypto Settings
const JWT_SECRET = process.env.JWT_SECRET || 'TKIP_SUPER_PRIVATE_KEY_2026';

// Seed Admin User
async function seedAdmin() {
  try {
    const defaultAdmin = await prisma.user.findUnique({ where: { username: 'tkip' } });
    if (!defaultAdmin) {
      const hash = await bcrypt.hash('Bran5570', 10);
      await prisma.user.create({
        data: {
          username: 'tkip',
          passwordHash: hash,
          role: 'ADMIN',
          permissions: JSON.stringify(['ALL'])
        }
      });
      console.log('🔒 Superusuario maestro (tkip) creado y encriptado.');
    }
  } catch (err) {
    console.error('Error seeding admin', err);
  }
}
seedAdmin();

// Authorization Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Acceso Denegado. Faltan Credenciales JWT.' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token Inválido o Expirado.' });
    req.user = user;
    next();
  });
};

app.use(cors());
app.use(express.json());

app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth/login')) return next();
  return authenticateToken(req, res, next);
});

// WhatsApp Headless Client variables
let waStatus = 'DISCONNECTED';
let waQrCode = null;

const waClient = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

waClient.on('qr', (qr) => {
  waStatus = 'QR_READY';
  waQrCode = qr;
  console.log('📱 WhatsApp Web requiere escanear nuevo Código QR.');
});

waClient.on('ready', () => {
  waStatus = 'CONNECTED';
  waQrCode = null;
  console.log('📱 WhatsApp Web Headless Client está LISTO y conectado!');
});

waClient.on('disconnected', () => {
  waStatus = 'DISCONNECTED';
  console.log('📱 WhatsApp Desconectado');
  waClient.initialize().catch(e => console.error("Error auto-reconnect WA", e));
});

waClient.initialize().catch(e => console.error("Error inicializando WA:", e));

// --- ROUTES ---

// AUTH: Login Endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username } });
    
    if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' });
    
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) return res.status(401).json({ error: 'Credenciales incorrectas' });
    
    // Generate JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, permissions: user.permissions }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );
    
    res.json({ token, user: { username: user.username, role: user.role, permissions: JSON.parse(user.permissions) } });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor en el login' });
  }
});

// 0. WhatsApp Robot Status
app.get('/api/whatsapp/status', (req, res) => {
  res.json({ status: waStatus, qr: waQrCode });
});

// 0.1 AFIP Test Route
app.get('/api/afip/status', async (req, res) => {
  if (!afip) return res.json({ status: 'PENDING_CERTS', message: 'Módulo AFIP esperando certificados.' });
  try {
    const serverStatus = await afip.ElectronicBilling.getServerStatus();
    res.json({ status: 'CONNECTED', serverStatus });
  } catch (error) {
    res.status(500).json({ error: 'Error conectando a AFIP', details: error.message });
  }
});

// 1. Dashboard Summary
app.get('/api/dashboard', async (req, res) => {
  try {
    const clientsCount = await prisma.client.count();
    const invoices = await prisma.invoice.findMany({ where: { status: 'PENDING' } });
    
    const pendingTotal = invoices.reduce((acc, inv) => acc + inv.originalAmount, 0);

    res.json({
      activeClients: clientsCount,
      pendingTotal,
      pendingInvoicesCount: invoices.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener datos del dashboard' });
  }
});

// 2. Clients CRUD
app.get('/api/clients', async (req, res) => {
  try {
    const clients = await prisma.client.findMany({ include: { plan: true } });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

app.post('/api/clients', async (req, res) => {
  try {
    const { dni, name, email, phone, address, city, province, mainNode, panelId, ipNumber, planId, cuit, taxCondition } = req.body;
    
    // Buscar si hay un número/ID disponible por eliminación (huecos en la secuencia)
    const activeClients = await prisma.client.findMany({ 
      select: { id: true }, 
      orderBy: { id: 'asc' } 
    });
    
    let reusableId = null;
    let expected = 1;
    for (const c of activeClients) {
      if (c.id !== expected) {
        reusableId = expected;
        break;
      }
      expected++;
    }

    const dataPayload = { dni, name, email, phone, address, city, province, mainNode, panelId, ipNumber, planId, cuit, taxCondition };
    if (reusableId !== null) {
      dataPayload.id = reusableId;
    }

    const client = await prisma.client.create({
      data: dataPayload,
    });
    res.json(client);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

app.delete('/api/clients/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const invoices = await prisma.invoice.findMany({ where: { clientId: id } });
    const invoiceIds = invoices.map(i => i.id);
    if (invoiceIds.length > 0) {
      await prisma.payment.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
      await prisma.invoice.deleteMany({ where: { clientId: id } });
    }
    
    await prisma.client.delete({ where: { id: id } });
    res.json({ message: 'Cliente eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
});

app.put('/api/clients/:id', async (req, res) => {
  try {
    const { dni, name, email, phone, address, city, province, mainNode, panelId, ipNumber, planId, cuit, taxCondition } = req.body;
    const client = await prisma.client.update({
      where: { id: parseInt(req.params.id) },
      data: { dni, name, email, phone, address, city, province, mainNode, panelId, ipNumber, planId, cuit, taxCondition },
    });
    res.json(client);
  } catch (error) {
    res.status(500).json({ error: 'Error al editar cliente' });
  }
});

// 3. Plans CRUD
app.get('/api/plans', async (req, res) => {
  try {
    const plans = await prisma.plan.findMany();
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener planes' });
  }
});

app.post('/api/plans', async (req, res) => {
  try {
    const { name, megas, priceV1, dueDate1, priceV2, dueDate2, priceV3, dueDate3 } = req.body;
    // Retro-compatibility (store priceV1 as base/total)
    const basePrice = parseFloat(priceV1 || 0) / 1.21;
    const ivaAmount = basePrice * 0.21;
    const totalPrice = parseFloat(priceV1 || 0);

    const plan = await prisma.plan.create({ 
      data: { 
        name, 
        megas: parseInt(megas || 0), 
        basePrice, 
        ivaAmount, 
        totalPrice,
        priceV1: parseFloat(priceV1 || 0),
        dueDate1: parseInt(dueDate1 || 10),
        priceV2: parseFloat(priceV2 || 0),
        dueDate2: parseInt(dueDate2 || 15),
        priceV3: parseFloat(priceV3 || 0),
        dueDate3: parseInt(dueDate3 || 20)
      } 
    });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear plan' });
  }
});

app.delete('/api/plans/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const inUse = await prisma.client.findFirst({ where: { planId: id } });
    if (inUse) return res.status(400).json({ error: 'No se puede eliminar el plan porque hay clientes asociados a él.' });
    
    await prisma.plan.delete({ where: { id } });
    res.json({ message: 'Plan eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar plan' });
  }
});

app.put('/api/plans/:id', async (req, res) => {
  try {
    const { name, megas, priceV1, dueDate1, priceV2, dueDate2, priceV3, dueDate3 } = req.body;
    const basePrice = parseFloat(priceV1 || 0) / 1.21;
    const ivaAmount = basePrice * 0.21;
    const totalPrice = parseFloat(priceV1 || 0);
    
    const plan = await prisma.plan.update({
      where: { id: parseInt(req.params.id) },
      data: { 
        name, 
        megas: parseInt(megas || 0),
        basePrice, 
        ivaAmount, 
        totalPrice,
        priceV1: parseFloat(priceV1 || 0),
        dueDate1: parseInt(dueDate1 || 10),
        priceV2: parseFloat(priceV2 || 0),
        dueDate2: parseInt(dueDate2 || 15),
        priceV3: parseFloat(priceV3 || 0),
        dueDate3: parseInt(dueDate3 || 20)
      }
    });
    res.json(plan);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al editar plan' });
  }
});

// 4. Invoices and Late Fee Engine
app.get('/api/invoices', async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({ 
      include: { client: true, payments: true },
      orderBy: { dueDate: 'desc' }
    });
    
    // Motor Dinámico de Mora Ponderada (Tiered)
    const dynamicInvoices = invoices.map(inv => {
      const today = new Date();
      let totalAmount = inv.priceV1 || inv.originalAmount;
      let calculatedLateFee = 0;
      let isLate = false;

      if (inv.status === 'PENDING') {
        const d1 = new Date(inv.dueDate1 || inv.dueDate);
        const d2 = new Date(inv.dueDate2 || inv.dueDate);
        
        // Si hoy es mayor a Vencimiento 2, paga Precio 3.
        if (today > d2 && inv.priceV3) {
           isLate = true;
           totalAmount = inv.priceV3;
           calculatedLateFee = totalAmount - inv.originalAmount;
        } 
        // Si no pasó el V2, pero sí pasó el V1, paga Precio 2.
        else if (today > d1 && inv.priceV2) {
           isLate = true;
           totalAmount = inv.priceV2;
           calculatedLateFee = totalAmount - inv.originalAmount;
        }
      }
      
      return { ...inv, isLate, calculatedLateFee, totalAmount };
    });
    res.json(dynamicInvoices);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener facturas' });
  }
});

app.post('/api/invoices/generate', async (req, res) => {
  try {
    const clients = await prisma.client.findMany({ 
      where: { status: 'ACTIVE' }, 
      include: { plan: true }
    });
    
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    let generatedCount = 0;

    for (const client of clients) {
      if (!client.plan) continue;
      
      const existing = await prisma.invoice.findFirst({
        where: { clientId: client.id, month: currentMonth, year: currentYear }
      });
      
      if (!existing) {
        const dueDate1Date = new Date(currentYear, currentMonth - 1, client.plan.dueDate1 || 10, 23, 59, 59, 999);
        const dueDate2Date = new Date(currentYear, currentMonth - 1, client.plan.dueDate2 || 15, 23, 59, 59, 999);
        const dueDate3Date = new Date(currentYear, currentMonth - 1, client.plan.dueDate3 || 20, 23, 59, 59, 999);

        await prisma.invoice.create({
          data: {
            clientId: client.id,
            month: currentMonth,
            year: currentYear,
            originalAmount: client.plan.priceV1 || client.plan.totalPrice,
            dueDate: dueDate1Date,
            priceV1: client.plan.priceV1 || client.plan.totalPrice,
            dueDate1: dueDate1Date,
            priceV2: client.plan.priceV2 || client.plan.totalPrice,
            dueDate2: dueDate2Date,
            priceV3: client.plan.priceV3 || client.plan.totalPrice,
            dueDate3: dueDate3Date,
            status: 'PENDING'
          }
        });
        generatedCount++;
      }
    }
    
    res.json({ message: `${generatedCount} facturas nuevas generadas para el mes actual.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar facturas' });
  }
});

app.post('/api/invoices/mass-notify', async (req, res) => {
  if (waStatus !== 'CONNECTED') {
    return res.status(400).json({ error: 'El Robot de WhatsApp no está conectado (Escanea el QR).' });
  }

  try {
    const { invoiceIds } = req.body;
    
    let whereClause = { status: 'PENDING' };
    if (invoiceIds && Array.isArray(invoiceIds) && invoiceIds.length > 0) {
      whereClause.id = { in: invoiceIds };
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: { client: true }
    });
    
    let notifiedCount = 0;
    for (const inv of invoices) {
      if (!inv.client.phone) continue;
      
      const phone = inv.client.phone.replace(/\D/g, '');
      const targetPhone = phone.startsWith('54') ? `${phone}@c.us` : `549${phone}@c.us`;
      
      const today = new Date();
      const dueDateEnd = new Date(inv.dueDate);
      dueDateEnd.setHours(23, 59, 59, 999);
      const isLate = today > dueDateEnd;
      const calculatedLateFee = isLate ? inv.originalAmount * 0.10 : 0;
      const totalAmountWithFee = inv.originalAmount + calculatedLateFee;
      
      let paymentLink = '';
      if (!process.env.MP_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN === '') {
        paymentLink = `https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=DEMO-SIMULACION-${inv.id}`;
      } else {
        const preference = new Preference(clientMP);
        const prefs = await preference.create({
          body: {
            items: [{ id: `INV-${inv.id}`, title: `Internet TK${String(inv.clientId).padStart(3,'0')}`, quantity: 1, unit_price: parseFloat(totalAmountWithFee) }],
            payer: { name: inv.client.name, email: inv.client.email || 'test@test.com' },
            back_urls: { success: "http://localhost:5173/invoices", failure: "http://localhost:5173/invoices" },
            auto_return: "approved"
          }
        });
        paymentLink = prefs.init_point;
      }
      
      const message = `Hola ${inv.client.name}! 👋🏻\n\nTe recordamos que tienes una factura pendiente por tu servicio de Internet (Período: ${inv.month}/${inv.year}).\n\nEl total a abonar es de *$${totalAmountWithFee.toFixed(2)}*.\n\nPuedes saldar tu cuenta de forma rápida y 100% segura a través de Mercado Pago en el siguiente enlace oficial:\n${paymentLink}\n\n¡Gracias por tu pago!`;
      
      await waClient.sendMessage(targetPhone, message);
      notifiedCount++;
      
      // Delay 3 seconds between messages to prevent WA Ban
      await new Promise(r => setTimeout(r, 3000));
    }
    
    res.json({ message: `¡Proceso silencioso completado! ${notifiedCount} deudores notificados automáticamente por el Robot.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al enviar mensajes masivos internos' });
  }
});

// --- USERS ADMIN ROUTES ---
app.get('/api/users', async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Se requiere rol Administrador' });
  try {
    const users = await prisma.user.findMany({ select: { id: true, username: true, role: true, permissions: true, createdAt: true } });
    res.json(users);
  } catch(err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/users', async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Se requiere rol Administrador' });
  try {
    const { username, password, role, permissions } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: { username, passwordHash: hash, role: role || 'STAFF', permissions: JSON.stringify(permissions || []) },
      select: { id: true, username: true, role: true }
    });
    res.json(newUser);
  } catch (err) {
    res.status(500).json({ error: 'Posible usuario duplicado' });
  }
});

app.put('/api/users/:id', async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Se requiere rol Administrador' });
  try {
    const userId = parseInt(req.params.id);
    const { role, permissions } = req.body;
    
    // Check if modifying master admin tkip
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (targetUser.username === 'tkip' && role !== 'ADMIN') {
      return res.status(403).json({ error: 'No puedes quitarle el rol de administrador a la cuenta maestra.' });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { 
        role: role || targetUser.role, 
        permissions: JSON.stringify(permissions || []) 
      },
      select: { id: true, username: true, role: true, permissions: true }
    });
    res.json(updated);
  } catch(err) {
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

app.put('/api/users/:id/password', async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Se requiere rol Administrador' });
  try {
    const userId = parseInt(req.params.id);
    const { password } = req.body;
    if (!password || password.length < 4) return res.status(400).json({ error: 'Contraseña muy corta' });
    
    const hash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hash }
    });
    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch(err) {
    res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Se requiere rol Administrador' });
  try {
    const userId = parseInt(req.params.id);
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!targetUser) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (targetUser.username === 'tkip') {
      return res.status(403).json({ error: '¡Acción Bloqueada! No puedes eliminar la cuenta raíz (tkip).' });
    }
    
    await prisma.user.delete({ where: { id: userId } });
    res.json({ message: 'Usuario eliminado del sistema' });
  } catch(err) {
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

// --- TICKETS AND SUPPORT ---
app.get('/api/tickets', async (req, res) => {
  try {
    const tickets = await prisma.ticket.findMany({
      include: { client: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tickets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching tickets' });
  }
});

app.post('/api/tickets', async (req, res) => {
  try {
    const { clientId, title, description, priority } = req.body;
    const ticket = await prisma.ticket.create({
      data: { clientId: parseInt(clientId), title, description, priority: priority || 'NORMAL' },
      include: { client: true }
    });
    res.json(ticket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creating ticket' });
  }
});

app.put('/api/tickets/:id', async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const { status, title, description, priority } = req.body;
    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;

    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
      include: { client: true }
    });
    res.json(ticket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error updating ticket' });
  }
});

app.delete('/api/tickets/:id', async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    await prisma.ticket.delete({ where: { id: ticketId } });
    res.json({ message: 'Ticket eliminado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error deleting ticket' });
  }
});

// --- DAILY CASH MANAGER ---
app.get('/api/cash/daily', async (req, res) => {
  try {
    const { date, endDate } = req.query; 
    let startOfDay, endOfDay;
    
    if (date && endDate) {
      const [year, month, day] = date.split('-');
      const [eyear, emonth, eday] = endDate.split('-');
      startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
      endOfDay = new Date(eyear, emonth - 1, eday, 23, 59, 59, 999);
    } else if (date) {
      const [year, month, day] = date.split('-');
      startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
      endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
    } else {
      startOfDay = new Date();
      startOfDay.setHours(0,0,0,0);
      endOfDay = new Date();
      endOfDay.setHours(23,59,59,999);
    }

    console.log(`Parsed Range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);

    const payments = await prisma.payment.findMany({
      where: {
        paymentDate: { gte: startOfDay, lte: endOfDay },
        method: 'CASH'
      },
      include: {
        invoice: { include: { client: true } },
        user: { select: { username: true } }
      }
    });

    const movements = await prisma.cashMovement.findMany({
      where: { createdAt: { gte: startOfDay, lte: endOfDay } },
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ payments, movements });
  } catch (err) {
    console.error("ERROR IN /api/cash/daily:", err);
    res.status(500).json({ error: 'Error fetching daily cash flow' });
  }
});

app.post('/api/cash/movement', async (req, res) => {
  try {
    const { type, amount, description } = req.body;
    
    const m = await prisma.cashMovement.create({
      data: {
        type, 
        amount: parseFloat(amount),
        description,
        userId: parseInt(req.user?.id) || 1
      },
      include: { user: { select: { username: true } } }
    });
    res.json(m);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error registrar movimiento caja' });
  }
});

app.put('/api/invoices/:id/pay', async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.id);
    const { amountPaid, lateFeeApplied, method, totalRequired } = req.body;
    
    // Inyectar el pago en el historial de la factura
    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        method: method || 'CASH',
        amountPaid: parseFloat(amountPaid),
        lateFeeApplied: parseFloat(lateFeeApplied) || 0,
        userId: req.user.id
      }
    });

    // Recalcular saldo iterando todos los pagos historicos
    const allPayments = await prisma.payment.findMany({ where: { invoiceId } });
    const totalGathered = allPayments.reduce((acc, p) => acc + p.amountPaid, 0);
    
    // Comparar contra la meta enviada por el front (o originalAmount si falta)
    const requiredTarget = totalRequired ? parseFloat(totalRequired) : 9999999;
    const finalStatus = totalGathered >= requiredTarget ? 'PAID' : 'PARTIAL';

    const invoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: finalStatus }
    });
    
    res.json({ message: `Factura cobrada (${finalStatus})`, invoice });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al procesar pago' });
  }
});

// 5. Mercado Pago Preferences
app.post('/api/invoices/:id/mercadopago', async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.id);
    const { totalAmount } = req.body;
    
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { client: true }
    });
    
    if(!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
    
    // Si no hay Token real configurado, devolvemos un link de prueba para que WhatsApp siga funcionando
    if (!process.env.MP_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN === '') {
      return res.json({ init_point: `https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=DEMO-SIMULACION-${invoice.id}` });
    }

    const preference = new Preference(clientMP);
    const prefs = await preference.create({
      body: {
        items: [
          {
            id: `INV-${invoice.id}`,
            title: `Abono de Internet TK${String(invoice.clientId).padStart(3,'0')} - ${invoice.month}/${invoice.year}`,
            quantity: 1,
            unit_price: parseFloat(totalAmount)
          }
        ],
        payer: {
          name: invoice.client.name,
          email: invoice.client.email || 'test@test.com',
        },
        back_urls: {
          success: "https://interfast-backend.vercel.app/invoices",
          failure: "https://interfast-backend.vercel.app/invoices",
        },
        auto_return: "approved",
        external_reference: invoice.id.toString(),
        notification_url: "https://interfast-backend-95ww.onrender.com/api/mercadopago/webhook"
      }
    });

    res.json({ init_point: prefs.init_point });
  } catch (error) {
    console.error('Error MP:', error);
    res.status(500).json({ error: 'Error al generar link de Mercado Pago' });
  }
});

// 6. Mercado Pago Webhook
app.post('/api/mercadopago/webhook', async (req, res) => {
  // Respondemos 200 rápido a MercadoPago
  res.sendStatus(200);

  try {
    const topic = req.query.topic || req.body.type;
    const paymentId = req.query.id || req.body?.data?.id;

    if (topic === 'payment' && paymentId) {
      // 1. Ir a MP y preguntar los detalles de ese pago
      const { data: mpPayment } = await axios.get(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` }
      });

      if (mpPayment.status === 'approved') {
        const invoiceId = parseInt(mpPayment.external_reference);
        if (!invoiceId) return;

        // 2. Verificar si en nuestra DB existe y está pendiente
        const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
        if (invoice && invoice.status !== 'PAID') {
          // 3. Crear el recibo histórico
          await prisma.payment.create({
            data: {
              invoiceId: invoiceId,
              method: 'TRANSFER', // Se asume Transferencia/Digital
              amountPaid: mpPayment.transaction_amount,
              lateFeeApplied: 0,
              userId: 1 // Admin o bot
            }
          });
          
          // 4. Marcar factura como pagada
          await prisma.invoice.update({
             where: { id: invoiceId },
             data: { status: 'PAID' }
          });
          console.log(`✅ Webhook MP: Factura ${invoiceId} cobrada con éxito.`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error Webhook MP:', error.message);
  }
});

// --- REPORTS AND ANALYTICS ---
app.get('/api/reports/sales', async (req, res) => {
  try {
    const { month, year } = req.query;
    let paymentFilter = {};
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      paymentFilter.paymentDate = { gte: startDate, lte: endDate };
    }

    const payments = await prisma.payment.findMany({
      where: paymentFilter,
      include: {
        invoice: {
          include: { client: { include: { plan: true } } }
        }
      },
      orderBy: { paymentDate: 'desc' }
    });

    const totalCollectedFromInvoices = payments.reduce((acc, p) => acc + p.amountPaid, 0);
    const totalLateFees = payments.reduce((acc, p) => acc + p.lateFeeApplied, 0);

    let invoiceFilter = { status: 'PENDING' };
    if (month && year) {
      invoiceFilter.month = parseInt(month);
      invoiceFilter.year = parseInt(year);
    }
    const pendingInvoices = await prisma.invoice.findMany({ where: invoiceFilter });
    const pendingAmount = pendingInvoices.reduce((acc, i) => acc + i.originalAmount, 0);

    const activeClients = await prisma.client.count({ where: { status: 'ACTIVE' } });

    // Sumar y restar los Movimientos de Caja manuales
    let cashFilter = {};
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      cashFilter.createdAt = { gte: startDate, lte: endDate };
    }
    const cashMovements = await prisma.cashMovement.findMany({ where: cashFilter });
    
    const manualIn = cashMovements.filter(m => m.type === 'IN').reduce((acc, m) => acc + m.amount, 0);
    const manualOut = cashMovements.filter(m => m.type === 'OUT').reduce((acc, m) => acc + m.amount, 0);
    const absoluteTotalCaja = totalCollectedFromInvoices + manualIn - manualOut;

    res.json({
      metrics: {
        paymentsCount: payments.length,
        totalCollected: absoluteTotalCaja,
        totalLateFees,
        pendingAmount,
        pendingCount: pendingInvoices.length,
        activeClients
      },
      payments
    });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Error consultando metricas de ventas' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Servidor CRM corriendo en http://localhost:${PORT}`);
});
