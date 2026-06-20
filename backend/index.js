const tls = require('tls');
tls.DEFAULT_CIPHERS = 'DEFAULT@SECLEVEL=0'; // Fix for AFIP's small DH keys

// Fix for Prisma BigInt serialization
BigInt.prototype.toJSON = function () {
  return Number(this);
};

const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const cron = require('node-cron');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = require('@whiskeysockets/baileys');
const pino = require('pino');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mikrotik = require('./mikrotik');
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabaseStorage = null;
if (supabaseUrl && supabaseKey) {
  supabaseStorage = createClient(supabaseUrl, supabaseKey);
}

// AFIP Configuration
const Afip = require('@afipsdk/afip.js');
let afip = null;
try {
  // Los certificados deben estar en la carpeta /afip_certs con los nombres 'cert' y 'key'
  afip = new Afip({
    CUIT: 30717010554,
    res_folder: './afip_certs/',
    production: true // Cambiado a true para producción
  });
  console.log('AFIP Module Loaded para CUIT: 30717010554 (Producción)');
} catch (e) {
  console.error('Error inicializando AFIP:', e.message);
}

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;

// Mercado Pago Auth
let clientMP = null;
if (process.env.MP_ACCESS_TOKEN) {
  clientMP = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
}

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
  const apiKey = req.headers['x-api-key'];

  if (apiKey && process.env.N8N_API_KEY && apiKey === process.env.N8N_API_KEY) {
    req.user = { role: 'N8N_BOT' };
    return next();
  }

  if (!token) return res.status(401).json({ error: 'Acceso Denegado. Faltan Credenciales JWT o API Key.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token Inválido o Expirado.' });
    req.user = user;
    next();
  });
};

app.use(cors());
app.use(express.json());

app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth/login') || req.path.startsWith('/test-afip') || req.path.startsWith('/test-ptosventa') || req.path.startsWith('/mercadopago/webhook') || req.path.startsWith('/admin/fix-invoices') || req.path.startsWith('/mikrotik/test') || req.path.startsWith('/leads')) return next();
  return authenticateToken(req, res, next);
});

// WhatsApp Headless Client variables
let waStatus = 'DISCONNECTED';
let waQrCode = null;
let waSocket = null;

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`📱 Inicializando cliente de WhatsApp (Baileys v${version.join('.')})...`);

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: Browsers.macOS('Desktop')
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      waStatus = 'QR_READY';
      waQrCode = qr; // Baileys produces raw strings for QR, perfectly compatible with our react QRCodeSVG
      console.log('📱 WhatsApp Web requiere escanear nuevo Código QR.');
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('📱 WhatsApp Desconectado. Razón:', lastDisconnect.error?.message, '| Reconectar:', shouldReconnect);
      waStatus = 'DISCONNECTED';
      if (shouldReconnect) {
        setTimeout(connectToWhatsApp, 3000);
      } else {
        console.log('📱 Sesión cerrada.');
      }
    } else if (connection === 'open') {
      waStatus = 'CONNECTED';
      waQrCode = null;
      console.log('📱 WhatsApp Web Headless Client está LISTO y conectado (Baileys)!');
    }
  });

  waSocket = sock;
}

connectToWhatsApp().catch(err => console.log("Error FATAL Baileys:", err));

// --- CRON JOBS ---
async function generateCutoffList() {
  console.log('⏳ Ejecutando: Generación de Lista de Cortes de Servicio...');
  try {
    const pendingInvoices = await prisma.invoice.findMany({
      where: { status: 'PENDING' },
      include: { client: true }
    });

    let count = 0;
    for (const inv of pendingInvoices) {
      const existingCutoff = await prisma.cutoffList.findFirst({
        where: { clientId: inv.clientId, invoiceId: inv.id, status: 'PENDING' }
      });

      if (!existingCutoff) {
        await prisma.cutoffList.create({
          data: { clientId: inv.clientId, invoiceId: inv.id, status: 'PENDING' }
        });
        
        if (inv.client && inv.client.ipNumber && inv.client.mainNode) {
          try {
            await prisma.client.update({
              where: { id: inv.clientId },
              data: { status: 'SUSPENDED' }
            });
            await mikrotik.addIpToCutoffList(inv.client.ipNumber, inv.client.mainNode);
          } catch (err) {
            const msg = err.message || JSON.stringify(err);
            console.error(`Error enviando corte al Mikrotik para IP ${inv.client.ipNumber}:`, msg);
          }
        }
        
        count++;
      }
    }
    console.log(`✅ Finalizado: Se agregaron ${count} clientes a la lista de cortes.`);
    return count;
  } catch (error) {
    console.error('❌ Error en Generación de Cortes:', error);
    throw error;
  }
}

cron.schedule('0 8 22 * *', () => {
  generateCutoffList();
});

// --- ROUTES ---

app.post('/api/cutoffs/force', async (req, res) => {
  try {
    const count = await generateCutoffList();
    res.json({ message: `Escaneo completado. Se agregaron ${count} clientes morosos a la lista.` });
  } catch (error) {
    res.status(500).json({ error: 'Error al generar la lista de cortes' });
  }
});

// 0.2 Cortes de Servicio (Cutoff List)
app.get('/api/cutoffs', async (req, res) => {
  try {
    const cutoffs = await prisma.cutoffList.findMany({
      include: {
        client: { include: { plan: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(cutoffs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener lista de cortes' });
  }
});

app.post('/api/cutoffs/remove/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const cutoff = await prisma.cutoffList.update({
      where: { id },
      data: { status: 'RESOLVED' },
      include: { client: true }
    });
    
    if (cutoff.client && cutoff.client.ipNumber && cutoff.client.mainNode) {
      try {
        await prisma.client.update({
          where: { id: cutoff.clientId },
          data: { status: 'ACTIVE' }
        });
        await mikrotik.removeIpFromCutoffList(cutoff.client.ipNumber, cutoff.client.mainNode);
      } catch (err) {
        const msg = err.message || JSON.stringify(err);
        console.error(`Error removiendo IP ${cutoff.client.ipNumber} del Mikrotik:`, msg);
      }
    }
    
    res.json({ message: 'Cliente eximido de la lista de cortes.', cutoff });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eximir cliente' });
  }
});

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
  } catch (err) {
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

app.get('/api/test-afip', async (req, res) => {
  if (!afip) return res.json({ error: 'AFIP module is null' });
  try {
    const status = await afip.ElectronicBilling.getServerStatus();
    res.json({ success: true, status });
  } catch (err) {
    console.error("Test AFIP Error:", err);
    res.json({ 
      success: false, 
      message: err.message, 
      stack: err.stack,
      response: err.response ? {
        status: err.response.status,
        data: err.response.data
      } : null
    });
  }
});

app.get('/api/test-ptosventa', async (req, res) => {
  if (!afip) return res.json({ error: 'AFIP module is null' });
  try {
    const ptos = await afip.ElectronicBilling.getSalesPoints();
    res.json({ success: true, ptos });
  } catch (err) {
    res.json({ success: false, message: err.message, stack: err.stack });
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
    const { dni, name, businessName, email, phone, phone2, observation, address, fiscalAddress, city, province, zipCode, mainNode, panelId, ipNumber, planId, cuit, taxCondition, status, hasRouter, hasMast, registrationDate } = req.body;

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

    let parsedRegistrationDate = null;
    if (registrationDate) {
      parsedRegistrationDate = new Date(registrationDate);
    }

    const dataPayload = { dni, name, businessName, email, phone, phone2, observation, address, fiscalAddress, city, province, zipCode, mainNode, panelId, ipNumber, planId, cuit, taxCondition, status: status || 'ACTIVE', hasRouter, hasMast, registrationDate: parsedRegistrationDate };
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
    const { dni, name, businessName, email, phone, phone2, observation, address, fiscalAddress, city, province, zipCode, mainNode, panelId, ipNumber, planId, cuit, taxCondition, status, hasRouter, hasMast, registrationDate } = req.body;
    
    let parsedRegistrationDate = null;
    if (registrationDate) {
      parsedRegistrationDate = new Date(registrationDate);
    }

    const client = await prisma.client.update({
      where: { id: parseInt(req.params.id) },
      data: { dni, name, businessName, email, phone, phone2, observation, address, fiscalAddress, city, province, zipCode, mainNode, panelId, ipNumber, planId, cuit, taxCondition, status, hasRouter, hasMast, registrationDate: parsedRegistrationDate },
    });
    res.json(client);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al editar cliente' });
  }
});

app.put('/api/clients/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const client = await prisma.client.update({
      where: { id: parseInt(req.params.id) },
      data: { status },
    });
    
    // Si se pasa a SUSPENDED, mandamos al Mikrotik a Morosos. Si es ACTIVE, lo sacamos.
    if (client.ipNumber && client.mainNode) {
      if (status === 'SUSPENDED') {
        try { await mikrotik.addIpToCutoffList(client.ipNumber, client.mainNode); } catch (e) { console.error('Mikrotik suspend error', e.message || JSON.stringify(e)); }
      } else if (status === 'ACTIVE') {
        try { await mikrotik.removeIpFromCutoffList(client.ipNumber, client.mainNode); } catch (e) { console.error('Mikrotik restore error', e.message || JSON.stringify(e)); }
      }
    }
    
    res.json(client);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al cambiar estado' });
  }
});

app.get('/api/clients/:id/ping', async (req, res) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!client) {
      return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    }

    if (!client.ipNumber || !client.mainNode) {
      return res.status(400).json({ success: false, error: 'El cliente no tiene IP o Nodo asignado' });
    }

    const pingResult = await mikrotik.pingIp(client.ipNumber, client.mainNode);
    res.json(pingResult);
  } catch (error) {
    console.error('Error in /ping endpoint:', error);
    res.status(500).json({ success: false, error: 'Error interno al procesar el ping' });
  }
});

app.get('/api/mikrotik/test/:nodeName', async (req, res) => {
  try {
    const conn = await mikrotik.connectToMikrotik(req.params.nodeName);
    conn.client.close();
    res.json({ success: true, message: 'Conexión al router Mikrotik establecida con éxito.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- NODES ROUTES ---
app.get('/api/nodes', async (req, res) => {
  try {
    const nodes = await prisma.node.findMany({ orderBy: { name: 'asc' } });
    res.json(nodes);
  } catch (error) { res.status(500).json({ error: 'Error fetching nodes' }); }
});
app.post('/api/nodes', async (req, res) => {
  try {
    const node = await prisma.node.create({ data: req.body });
    res.json(node);
  } catch (error) { res.status(500).json({ error: error.message }); }
});
app.put('/api/nodes/:id', async (req, res) => {
  try {
    const node = await prisma.node.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.json(node);
  } catch (error) { res.status(500).json({ error: error.message }); }
});
app.delete('/api/nodes/:id', async (req, res) => {
  try {
    await prisma.node.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/clients/bulk', async (req, res) => {
  try {
    const { clients } = req.body;
    if (!clients || !Array.isArray(clients)) {
      return res.status(400).json({ error: 'Formato inválido. Se esperaba un array de clientes.' });
    }

    const created = await prisma.client.createMany({
      data: clients.map(c => ({
        dni: c.dni,
        name: c.name,
        businessName: c.businessName || null,
        email: c.email || null,
        phone: c.phone || null,
        phone2: c.phone2 || null,
        observation: c.observation || null,
        address: c.address || null,
        fiscalAddress: c.fiscalAddress || null,
        city: c.city || null,
        province: c.province || null,
        zipCode: c.zipCode || null,
        mainNode: c.mainNode || null,
        panelId: c.panelId || null,
        ipNumber: c.ipNumber || null,
        cuit: c.cuit || null,
        taxCondition: c.taxCondition || 'CONSUMIDOR_FINAL',
        status: c.status || 'ACTIVE',
        hasRouter: c.hasRouter || false,
        hasMast: c.hasMast || false,
        planId: c.planId || null,
        registrationDate: c.registrationDate ? new Date(c.registrationDate) : null
      }))
    });

    res.json({ message: `${created.count} clientes importados con éxito.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al importar clientes masivamente' });
  }
});

// --- Bajas (Cancellations) ---
app.get('/api/bajas', async (req, res) => {
  try {
    const bajas = await prisma.cancellationRequest.findMany({
      include: { client: true },
      orderBy: { requestedAt: 'desc' }
    });
    res.json(bajas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener bajas' });
  }
});

app.post('/api/bajas', async (req, res) => {
  try {
    const { clientId, reason } = req.body;
    if (!clientId) return res.status(400).json({ error: 'Falta clientId' });
    const baja = await prisma.cancellationRequest.create({
      data: {
        clientId: parseInt(clientId),
        reason
      }
    });
    res.json(baja);
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar la solicitud de baja' });
  }
});

app.put('/api/bajas/:id/confirm', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const baja = await prisma.cancellationRequest.update({
      where: { id },
      data: { status: 'CONFIRMED', resolvedAt: new Date() },
      include: { client: true }
    });
    if (baja.clientId) {
      await prisma.client.update({
        where: { id: baja.clientId },
        data: { status: 'BAJA' }
      });
    }
    res.json(baja);
  } catch (error) {
    res.status(500).json({ error: 'Error al confirmar la baja' });
  }
});

app.put('/api/bajas/:id/restore', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const baja = await prisma.cancellationRequest.update({
      where: { id },
      data: { status: 'RESTORED', resolvedAt: new Date() },
      include: { client: true }
    });
    if (baja.clientId) {
      await prisma.client.update({
        where: { id: baja.clientId },
        data: { status: 'ACTIVE' }
      });
    }
    res.json(baja);
  } catch (error) {
    res.status(500).json({ error: 'Error al restablecer la baja' });
  }
});

app.delete('/api/bajas/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.cancellationRequest.delete({ where: { id } });
    res.json({ message: 'Solicitud de baja eliminada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar la solicitud de baja' });
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
    const { clientId, status } = req.query;
    let whereClause = {};
    if (clientId) whereClause.clientId = parseInt(clientId);
    if (status) whereClause.status = status;

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
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
    let currentMonth = now.getMonth() + 1;
    let currentYear = now.getFullYear();

    // Si facturamos después del 25, es para el mes que viene
    if (now.getDate() >= 25) {
      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
    }

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

// Endpoint para corte masivo de morosos (ejecución manual)
app.post('/api/invoices/mass-cutoff', authenticateToken, async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.sendStatus(403);
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Buscar facturas PENDING del mes actual (o anteriores si se desea, pero usualmente del mes)
    // Para asegurar que cortamos a TODOS los morosos que no han pagado, buscamos todas las facturas PENDING con dueDate vencido o simplemente PENDING.
    const pendingInvoices = await prisma.invoice.findMany({
      where: {
        status: 'PENDING',
        client: { status: 'ACTIVE' } // Solo a los que no esten suspendidos ya
      },
      include: { client: true }
    });

    let suspendedCount = 0;
    const errors = [];

    for (const invoice of pendingInvoices) {
      if (invoice.client && invoice.client.ipNumber && invoice.client.mainNode) {
        try {
          // Cambiar estado en DB
          await prisma.client.update({
            where: { id: invoice.clientId },
            data: { status: 'SUSPENDED' }
          });
          
          // Enviar orden al Mikrotik
          await mikrotik.addIpToCutoffList(invoice.client.ipNumber, invoice.client.mainNode);
          suspendedCount++;
        } catch (err) {
          const msg = err.message || JSON.stringify(err);
          console.error(`Error al cortar servicio a ${invoice.client.name}:`, msg);
          errors.push({ client: invoice.client.name, error: msg });
        }
      }
    }

    res.json({ message: `Corte masivo finalizado. ${suspendedCount} clientes suspendidos.`, suspendedCount, errors });
  } catch (error) {
    console.error('Error en mass-cutoff:', error);
    res.status(500).json({ error: 'Error interno al ejecutar el corte masivo' });
  }
});

app.post('/api/invoices/:id/afip', async (req, res) => {
  if (!afip) return res.status(400).json({ error: 'Módulo ARCA/AFIP no está configurado (faltan los archivos cert/key en tu carpeta afip_certs).' });

  try {
    const invoiceId = parseInt(req.params.id);
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { client: true, payments: true }
    });

    if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
    if (invoice.status !== 'PAID') return res.status(400).json({ error: 'La factura debe estar en estado PAGADA antes de declararla en ARCA.' });
    if (invoice.afipCae) return res.status(400).json({ error: 'Operación denegada: La factura ya había sido emitida a ARCA previamente.' });

    let cbteTipo = 6; // Factura B default
    let docTipo = 99; // DNI o Consumidor Final default
    let docNro = 0;

    if (invoice.client.taxCondition === 'RESPONSABLE_INSCRIPTO' && invoice.client.cuit) {
      cbteTipo = 1; // Factura A
      docTipo = 80; // CUIT
      docNro = invoice.client.cuit.replace(/\D/g, '');
    } else if (invoice.client.dni || invoice.client.cuit) {
      const rawId = (invoice.client.cuit || invoice.client.dni).replace(/\D/g, '');
      if (rawId.length === 11) {
        docTipo = 80;
        docNro = rawId;
      } else if (rawId.length >= 7) {
        docTipo = 96; // DNI
        docNro = rawId;
      }
    }

    const puntoVenta = 2;
    const lastVoucher = await afip.ElectronicBilling.getLastVoucher(puntoVenta, cbteTipo);
    const cbteNro = lastVoucher + 1;

    // Cálculo IVA 21%
    // El importe total para AFIP debe ser lo que el cliente pagó efectivamente
    const totalAmount = invoice.payments.reduce((acc, p) => acc + p.amountPaid, 0) || invoice.originalAmount;
    const netAmount = totalAmount / 1.21;
    const ivaAmount = totalAmount - netAmount;

    const todayDateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const firstDayMonth = new Date(invoice.year, invoice.month - 1, 1).toISOString().slice(0, 10).replace(/-/g, '');
    const lastDayMonth = new Date(invoice.year, invoice.month, 0).toISOString().slice(0, 10).replace(/-/g, '');

    const data = {
      'CantReg': 1,
      'PtoVta': puntoVenta,
      'CbteTipo': cbteTipo,
      'Concepto': 2, // Servicios
      'DocTipo': docTipo,
      'DocNro': docNro,
      'CbteDesde': cbteNro,
      'CbteHasta': cbteNro,
      'CbteFch': parseInt(todayDateStr),
      'ImpTotal': parseFloat(totalAmount.toFixed(2)),
      'ImpTotConc': 0,
      'ImpNeto': parseFloat(netAmount.toFixed(2)),
      'ImpOpEx': 0,
      'ImpIVA': parseFloat(ivaAmount.toFixed(2)),
      'ImpTrib': 0,
      'FchServDesde': parseInt(firstDayMonth),
      'FchServHasta': parseInt(lastDayMonth),
      'FchVtoPago': parseInt(todayDateStr),
      'MonId': 'PES',
      'MonCotiz': 1,
      'Iva': [
        {
          'Id': 5, // 21%
          'BaseImp': parseFloat(netAmount.toFixed(2)),
          'Importe': parseFloat(ivaAmount.toFixed(2))
        }
      ]
    };

    const resAfip = await afip.ElectronicBilling.createVoucher(data);

    // Guardar trazabilidad ARCA en DB
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        afipCae: resAfip.CAE,
        afipVtoCae: resAfip.CAEFchVto,
        afipPuntoVenta: puntoVenta,
        afipCbteTip: cbteTipo,
        afipCbteNro: cbteNro
      }
    });

    res.json({ message: 'Comprobante emitido en ARCA con éxito.', cae: resAfip.CAE });
  } catch (error) {
    console.error('Error ARCA:', error);
    res.status(500).json({ error: error.message || 'Fallo de conectividad o validación en los servidores de ARCA.' });
  }
});

app.post('/api/invoices/mass-afip', async (req, res) => {
  if (!afip) return res.status(400).json({ error: 'Módulo ARCA/AFIP no está configurado (faltan los archivos cert/key).' });

  try {
    const { invoiceIds } = req.body;
    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return res.status(400).json({ error: 'No se enviaron facturas para procesar.' });
    }

    const invoices = await prisma.invoice.findMany({
      where: { id: { in: invoiceIds } },
      include: { client: true, payments: true }
    });

    let successCount = 0;
    let failCount = 0;
    let errors = [];

    // Facturar iterativamente, uno a uno, para evitar choques en el CbteNro autoincremental de la AFIP
    for (const invoice of invoices) {
      try {
        if (invoice.status !== 'PAID') throw new Error('No está en estado Pagada');
        if (invoice.afipCae) throw new Error('Ya fue emitida a ARCA');

        let cbteTipo = 6;
        let docTipo = 99;
        let docNro = 0;

        if (invoice.client.taxCondition === 'RESPONSABLE_INSCRIPTO' && invoice.client.cuit) {
          cbteTipo = 1;
          docTipo = 80;
          docNro = invoice.client.cuit.replace(/\D/g, '');
        } else if (invoice.client.dni || invoice.client.cuit) {
          const rawId = (invoice.client.cuit || invoice.client.dni).replace(/\D/g, '');
          if (rawId.length === 11) {
            docTipo = 80; docNro = rawId;
          } else if (rawId.length >= 7) {
            docTipo = 96; docNro = rawId;
          }
        }

        const puntoVenta = 2;
        const lastVoucher = await afip.ElectronicBilling.getLastVoucher(puntoVenta, cbteTipo);
        const cbteNro = lastVoucher + 1;

        const totalAmount = invoice.payments.reduce((acc, p) => acc + p.amountPaid, 0) || invoice.originalAmount;
        const netAmount = totalAmount / 1.21;
        const ivaAmount = totalAmount - netAmount;

        const todayDateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const firstDayMonth = new Date(invoice.year, invoice.month - 1, 1).toISOString().slice(0, 10).replace(/-/g, '');
        const lastDayMonth = new Date(invoice.year, invoice.month, 0).toISOString().slice(0, 10).replace(/-/g, '');

        const data = {
          'CantReg': 1, 'PtoVta': puntoVenta, 'CbteTipo': cbteTipo, 'Concepto': 2, 'DocTipo': docTipo,
          'DocNro': docNro, 'CbteDesde': cbteNro, 'CbteHasta': cbteNro, 'CbteFch': parseInt(todayDateStr),
          'ImpTotal': parseFloat(totalAmount.toFixed(2)), 'ImpTotConc': 0, 'ImpNeto': parseFloat(netAmount.toFixed(2)),
          'ImpOpEx': 0, 'ImpIVA': parseFloat(ivaAmount.toFixed(2)), 'ImpTrib': 0,
          'FchServDesde': parseInt(firstDayMonth), 'FchServHasta': parseInt(lastDayMonth), 'FchVtoPago': parseInt(todayDateStr),
          'MonId': 'PES', 'MonCotiz': 1,
          'Iva': [{ 'Id': 5, 'BaseImp': parseFloat(netAmount.toFixed(2)), 'Importe': parseFloat(ivaAmount.toFixed(2)) }]
        };

        const resAfip = await afip.ElectronicBilling.createVoucher(data);

        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { afipCae: resAfip.CAE, afipVtoCae: resAfip.CAEFchVto, afipPuntoVenta: puntoVenta, afipCbteTip: cbteTipo, afipCbteNro: cbteNro }
        });

        successCount++;
      } catch (err) {
        failCount++;
        errors.push(`Factura del cliente ${invoice.client.name}: ${err.message}`);
      }
    }

    res.json({
      message: `Lote completado. Éxitos: ${successCount}, Errores: ${failCount}`,
      successCount,
      failCount,
      errors
    });

  } catch (error) {
    console.error('Error ARCA Masivo:', error);
    res.status(500).json({ error: 'Fallo general procesando comprobantes AFIP masivos.' });
  }
});

app.delete('/api/invoices/:id', async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.id);

    // Verificar si existe y su estado
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId }
    });

    if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });

    if (invoice.status === 'PAID') {
      return res.status(400).json({ error: 'No se puede eliminar una factura que figura como PAGADA. Esta acción afectaría la caja general.' });
    }

    // Si la factura tiene pagos parciales, eliminarlos por Foreign Key antes de borrarla
    await prisma.payment.deleteMany({
      where: { invoiceId: invoiceId }
    });

    await prisma.invoice.delete({
      where: { id: invoiceId }
    });

    res.json({ message: 'Factura anulada y eliminada correctamente.' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: 'Error al eliminar factura' });
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
      if (phone.length < 8) continue;

      const targetPhone = phone.startsWith('54') ? `${phone}@s.whatsapp.net` : `549${phone}@s.whatsapp.net`;

      const today = new Date();
      let totalAmountWithFee = inv.priceV1 || inv.originalAmount;
      let expirationDate = new Date(inv.dueDate1 || inv.dueDate);
      expirationDate.setHours(23, 59, 59, 999);

      if (inv.dueDate1) {
        const d1 = new Date(inv.dueDate1); d1.setHours(23, 59, 59, 999);
        const d2 = new Date(inv.dueDate2 || inv.dueDate1); d2.setHours(23, 59, 59, 999);
        const d3 = new Date(inv.dueDate3 || inv.dueDate1); d3.setHours(23, 59, 59, 999);

        if (today > d2 && inv.priceV3) {
          totalAmountWithFee = inv.priceV3;
          expirationDate = d3;
        } else if (today > d1 && inv.priceV2) {
          totalAmountWithFee = inv.priceV2;
          expirationDate = d2;
        } else {
          expirationDate = d1;
        }
      }

      let paymentLink = '';
      if (!process.env.MP_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN === '') {
        paymentLink = `https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=DEMO-SIMULACION-${inv.id}`;
      } else {
        const preference = new Preference(clientMP);
        const prefBody = {
          items: [{ id: `INV-${inv.id}`, title: `Internet TK${String(inv.clientId).padStart(3, '0')}`, quantity: 1, unit_price: parseFloat(totalAmountWithFee) }],
          payer: { name: inv.client.name, email: inv.client.email || 'test@test.com' },
          external_reference: inv.id.toString(),
          notification_url: "https://interfast-backend-95ww.onrender.com/api/mercadopago/webhook"
        };
        
        if (expirationDate && expirationDate >= today) {
          prefBody.expires = true;
          prefBody.expiration_date_to = expirationDate.toISOString();
        }

        const prefs = await preference.create({ body: prefBody });
        paymentLink = prefs.init_point;
      }

      const message = `Hola ${inv.client.name}! 👋🏻\n\nTe informamos que implementamos un nuevo sistema de gestión y facturación para mejorar nuestro servicio. Te acercamos el detalle de tu factura de Internet (Período: ${inv.month}/${inv.year}).\n\nEl total a abonar es de *$${totalAmountWithFee.toFixed(2)}*.\n\nAhora puedes saldar tu cuenta de forma rápida y 100% segura con Mercado Pago en nuestro nuevo enlace oficial:\n${paymentLink}\n\n¡Gracias por tu pago!`;

      if (waSocket) await waSocket.sendMessage(targetPhone, { text: message });
      
      await prisma.invoice.update({
        where: { id: inv.id },
        data: { notifiedAt: new Date() }
      });
      
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
  } catch (err) {
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
  } catch (err) {
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
  } catch (err) {
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
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

// --- TICKETS AND SUPPORT ---
app.get('/api/tickets', async (req, res) => {
  try {
    const tickets = await prisma.ticket.findMany({
      include: {
        client: true,
        history: { orderBy: { createdAt: 'desc' } }
      },
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
      data: {
        clientId: parseInt(clientId),
        title,
        description,
        priority: priority || 'NORMAL',
        history: {
          create: { action: 'CREADO', notes: 'Ticket abierto.' }
        }
      },
      include: {
        client: true,
        history: { orderBy: { createdAt: 'desc' } }
      }
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
    const { status, title, description, priority, scheduledAt, routerProvided, mastProvided, statusAction, resolutionNotes } = req.body;
    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;

    // Novedades
    if (scheduledAt !== undefined) updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    if (routerProvided !== undefined) updateData.routerProvided = routerProvided;
    if (mastProvided !== undefined) updateData.mastProvided = mastProvided;

    if (statusAction) {
      updateData.history = {
        create: {
          action: statusAction,
          notes: resolutionNotes || ''
        }
      };
    }

    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
      include: {
        client: true,
        history: { orderBy: { createdAt: 'desc' } }
      }
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
    
    // Primero eliminamos el historial del ticket para evitar el error de clave foránea (Foreign Key constraint)
    await prisma.ticketHistory.deleteMany({
      where: { ticketId: ticketId }
    });

    // Luego eliminamos el ticket principal
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
      startOfDay.setHours(0, 0, 0, 0);
      endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
    }

    console.log(`Parsed Range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);

    const payments = await prisma.payment.findMany({
      where: {
        paymentDate: { gte: startOfDay, lte: endOfDay },
        method: { in: ['CASH', 'MERCADOPAGO'] } // AHORA TRAE AMBOS
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
    const { type, amount, category, description } = req.body;

    const m = await prisma.cashMovement.create({
      data: {
        type,
        amount: parseFloat(amount),
        category: category || 'GASTO_GENERAL',
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

    if (finalStatus === 'PAID') {
      await prisma.cutoffList.updateMany({
        where: { invoiceId, status: 'PENDING' },
        data: { status: 'RESOLVED' }
      });
      
      const invoiceData = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { client: true }
      });
      
      // Auto-habilitar en la BD
      if (invoiceData && invoiceData.clientId) {
        await prisma.client.update({
          where: { id: invoiceData.clientId },
          data: { status: 'ACTIVE' }
        });
      }
      if (invoiceData && invoiceData.client && invoiceData.client.ipNumber && invoiceData.client.mainNode) {
        try {
          await mikrotik.removeIpFromCutoffList(invoiceData.client.ipNumber, invoiceData.client.mainNode);
        } catch (err) {
          const msg = err.message || JSON.stringify(err);
          console.error(`Error removiendo IP del Mikrotik al pagar la factura:`, msg);
        }
      }
    }

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

    if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });

    // Determinamos caducidad exacta para prevenir que paguen días después
    const today = new Date();
    let expirationDate = new Date(invoice.dueDate);
    expirationDate.setHours(23, 59, 59, 999);

    if (invoice.dueDate1) {
      const d1 = new Date(invoice.dueDate1); d1.setHours(23, 59, 59, 999);
      const d2 = new Date(invoice.dueDate2 || invoice.dueDate1); d2.setHours(23, 59, 59, 999);
      const d3 = new Date(invoice.dueDate3 || invoice.dueDate1); d3.setHours(23, 59, 59, 999);

      if (today <= d1) expirationDate = d1;
      else if (today <= d2) expirationDate = d2;
      else if (today <= d3) expirationDate = d3;
      else expirationDate = null; // Sin vencimiento para clientes ultra atrasados
    }

    // Si no hay Token real configurado, devolvemos un link de prueba para que WhatsApp siga funcionando
    if (!process.env.MP_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN === '') {
      return res.json({ init_point: `https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=DEMO-SIMULACION-${invoice.id}` });
    }

    const preference = new Preference(clientMP);
    
    const prefBody = {
      items: [
        {
          id: `INV-${invoice.id}`,
          title: `Abono de Internet TK${String(invoice.clientId).padStart(3, '0')} - ${invoice.month}/${invoice.year}`,
          quantity: 1,
          unit_price: parseFloat(totalAmount)
        }
      ],
      payer: {
        name: invoice.client.name,
        email: invoice.client.email || 'test@test.com',
      },
      external_reference: invoice.id.toString(),
      notification_url: "https://interfast-backend-95ww.onrender.com/api/mercadopago/webhook"
    };

    // Solo agregamos caducidad si estamos dentro de los vencimientos
    if (expirationDate) {
      prefBody.expires = true;
      prefBody.expiration_date_to = expirationDate.toISOString();
    }

    const prefs = await preference.create({ body: prefBody });

    res.json({ init_point: prefs.init_point });
  } catch (error) {
    console.error('Error MP:', error);
    res.status(500).json({ error: 'Error al generar link de Mercado Pago' });
  }
});

// 5.b Mercado Pago Multi-Invoice Preferences
app.post('/api/invoices/mercadopago/multi', async (req, res) => {
  try {
    const { invoiceIds } = req.body;
    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de invoiceIds' });
    }

    const invoices = await prisma.invoice.findMany({
      where: { id: { in: invoiceIds }, status: 'PENDING' },
      include: { client: true }
    });

    if (invoices.length === 0) return res.status(404).json({ error: 'No se encontraron facturas pendientes con esos IDs' });

    // Validate they all belong to same client
    const clientId = invoices[0].clientId;
    const clientName = invoices[0].client.name;
    const clientEmail = invoices[0].client.email || 'test@test.com';
    if (!invoices.every(inv => inv.clientId === clientId)) {
      return res.status(400).json({ error: 'Las facturas pertenecen a distintos clientes' });
    }

    const today = new Date();
    let combinedTotal = 0;
    let combinedExpiration = null; 
    let hasStrictExpiration = false;

    for (const invoice of invoices) {
      let totalAmount = invoice.priceV1 || invoice.originalAmount;
      let expirationDate = new Date(invoice.dueDate);
      expirationDate.setHours(23, 59, 59, 999);

      if (invoice.dueDate1) {
        const d1 = new Date(invoice.dueDate1); d1.setHours(23, 59, 59, 999);
        const d2 = new Date(invoice.dueDate2 || invoice.dueDate1); d2.setHours(23, 59, 59, 999);
        const d3 = new Date(invoice.dueDate3 || invoice.dueDate1); d3.setHours(23, 59, 59, 999);

        if (today <= d1) {
          expirationDate = d1;
          totalAmount = invoice.priceV1 || invoice.originalAmount;
        } else if (today <= d2) {
          expirationDate = d2;
          totalAmount = invoice.priceV2 || invoice.originalAmount;
        } else if (today <= d3) {
          expirationDate = d3;
          totalAmount = invoice.priceV3 || invoice.originalAmount;
        } else {
          expirationDate = null;
          totalAmount = invoice.priceV3 || invoice.originalAmount;
        }
      }

      combinedTotal += totalAmount;

      if (expirationDate !== null) {
        if (!hasStrictExpiration || (combinedExpiration && expirationDate < combinedExpiration)) {
          combinedExpiration = expirationDate;
          hasStrictExpiration = true;
        }
      }
    }

    if (!process.env.MP_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN === '') {
      return res.json({ init_point: `https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=DEMO-MULTI-${invoiceIds.join('-')}` });
    }

    const preference = new Preference(clientMP);
    
    const prefBody = {
      items: [
        {
          id: `INV-MULTI-${clientId}`,
          title: `Abonos de Internet TK${String(clientId).padStart(3, '0')} (${invoices.length} facturas)`,
          quantity: 1,
          unit_price: parseFloat(combinedTotal)
        }
      ],
      payer: {
        name: clientName,
        email: clientEmail,
      },
      external_reference: `MULTI-${invoiceIds.join('-')}`,
      notification_url: "https://interfast-backend-95ww.onrender.com/api/mercadopago/webhook"
    };

    if (hasStrictExpiration && combinedExpiration) {
      prefBody.expires = true;
      prefBody.expiration_date_to = combinedExpiration.toISOString();
    }

    const prefs = await preference.create({ body: prefBody });

    res.json({ init_point: prefs.init_point, totalAmount: combinedTotal, invoiceIds });
  } catch (error) {
    console.error('Error MP Multi:', error);
    res.status(500).json({ error: 'Error al generar link multi de Mercado Pago' });
  }
});

// 6. Mercado Pago Webhook
app.post('/api/mercadopago/webhook', async (req, res) => {
  // Respondemos 200 rápido a MercadoPago para que no reintente
  res.sendStatus(200);

  try {
    // Extracción ultra-robusta de los IDs sin importar la versión del SDK
    const topic = req.query.topic || req.query.type || req.body?.type || req.body?.action;
    let paymentId = req.query['data.id'] || req.query.id || req.body?.data?.id;
    if (!paymentId && req.body?.id && topic === 'payment.created') paymentId = req.body.id;

    console.log(`🔔 Webhook MP DISPARADO: topic=${topic}, ID detectado=${paymentId}`);

    if ((topic === 'payment' || topic === 'payment.created') && paymentId && clientMP) {
      // 1. Ir a MP y preguntar los detalles reales del pago por seguridad
      const payment = new Payment(clientMP);
      const mpPayment = await payment.get({ id: paymentId });
      console.log(`⏳ Webhook MP: Leyendo status del pago en la API -> Estado: ${mpPayment.status}, Referencia: ${mpPayment.external_reference}`);

      if (mpPayment.status === 'approved') {
        const ref = mpPayment.external_reference || '';
        let invoiceIdsToProcess = [];

        if (ref.startsWith('MULTI-')) {
          invoiceIdsToProcess = ref.replace('MULTI-', '').split('-').map(id => parseInt(id)).filter(id => !isNaN(id));
        } else {
          const singleId = parseInt(ref);
          if (!isNaN(singleId)) invoiceIdsToProcess.push(singleId);
        }

        if (invoiceIdsToProcess.length === 0) {
          console.error(`❌ Webhook MP: Pago rechazado localmente. Referencia inválida o vacía (${ref}).`);
          return;
        }

        const transactionAmount = parseFloat(mpPayment.transaction_amount) || 0;
        let remainingAmount = transactionAmount;

        for (const invoiceId of invoiceIdsToProcess) {
          // 2. Transacción atómica: Intentar actualizar la factura SOLO si está PENDING
          const updatedInvoice = await prisma.invoice.updateMany({
            where: { id: invoiceId, status: 'PENDING' },
            data: { status: 'PAID' }
          });

          if (updatedInvoice.count === 0) {
            console.log(`⚠️ Webhook MP: La factura ${invoiceId} ya estaba PAGADA o en proceso. Se omitió la duplicación atómica.`);
            continue;
          }

          // Si pasó la verificación atómica, procedemos a crear el pago
          const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
          const amountToLog = invoiceIdsToProcess.length === 1 ? transactionAmount : (invoice ? invoice.originalAmount : transactionAmount);

            let mpFee = 0;
            let mpTax = 0;
            if (mpPayment.fee_details && Array.isArray(mpPayment.fee_details)) {
              mpPayment.fee_details.forEach(fee => {
                if (fee.type === 'mercadopago_fee') {
                  mpFee += parseFloat(fee.amount) || 0;
                } else {
                  mpTax += parseFloat(fee.amount) || 0;
                }
              });
            }

            // 3. Crear el recibo histórico (Clasificado estrictamente como MERCADOPAGO)
            await prisma.payment.create({
              data: {
                invoiceId: invoiceId,
                method: 'MERCADOPAGO',
                amountPaid: amountToLog,
                mpFee: mpFee,
                mpTax: mpTax,
                lateFeeApplied: 0
              }
            });

            await prisma.cutoffList.updateMany({
              where: { invoiceId: invoiceId, status: 'PENDING' },
              data: { status: 'RESOLVED' }
            });
            
            const invoiceData = await prisma.invoice.findUnique({
              where: { id: invoiceId },
              include: { client: true }
            });

            // Auto-habilitar en la BD
            if (invoiceData && invoiceData.clientId) {
              await prisma.client.update({
                where: { id: invoiceData.clientId },
                data: { status: 'ACTIVE' }
              });
            }
            if (invoiceData && invoiceData.client && invoiceData.client.ipNumber && invoiceData.client.mainNode) {
              try {
                await mikrotik.removeIpFromCutoffList(invoiceData.client.ipNumber, invoiceData.client.mainNode);
              } catch (err) {
                const msg = err.message || JSON.stringify(err);
                console.error(`Error removiendo IP del Mikrotik (Webhook MP):`, msg);
              }
            }

            
            console.log(`✅ Webhook MP: Factura N°${invoiceId} cobrada, registrada como MERCADOPAGO y cerrada.`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error fatal en Webhook MP:', error.message || error);
  }
});

// --- REPORTS AND ANALYTICS ---
app.get('/api/reports/sales', async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        invoice: {
          include: { client: { include: { plan: true } } }
        }
      },
      orderBy: { paymentDate: 'desc' }
    });

    const movements = await prisma.cashMovement.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const totalCollectedFromInvoices = payments.reduce((acc, p) => acc + p.amountPaid, 0);
    const totalMpFees = payments.reduce((acc, p) => acc + (p.mpFee || 0) + (p.mpTax || 0), 0);
    const totalLateFees = payments.reduce((acc, p) => acc + p.lateFeeApplied, 0);

    const manualIn = movements.filter(m => m.type === 'IN').reduce((acc, m) => acc + m.amount, 0);
    const manualOut = movements.filter(m => m.type === 'OUT').reduce((acc, m) => acc + m.amount, 0);
    
    const totalBruto = totalCollectedFromInvoices + manualIn;
    const totalEgresos = manualOut + totalMpFees;
    const totalNeto = totalBruto - totalEgresos;

    const pendingInvoices = await prisma.invoice.findMany({ where: { status: 'PENDING' } });
    const pendingAmount = pendingInvoices.reduce((acc, i) => acc + i.originalAmount, 0);

    const activeClients = await prisma.client.count({ where: { status: 'ACTIVE' } });

    res.json({
      metrics: {
        totalCollected: totalNeto, // Retro-compatibilidad (ahora es el Neto real)
        totalBruto,
        totalEgresos,
        totalNeto,
        paymentsCount: payments.length,
        totalLateFees,
        pendingAmount,
        pendingCount: pendingInvoices.length,
        activeClients
      },
      payments,
      movements
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener reportes' });
  }
});

app.get('/api/admin/fix-invoices', async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { status: 'PENDING' },
      include: { client: { include: { plan: true } } }
    });

    let count = 0;
    for (const inv of invoices) {
      if (inv.client.plan) {
        const plan = inv.client.plan;
        const dueDate1Date = new Date(inv.year, inv.month - 1, plan.dueDate1 || 10, 23, 59, 59, 999);
        const dueDate2Date = new Date(inv.year, inv.month - 1, plan.dueDate2 || 15, 23, 59, 59, 999);
        const dueDate3Date = new Date(inv.year, inv.month - 1, plan.dueDate3 || 20, 23, 59, 59, 999);

        await prisma.invoice.update({
          where: { id: inv.id },
          data: {
            originalAmount: plan.priceV1 || plan.totalPrice,
            priceV1: plan.priceV1 || plan.totalPrice,
            dueDate1: dueDate1Date,
            dueDate: dueDate1Date,
            priceV2: plan.priceV2 || plan.totalPrice,
            dueDate2: dueDate2Date,
            priceV3: plan.priceV3 || plan.totalPrice,
            dueDate3: dueDate3Date
          }
        });
        count++;
      }
    }
    res.json({ message: `¡Éxito! Se actualizaron ${count} facturas pendientes con los nuevos precios de sus planes.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- NEW SALES & COVERAGE SYSTEM ---
app.get('/api/catalog', async (req, res) => {
  try {
    const items = await prisma.catalogItem.findMany();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el catálogo' });
  }
});

app.post('/api/catalog', async (req, res) => {
  try {
    const { name, category, price, description, isActive } = req.body;
    const item = await prisma.catalogItem.create({
      data: { name, category, price: parseFloat(price), description, isActive }
    });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear ítem del catálogo' });
  }
});

app.put('/api/catalog/:id', async (req, res) => {
  try {
    const { name, category, price, description, isActive } = req.body;
    const item = await prisma.catalogItem.update({
      where: { id: parseInt(req.params.id) },
      data: { name, category, price: parseFloat(price), description, isActive }
    });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar ítem' });
  }
});

app.delete('/api/catalog/:id', async (req, res) => {
  try {
    await prisma.catalogItem.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Ítem eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar ítem' });
  }
});

app.get('/api/settings/:key', async (req, res) => {
  try {
    const setting = await prisma.systemSettings.findUnique({
      where: { key: req.params.key }
    });
    res.json(setting || { key: req.params.key, value: '' });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener setting' });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const { key, value } = req.body;
    const setting = await prisma.systemSettings.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar setting' });
  }
});

app.get('/api/leads', async (req, res) => {
  try {
    const leads = await prisma.lead.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener prospectos' });
  }
});

app.post('/api/leads', async (req, res) => {
  try {
    const { phone, name, address, latitude, longitude, status, notes } = req.body;
    const lead = await prisma.lead.create({
      data: { phone, name, address, latitude: latitude ? parseFloat(latitude) : null, longitude: longitude ? parseFloat(longitude) : null, status: status || 'NEW', notes }
    });
    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear prospecto' });
  }
});

app.put('/api/leads/:id', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const lead = await prisma.lead.update({
      where: { id: parseInt(req.params.id) },
      data: { status }
    });
    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar prospecto' });
  }
});

app.delete('/api/leads/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.lead.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar prospecto' });
  }
});

// Content Library Endpoints
app.get('/api/content_library', authenticateToken, async (req, res) => {
  try {
    const contents = await prisma.content_library.findMany({
      where: { estado: 'Pendiente' },
      orderBy: { created_at: 'desc' }
    });
    res.json(contents);
  } catch (error) {
    console.error('CRITICAL ERROR in GET /api/content_library:', error);
    res.status(500).json({ error: 'Error al obtener contenidos' });
  }
});

app.put('/api/content_library/:id', authenticateToken, async (req, res) => {
  try {
    const { contenido_post, url_media } = req.body;
    const content = await prisma.content_library.update({
      where: { id: BigInt(req.params.id) },
      data: { contenido_post, url_media }
    });
    res.json(content);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar contenido' });
  }
});

app.put('/api/content_library/:id/aprobar', authenticateToken, async (req, res) => {
  try {
    const { contenido_post, url_media } = req.body;
    
    // 1. Update in DB
    const content = await prisma.content_library.update({
      where: { id: BigInt(req.params.id) },
      data: { estado: 'Aprobado', contenido_post, url_media }
    });

    // 2. Fire n8n Webhook
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            url_foto: content.url_media, 
            contenido: content.contenido_post, 
            tipo_media: content.tipo_media || 'imagen'
          })
        });
      } catch (webhookError) {
        console.error('Error disparando webhook a n8n:', webhookError);
        // Continue even if webhook fails
      }
    }

    res.json(content);
  } catch (error) {
    res.status(500).json({ error: 'Error al aprobar contenido' });
  }
});

app.delete('/api/content_library/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.content_library.delete({
      where: { id: BigInt(req.params.id) }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar contenido' });
  }
});

app.get('/api/sales-info', async (req, res) => {
  try {
    const catalog = await prisma.catalogItem.findMany({ where: { isActive: true } });
    const plans = await prisma.plan.findMany();
    const mapSetting = await prisma.systemSettings.findUnique({ where: { key: 'COVERAGE_POLYGONS' } });
    
    let coverageMap = [];
    if (mapSetting && mapSetting.value) {
      try {
        coverageMap = JSON.parse(mapSetting.value);
      } catch (e) {
        coverageMap = [];
      }
    }

    res.json({
      catalog,
      plans,
      coverageMap
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener sales-info' });
  }
});

// -------------------------------------------------------------
// TAREAS PROGRAMADAS (CRON JOBS)
// -------------------------------------------------------------

cron.schedule('* * * * *', async () => {
  if (!supabaseStorage) return;
  try {
    const pendingContents = await prisma.content_library.findMany({
      where: { estado: 'Pendiente' }
    });
    
    for (const content of pendingContents) {
      if (content.url_media && !content.url_media.includes('supabase.co')) {
        console.log(`[Cron] Descargando media externa para content_library ID ${content.id}...`);
        try {
          const response = await fetch(content.url_media);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const buffer = await response.arrayBuffer();
          
          const fileExtension = content.tipo_media === 'video' ? 'mp4' : 'jpg';
          const fileName = `media_${content.id}_${Date.now()}.${fileExtension}`;
          
          const { data, error } = await supabaseStorage
            .storage
            .from('content_media')
            .upload(fileName, buffer, {
              contentType: response.headers.get('content-type') || (content.tipo_media === 'video' ? 'video/mp4' : 'image/jpeg')
            });
            
          if (error) {
            console.error(`[Cron] Error subiendo archivo a Supabase:`, error);
            continue;
          }
          
          const publicUrl = supabaseStorage.storage.from('content_media').getPublicUrl(fileName).data.publicUrl;
          
          await prisma.content_library.update({
            where: { id: content.id },
            data: { url_media: publicUrl }
          });
          
          console.log(`[Cron] Archivo resguardado exitosamente para content_library ID ${content.id}: ${publicUrl}`);
        } catch (downloadError) {
          console.error(`[Cron] Error procesando archivo para content_library ID ${content.id}:`, downloadError);
        }
      }
    }
  } catch (error) {
    console.error('[Cron] Error general en el resguardo de medios:', error);
  }
});

app.get('/api/mikrotik/active-clients', async (req, res) => {
  try {
    const nodes = await prisma.node.findMany({ where: { isActive: true } });
    const allDbClients = await prisma.client.findMany({
      where: { status: 'ACTIVE' },
      include: { plan: true }
    });

    let liveClients = [];
    
    // Promise.all to fetch all nodes concurrently to save time
    const nodePromises = nodes.map(async (node) => {
      const active = await mikrotik.getMikrotikActiveClients(node.name);
      return active.map(c => ({ ...c, nodeName: node.name }));
    });

    const results = await Promise.all(nodePromises);
    results.forEach(nodeClients => {
      liveClients.push(...nodeClients);
    });

    // Cross-reference with DB
    const finalData = liveClients.map(live => {
      // Find matching client by IP
      const dbClient = allDbClients.find(c => c.ipNumber === live.ip);
      return {
        ...live,
        matched: !!dbClient,
        clientName: dbClient ? dbClient.name : 'Desconocido / No registrado',
        clientDni: dbClient ? dbClient.dni : '',
        panel: dbClient ? dbClient.panelId : 'N/A',
        planName: dbClient && dbClient.plan ? dbClient.plan.name : 'N/A',
      };
    });

    res.json(finalData);
  } catch (error) {
    console.error('Error fetching active clients:', error);
    res.status(500).json({ error: 'Error interno obteniendo clientes activos.' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
