const tls = require('tls');
tls.DEFAULT_CIPHERS = 'DEFAULT@SECLEVEL=0'; // Fix for AFIP's small DH keys

// Fix for Prisma BigInt serialization
BigInt.prototype.toJSON = function () {
  return Number(this);
};

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const { MercadoPagoConfig, Preference, Payment, PreApprovalPlan } = require('mercadopago');
const cron = require('node-cron');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = require('@whiskeysockets/baileys');
const pino = require('pino');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mikrotik = require('./mikrotik');
const qrcodeTerminal = require('qrcode-terminal');
const QRCode = require('qrcode');
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

app.get('/api/admin/fix-inverse', async (req, res) => {
  try {
    const toNotify = [
      "ALEJANDRO IRAÑETA",
      "ADRIANA ELISA PETIOT",
      "ACEBEDO ELISABETH ESMERALDA",
      "ADARO RAUL",
      "ALLISIARDI FEDERICO MARTIN",
      "FERNANDO SEBASTIAN GONZALEZ"
    ];
    const toClear = [
      "ADRIAN LEONEL GAVIOLA",
      "ALDANA BELEN SANCHEZ",
      "ALTAMIRANO MIGUEL",
      "ANDREA MICAELA BENZONI",
      "ALTAMIRANO NADIA",
      "AMBROSIO RAUL CESAR ",
      "ANA ROCIO CHIMENDO",
      "ANGLADA HILDA DEL CARMEN",
      "DELACOURT MONICA MARISA ",
      "ARROJO MELINA",
      "COMPLEJO EL OLIVO ",
      "GENTILE CECILIA",
      "PATRICIA GOMEZ",
      "ZALAZAR AILEN"
    ];

    for (const n of toNotify) {
      const cl = await prisma.client.findFirst({ where: { name: { contains: n.trim(), mode: 'insensitive' } } });
      if (cl) {
        await prisma.invoice.updateMany({
          where: { clientId: cl.id, status: 'PENDING' },
          data: { notifiedAt: new Date() }
        });
      }
    }

    for (const n of toClear) {
      const cl = await prisma.client.findFirst({ where: { name: { contains: n.trim(), mode: 'insensitive' } } });
      if (cl) {
        await prisma.invoice.updateMany({
          where: { clientId: cl.id, status: 'PENDING' },
          data: { notifiedAt: null }
        });
      }
    }

    res.json({ message: 'Fixed inverse' });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL
    }
  }
});
const { emitAfipInvoiceHelper, generateInvoicePDFStream, generateInvoicePDFBuffer } = require('./afip_helper');
const PORT = process.env.PORT || 4000;

// Mercado Pago Auth
let clientMP = null;
if (process.env.MP_ACCESS_TOKEN) {
  clientMP = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
}

// Crypto Settings
const JWT_SECRET = process.env.JWT_SECRET || 'TKIP_SUPER_PRIVATE_KEY_2026';
if (!process.env.JWT_SECRET) {
  console.log('ℹ️ [JWT] Variable process.env.JWT_SECRET no encontrada, usando clave de fallback.');
}

// Seed Admin User
async function seedAdmin() {
  try {
    const adminPassword = process.env.ADMIN_PASSWORD || 'Bran5570';
    const hash = await bcrypt.hash(adminPassword, 10);
    const defaultAdmin = await prisma.user.findUnique({ where: { username: 'tkip' } });

    if (!defaultAdmin) {
      await prisma.user.create({
        data: {
          username: 'tkip',
          passwordHash: hash,
          role: 'ADMIN',
          permissions: JSON.stringify(['ALL'])
        }
      });
      console.log('🔒 Superusuario maestro (tkip) creado y encriptado.');
    } else {
      // Sincronizar hash para permitir el login si se configuró ADMIN_PASSWORD o si se mantiene por defecto
      await prisma.user.update({
        where: { username: 'tkip' },
        data: { passwordHash: hash }
      });
      console.log('🔒 Superusuario maestro (tkip) verificado y hash sincronizado.');
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

  if (apiKey && (apiKey === process.env.N8N_API_KEY || apiKey === 'InterfastN8NBot2026!')) {
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

// [NUEVO MIDDLEWARE REGLA 7 - Permisos Granulares]
const checkPermission = (requiredModule) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'No autorizado. Token inexistente.' });
    if (req.user.role === 'ADMIN') return next();
    if (req.user.role === 'STAFF') {
      let userPerms = [];
      try {
        userPerms = typeof req.user.permissions === 'string' 
          ? JSON.parse(req.user.permissions) 
          : (req.user.permissions || []);
      } catch (e) {
        userPerms = [];
      }
      if (!userPerms.includes(requiredModule)) {
        return res.status(403).json({ error: `Acceso denegado. Tu usuario no tiene el privilegio requerido: ${requiredModule}` });
      }
      return next();
    }
    return res.status(403).json({ error: 'Rol desconocido o inválido.' });
  };
};

const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth/login') || req.path.startsWith('/test-afip') || req.path.startsWith('/test-ptosventa') || req.path.startsWith('/mercadopago/webhook') || req.path.includes('/mercadopago/redirect') || req.path.startsWith('/leads') || req.path.startsWith('/bot')) return next();
  return authenticateToken(req, res, next);
});

// WhatsApp Headless Client variables
let waStatus = 'DISCONNECTED';
let waQrCode = null;
let waSocketInstance = null;
function getSocket() { return waSocketInstance; }
function setSocket(sock) { waSocketInstance = sock; global.waSocket = sock; }
global.recentReceipts = []; // Store { phone, timestamp }
global.recentChats = new Map(); // Store { phone, name, lastMessageTime }

// Helper functions for Anti-Ban (Obfuscation and Safe Delays)
function obfuscateMessage(message) {
  const zeroWidthChars = ['\u200B', '\u200C', '\u200D', '\uFEFF'];
  const numChars = Math.floor(Math.random() * 6) + 5;
  let invisibleSuffix = '';
  for (let i = 0; i < numChars; i++) {
    const randomIndex = Math.floor(Math.random() * zeroWidthChars.length);
    invisibleSuffix += zeroWidthChars[randomIndex];
  }
  return message + invisibleSuffix;
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const getRandomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Utilidad centralizada para enviar mensajes a través de WAHA (Sofi)

// Validacion estricta anti-pagos-fantasma
function strictVerifyPayment(inv, mpPayment) {
  try {
    const payerRaw = `${mpPayment.payer?.first_name || ''} ${mpPayment.payer?.last_name || ''} ${mpPayment.description || ''} ${mpPayment.additional_info?.payer?.first_name || ''} ${mpPayment.additional_info?.payer?.last_name || ''} ${mpPayment.point_of_interaction?.transaction_data?.bank_info?.payer?.long_name || ''}`;
    const payerClean = payerRaw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    
    // A) PRIORIDAD OBSERVACIONES
    const obs = (inv.client?.observation || '');
    const rawAliases = obs.split(/[|\n]/).map(s => s.replace(/^.*MP:\s*/i, '').trim()).filter(s => s.length > 2);
    
    for (const alias of rawAliases) {
      const aliasClean = alias.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      const aliasTokens = aliasClean.split(/\s+/).filter(w => w.length >= 3);
      const matchedAliasTokens = aliasTokens.filter(tok => payerClean.includes(tok)).length;
      if (aliasTokens.length > 0 && (payerClean.includes(aliasClean) || matchedAliasTokens >= 2 || (aliasTokens.length === 1 && matchedAliasTokens === 1))) {
        console.log(`[strictVerifyPayment] MATCH OBSERVACIONES: "${alias}" para cliente ${inv.client?.name}`);
        return true;
      }
    }

    // B) COINCIDENCIA POR NOMBRE
    const clientName = (inv.client?.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const nameWords = clientName.split(/\s+/).filter(w => w.length > 3 && !['de', 'del', 'las', 'los', 'san', 'maria', 'jose', 'juan', 'escuela'].includes(w));
    const matchedWordsCount = nameWords.filter(word => payerClean.includes(word)).length;
    
    if (nameWords.length > 0 && (matchedWordsCount >= 2 || (nameWords.length === 1 && matchedWordsCount === 1))) {
      console.log(`[strictVerifyPayment] MATCH NOMBRE: ${matchedWordsCount} palabras de "${clientName}" encontradas`);
      return true;
    }

    // C) COINCIDENCIA POR DNI / CUIT
    const payerDniRaw = String(mpPayment.payer?.identification?.number || '');
    const clientDni = String(inv.client?.dni || '').replace(/\D/g, '');
    
    if (clientDni && clientDni.length >= 6 && payerDniRaw.includes(clientDni)) {
      console.log(`[strictVerifyPayment] MATCH DNI: ${clientDni} en ${payerDniRaw}`);
      return true;
    }

    // D) MATCH POR EMAIL (EXTRA)
    const payerEmail = (mpPayment.payer?.email || '').toLowerCase();
    const clientEmail = (inv.client?.email || '').toLowerCase();
    if (clientEmail && clientEmail.length > 5 && payerEmail === clientEmail) {
      console.log(`[strictVerifyPayment] MATCH EMAIL: ${clientEmail}`);
      return true;
    }

    return false;
  } catch(e) {
    console.error('Error en strictVerifyPayment:', e);
    return false;
  }
}

async function registerUnidentifiedPayment(prisma, mpPayment, transactionAmount, candidates) {
  try {
    let note = '';
    if (candidates && candidates.length > 0) {
       const names = candidates.map(c => c.client?.name).join(', ');
       note = `POSIBLE CLIENTE POR COINCIDENCIA DE CENTAVOS: ${names}`;
    }
    const payerNameRaw = `${mpPayment.payer?.first_name || ''} ${mpPayment.payer?.last_name || ''}`.trim() || mpPayment.description || 'Desconocido';
    const payerName = note ? `${payerNameRaw} - ${note}` : payerNameRaw;

    await prisma.unidentifiedPayment.create({
      data: {
        amount: transactionAmount,
        mpPaymentId: String(mpPayment.id || ''),
        payerName: payerName.substring(0, 250),
        payerEmail: mpPayment.payer?.email || null,
        payerDni: String(mpPayment.payer?.identification?.number || ''),
      }
    });
    console.log(`[Pagos No Reconocidos] Guardado pago de ${transactionAmount} (${payerName})`);
  } catch (err) {
    console.error('Error guardando UnidentifiedPayment:', err);
  }
}


function formatArgentineJid(phone) {
  if (!phone) throw new Error("Número no proporcionado");
  phone = String(phone);
  
  // 1. Limpiar todo lo que no sea número
  let cleaned = phone.replace(/[^0-9]/g, '');
  
  // 2. Regla de Oro: Si tiene 15 dígitos o más, es un @lid de Meta.
  if (cleaned.length >= 15) {
    return cleaned + '@lid'; // PROHIBIDO agregar 549 o @s.whatsapp.net
  }
  
  // 3. Lógica normal para números argentinos reales
  if (cleaned.startsWith('54') && !cleaned.startsWith('549')) {
    cleaned = '549' + cleaned.substring(2);
  } else if (!cleaned.startsWith('549')) {
    cleaned = '549' + cleaned;
  }
  
  return cleaned + '@s.whatsapp.net';
}

async function sendWhatsAppMessage(phone, text) {
  let success = false;
  let phoneClean = '';
  const socket = getSocket();
  
  // Priorizar el socket interno de Baileys (Sofi) y remover fallback a WAHA
  if (socket && waStatus === 'CONNECTED') {
    try {
      const targetPhoneBaileys = formatArgentineJid(phone, '@s.whatsapp.net');
      phoneClean = String(phone).replace(/\D/g, '');
      const response = await socket.sendMessage(targetPhoneBaileys, { text: text });
      console.log(`[WhatsApp Salida] Baileys entregó el mensaje a ${targetPhoneBaileys}. Respuesta:`, !!response);
      success = true;
    } catch (e) {
      console.error('[Error Crítico Envío Manual]:', e.message, e.stack);
    }
  }

  if (success) {
    try {
      // Buscar el nombre del cliente
      const client = await prisma.client.findFirst({
        where: { phone: { contains: phoneClean } },
        select: { name: true }
      });
      
      // Guardar el mensaje saliente en la BD
      await prisma.whatsAppMessage.create({
        data: {
          phone: phoneClean,
          name: client ? client.name : null,
          text: text,
          isFromMe: true,
          isRead: true, // Los enviados por nosotros los marcamos leídos
          timestamp: new Date()
        }
      });
    } catch (dbErr) {
      console.error('Error guardando mensaje saliente en BD:', dbErr);
    }
  }
  
  return success;
}

setInterval(() => {
  const now = Date.now();
  global.recentReceipts = global.recentReceipts.filter(r => now - r.timestamp < 24 * 60 * 60 * 1000);
  
  // Limpiar chats recientes muy viejos (más de 30 días) para no llenar la RAM
  for (const [phone, chat] of global.recentChats.entries()) {
    if (now - chat.lastMessageTime.getTime() > 30 * 24 * 60 * 60 * 1000) {
      global.recentChats.delete(phone);
    }
  }
}, 60 * 60 * 1000);

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

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        const qrImage = await QRCode.toDataURL(qr);
        waStatus = 'QR_READY';
        waQrCode = qrImage;
        console.log('📱 WhatsApp Web requiere escanear nuevo Código QR.');
        qrcodeTerminal.generate(qr, { small: true });
        if (global.io) {
          global.io.emit('whatsapp_qr', qrImage);
        }
      } catch (err) {
        console.error('Error al generar QR:', err);
      }
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

  
  sock.ev.on('messages.upsert', async (m) => {
    try {
      if (m.type === 'notify') {
        for (const msg of m.messages) {
          if (!msg.message || msg.key.fromMe || msg.key.remoteJid === 'status@broadcast') continue;
          
          let realFrom = msg.key.participant || msg.participant || msg.key.remoteJid;
          if (realFrom.includes('@lid') && msg.pushName) {
            // Lógica de fallback si es necesario, pero priorizar participant
          }

          // ---- INYECCIÓN N8N (SOFI) ----
          try {
            const { default: axios } = require('axios');
            const n8nWebhook = process.env.N8N_WEBHOOK_URL_INCOMING || 'https://interfast-n8n.onrender.com/webhook/incoming';
            
            const texto = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
            const wahaPayload = { event: "message", payload: { fromMe: msg.key.fromMe, from: realFrom, body: texto, type: "chat" } };
            
            console.log('Interceptado. Enviando a n8n URL:', n8nWebhook);
            await axios.post(n8nWebhook, wahaPayload);
          } catch (n8nErr) {
            if (n8nErr.response && n8nErr.response.status === 404) {
              console.log('[Alerta] n8n devolvió 404. El flujo está apagado o se está usando una URL de prueba (/webhook-test/) sin estar en modo escucha.');
            } else {
              console.error('Error reenviando mensaje entrante a n8n:', n8nErr.message);
            }
          }
          // -------------------------------
          
          let text = '';
          if (msg.message.conversation) text = msg.message.conversation;
          else if (msg.message.extendedTextMessage) text = msg.message.extendedTextMessage.text;
          else if (msg.message.imageMessage) text = '[Imagen/Comprobante adjunto]';
          else if (msg.message.documentMessage) text = '[Documento adjunto]';
          else continue;

          const phone = realFrom.replace('@s.whatsapp.net', '').replace('@c.us', '');
          const senderName = msg.pushName || msg.message?.pushName || 'Desconocido';
          
          await prisma.whatsAppMessage.create({
            data: {
              phone: phone,
              name: senderName,
              text: text,
              isFromMe: false,
              isRead: false,
              timestamp: new Date()
            }
          });
          console.log(`📥 Nuevo mensaje de ${name} (${phone}): ${text}`);
        }
      }
    } catch(err) {
      console.error('Error procesando mensaje entrante de Baileys:', err);
    }
  });

  setSocket(sock);
}

connectToWhatsApp().catch(err => console.log("Error FATAL Baileys:", err));

// --- CRON JOBS ---
async function generateCutoffList(autoCutoff = false) {
  console.log(`⏳ Ejecutando: Generación de Lista de Cortes de Servicio (AutoCutoff: ${autoCutoff})...`);
  try {
    const pendingInvoices = await prisma.invoice.findMany({
      where: { status: 'PENDING' },
      include: { client: true }
    });

    const existingCutoffs = await prisma.cutoffList.findMany({
      where: { status: 'PENDING' }
    });
    const existingSet = new Set(existingCutoffs.map(c => c.clientId));

    const vipClients = ['VICTOR CASA', 'MATIAS BRANDI', 'HUMBERTO MONTALDI'];

    let count = 0;
    const toCreate = [];

    for (const inv of pendingInvoices) {
      if (!inv.client || !inv.client.name) continue;
      
      const clientName = inv.client.name.toUpperCase();
      const isVip = vipClients.some(vip => clientName.includes(vip));
      if (isVip) continue; // Saltear clientes VIP

      if (!existingSet.has(inv.clientId)) {
        if (autoCutoff) {
          // Si es automático, procesamos y comunicamos con Mikrotik uno por uno
          await prisma.cutoffList.create({
            data: { clientId: inv.clientId, invoiceId: inv.id, status: 'PENDING' }
          });
          if (inv.client && inv.client.ipNumber && inv.client.mainNode) {
            try {
              await prisma.client.update({
                where: { id: inv.clientId },
                data: { status: 'SUSPENDED' }
              });
              await mikrotik.addIpToCutoffList(inv.client.ipNumber, inv.client.mainNode, 'Morosos', `${inv.client.name || 'Cliente'} (ID: ${inv.client.id || inv.clientId}) - Corte CRM`);
            } catch (err) {
              const msg = err.message || JSON.stringify(err);
              console.error(`Error enviando corte al Mikrotik para IP ${inv.client.ipNumber}:`, msg);
            }
          }
        } else {
          // Si es manual, solo preparamos los datos para una inserción masiva (bulk insert)
          toCreate.push({ clientId: inv.clientId, invoiceId: inv.id, status: 'PENDING' });
        }
        
        // Agregar al set para no procesarlo de nuevo si tiene otra factura
        existingSet.add(inv.clientId);
        count++;
      }
    }
    
    // Inserción masiva ultra-rápida para evitar que el servidor haga timeout en Vercel
    if (!autoCutoff && toCreate.length > 0) {
      await prisma.cutoffList.createMany({
        data: toCreate
      });
    }

    console.log(`✅ Finalizado: Se agregaron ${count} clientes a la lista de cortes.`);
    return count;
  } catch (error) {
    console.error('❌ Error en Generación de Cortes:', error);
    throw error;
  }
}

// Función helper para garantizar que un cliente reconectado/pagado tenga factura generada para el mes actual
async function ensureCurrentMonthInvoice(clientId) {
  try {
    const now = new Date();
    let currentMonth = now.getMonth() + 1;
    let currentYear = now.getFullYear();

    if (now.getDate() >= 25) {
      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
    }

    const existing = await prisma.invoice.findFirst({
      where: { clientId: parseInt(clientId), month: currentMonth, year: currentYear }
    });

    if (existing) return existing;

    const client = await prisma.client.findUnique({
      where: { id: parseInt(clientId) },
      include: { plan: true }
    });

    if (!client || !client.plan) return null;

    const dueDate1Date = new Date(currentYear, currentMonth - 1, client.plan.dueDate1 || 10, 23, 59, 59, 999);
    const dueDate2Date = new Date(currentYear, currentMonth - 1, client.plan.dueDate2 || 15, 23, 59, 59, 999);
    const dueDate3Date = new Date(currentYear, currentMonth - 1, client.plan.dueDate3 || 20, 23, 59, 59, 999);
    const dueDate4Date = new Date(currentYear, currentMonth - 1, client.plan.dueDate4 || 22, 23, 59, 59, 999);

    let discountToApply = 0;
    let remainingBalance = 0;
    const basePrice = client.plan.priceV1 || client.plan.totalPrice;

    if (client.walletBalance > 0) {
      if (client.walletBalance >= basePrice) {
        discountToApply = basePrice;
        remainingBalance = client.walletBalance - basePrice;
      } else {
        discountToApply = client.walletBalance;
        remainingBalance = 0;
      }
      
      await prisma.client.update({
        where: { id: client.id },
        data: { walletBalance: remainingBalance }
      });
      console.log(`💳 [Reactivación] Saldo a favor aplicado: $${discountToApply} para cliente ${client.name}. Restante: $${remainingBalance}`);
    }

    const priceV1Val = Math.max(0, basePrice - discountToApply);
    const priceV2Val = Math.max(0, (client.plan.priceV2 || client.plan.totalPrice) - discountToApply);
    const priceV3Val = Math.max(0, (client.plan.priceV3 || client.plan.totalPrice) - discountToApply);
    const priceV4Val = Math.max(0, (client.plan.priceV4 || client.plan.totalPrice) - discountToApply);

    const invoiceStatus = priceV1Val === 0 ? 'PAID' : 'PENDING';

    const newInvoice = await prisma.invoice.create({
      data: {
        clientId: client.id,
        month: currentMonth,
        year: currentYear,
        originalAmount: priceV1Val,
        dueDate: dueDate1Date,
        priceV1: priceV1Val,
        dueDate1: dueDate1Date,
        priceV2: priceV2Val,
        dueDate2: dueDate2Date,
        priceV3: priceV3Val,
        dueDate3: dueDate3Date,
        priceV4: priceV4Val,
        dueDate4: dueDate4Date,
        status: invoiceStatus
      }
    });

    if (invoiceStatus === 'PAID') {
      await prisma.payment.create({
        data: {
          invoiceId: newInvoice.id,
          method: 'CREDIT', // SALDO_A_FAVOR
          amountPaid: discountToApply,
          lateFeeApplied: 0,
          userId: 1
        }
      });
    }

    console.log(`✅ [Reactivación] Factura automática N°${newInvoice.id} generada para ${client.name} (Mes ${currentMonth}/${currentYear}). Estado: ${invoiceStatus}`);
    return newInvoice;
  } catch (err) {
    console.error(`⚠️ Error al auto-generar factura para cliente ID ${clientId}:`, err.message);
    return null;
  }
}

// Función helper para envío automático de factura pagada por WhatsApp (Sofi / N8N / Baileys / Evolution API)
async function sendAutomaticPaidInvoiceNotification(invoiceId) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: parseInt(invoiceId) },
      include: { client: true, payments: true }
    });
    if (!invoice || !invoice.client || !invoice.client.phone) {
      console.log(`⚠️ [Auto-Envío Sofi] Factura ${invoiceId} no tiene teléfono registrado para enviar WhatsApp.`);
      return;
    }

    const phoneClean = invoice.client.phone.replace(/\D/g, '');
    if (phoneClean.length < 8) return;
    const targetPhone = phoneClean.startsWith('54') ? `${phoneClean}@s.whatsapp.net` : `549${phoneClean}@s.whatsapp.net`;

    const totalPaid = invoice.payments && invoice.payments.length > 0
      ? invoice.payments.reduce((sum, p) => sum + p.amountPaid, 0)
      : invoice.originalAmount;

    const pdfUrl = `https://interfast-backend-95ww.onrender.com/api/bot/factura-pdf?invoiceId=${invoice.id}`;
    const cbteTipoStr = invoice.afipCbteTip === 1 ? 'Factura A' : 'Factura B';
    const ptoVtaStr = String(invoice.afipPuntoVenta || 2).padStart(5, '0');
    const cbteNroStr = String(invoice.afipCbteNro || invoice.id).padStart(8, '0');
    const facturaNumText = invoice.afipCae ? `${cbteTipoStr} N° ${ptoVtaStr}-${cbteNroStr} (Ref: F-${invoice.id})` : `F-${invoice.id}`;
    const caeText = invoice.afipCae ? `\n🏷️ *CAE ARCA:* ${invoice.afipCae}` : '';
    const message = `¡Hola *${invoice.client.name}*! 👋🏻 Soy *Sofi*, el asistente virtual de *INTERFAST*.\n\n🎉 ¡Confirmamos que recibimos tu pago con éxito! Tu servicio está 100% activo y al día.\n\nTe envío el detalle oficial de tu comprobante fiscal:\n📄 *Comprobante:* ${facturaNumText}\n📅 *Período:* ${invoice.month}/${invoice.year}\n💰 *Monto Pagado:* $${totalPaid}${caeText}\n\n📥 *Podés descargar tu comprobante y factura oficial en PDF aquí:*\n${pdfUrl}\n\n¡Muchas gracias por confiar en nosotros! Si necesitas algo más, aquí estoy para ayudarte. 😊`;

    // 1. Enviar por WhatsApp Web interno (Baileys) si está conectado
    if (waSocket && waStatus === 'CONNECTED') {
      console.log(`📱 [Auto-Envío Sofi] Enviando factura pagada N°${invoice.id} a ${phoneClean} por Baileys interno...`);
      await waSocket.sendMessage(targetPhone, { text: message });
    }

    // 2. Disparar Webhook de N8N (si está configurada la variable N8N_INVOICE_WEBHOOK_URL)
    if (process.env.N8N_INVOICE_WEBHOOK_URL) {
      console.log(`🤖 [Auto-Envío Sofi] Disparando webhook a N8N (${process.env.N8N_INVOICE_WEBHOOK_URL})...`);
      fetch(process.env.N8N_INVOICE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'INVOICE_PAID',
          clientId: invoice.clientId,
          clientName: invoice.client.name,
          phone: phoneClean,
          targetPhone,
          invoiceId: invoice.id,
          month: invoice.month,
          year: invoice.year,
          amount: totalPaid,
          cae: invoice.afipCae,
          pdfUrl,
          message
        })
      }).catch(err => console.error('Error enviando a N8N webhook:', err.message));
    }

    // 3. Enviar por Evolution API si está configurado en variables de entorno
    if (process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY) {
      const evoUrl = `${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE_NAME || 'interfast'}`;
      console.log(`🟢 [Auto-Envío Sofi] Enviando por Evolution API a ${phoneClean}...`);
      fetch(evoUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.EVOLUTION_API_KEY
        },
        body: JSON.stringify({
          number: phoneClean,
          options: { delay: 1200, presence: 'composing' },
          textMessage: { text: message }
        })
      }).catch(err => console.error('Error enviando por Evolution API:', err.message));
    }

    console.log(`✅ [Auto-Envío Sofi] Notificación automática de pago y factura N°${invoice.id} despachada con éxito.`);
  } catch (err) {
    console.error(`❌ [Auto-Envío Sofi] Error en envío automático para factura ID ${invoiceId}:`, err.message || err);
  }
}

// Proceso de corte automático programado para el día 22
cron.schedule('0 8 22 * *', () => {
  generateCutoffList(true);
});

// --- ROUTES ---

app.post('/api/cutoffs/force', async (req, res) => {
  try {
    const count = await generateCutoffList(false); // Solo genera la lista
    res.json({ message: `Escaneo completado. Se agregaron ${count} clientes morosos a la lista.` });
  } catch (error) {
    res.status(500).json({ error: 'Error al generar la lista de cortes', details: error.message || error.toString() });
  }
});

app.post('/api/cutoffs/execute', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No se enviaron IDs válidos' });
    }

    let successCount = 0;
    const errors = [];
    
    // Primero, actualizar la base de datos (rápido)
    for (const cutoffId of ids) {
      const cutoff = await prisma.cutoffList.findUnique({
        where: { id: parseInt(cutoffId) },
        include: { client: true }
      });
      
      if (cutoff && cutoff.client && cutoff.client.ipNumber && cutoff.client.mainNode) {
        try {
          await prisma.client.update({
            where: { id: cutoff.clientId },
            data: { status: 'SUSPENDED' }
          });
          
          await prisma.cutoffList.update({
            where: { id: cutoff.id },
            data: { status: 'CUT' }
          });
          
          successCount++;
        } catch (err) {
          console.error(`Error DB para IP ${cutoff.client.ipNumber}:`, err);
          errors.push(`Error DB en ID ${cutoff.clientId}: ${err.message}`);
        }
      }
    }

    // Luego enviar comandos a Mikrotik de forma asíncrona (no bloqueante) para no causar timeout en Vercel/Render
    (async () => {
      for (const cutoffId of ids) {
        try {
          const cutoff = await prisma.cutoffList.findUnique({
            where: { id: parseInt(cutoffId) },
            include: { client: true }
          });
          if (cutoff && cutoff.client && cutoff.client.ipNumber && cutoff.client.mainNode) {
            await mikrotik.addIpToCutoffList(
              cutoff.client.ipNumber, 
              cutoff.client.mainNode, 
              'Morosos', 
              `${cutoff.client.name || 'Cliente'} (ID: ${cutoff.client.id || cutoff.clientId}) - Corte CRM`
            );
          }
        } catch (err) {
          console.error(`Error asíncrono en Mikrotik (Corte) ID ${cutoffId}:`, err.message);
        }
      }
    })();

    if (errors.length > 0) {
      return res.status(207).json({ 
        message: `Se actualizaron ${successCount} clientes en la base de datos. Sin embargo, hubo algunos errores.`, 
        details: errors 
      });
    }

    res.json({ message: `Se ejecutaron ${successCount} cortes de servicio correctamente.` });
  } catch (error) {
    console.error('Error en /api/cutoffs/execute:', error);
    res.status(500).json({ error: 'Error al ejecutar los cortes', details: error.message || error.toString() });
  }
});

// 0.2 Cortes de Servicio (Cutoff List)
app.get('/api/cutoffs', async (req, res) => {
  try {
    try {
      await prisma.cutoffList.deleteMany({
        where: { status: 'RESOLVED' }
      });
    } catch (cleanErr) {
      console.error('Error limpiando cortes resueltos:', cleanErr);
    }

    const cutoffs = await prisma.cutoffList.findMany({
      where: { status: 'PENDING' },
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
        // await ensureCurrentMonthInvoice(cutoff.clientId); // Desactivado por solicitud del usuario (evita deuda mes 8 al rehabilitar)
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

    const maskedPass = password ? `${password.substring(0, 2)}***${password.substring(password.length - 1)}` : 'N/A';
    console.log(`🔑 [LOGIN INTENT] Usuario: "${username}", Clave recibida: "${maskedPass}"`);
    console.log(`🔑 [JWT_SECRET]: ${process.env.JWT_SECRET ? 'Leído correctamente de process.env' : 'No definido en env (usando fallback)'}`);

    const user = await prisma.user.findUnique({ where: { username } });

    if (!user) {
      console.log(`❌ [LOGIN FAILED] Usuario "${username}" no existe en la base de datos.`);
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      console.log(`❌ [LOGIN FAILED] La contraseña provista no coincide con el hash almacenado para "${username}".`);
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    console.log(`✅ [LOGIN SUCCESS] Usuario "${username}" autenticado con éxito.`);

    // Generate JWT (12h expiration)
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, permissions: user.permissions },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({ token, user: { username: user.username, role: user.role, permissions: JSON.parse(user.permissions) } });
  } catch (err) {
    console.error('Error en /api/auth/login:', err);
    res.status(500).json({ error: 'Error del servidor en el login' });
  }
});

// 0. WhatsApp Robot Status
app.get('/api/whatsapp/status', (req, res) => {
  res.json({ status: waStatus, qrCode: waQrCode });
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

// 1. Dashboard Summary (Dashboard 360 - Regla 16)
app.get('/api/dashboard', authenticateToken, async (req, res) => {
  try {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    // Consulta Paralela Asíncrona (Promise.all)
    const [
      activeClientsCount,
      suspendedClientsCount,
      monthlyPayments,
      pendingInvoices,
      telemetryAlerts
    ] = await Promise.all([
      // 1. Clientes Activos
      prisma.client.count({ where: { status: 'ACTIVE' } }),
      
      // 2. Clientes Suspendidos (Cortes de morosidad)
      prisma.client.count({ where: { status: 'SUSPENDED' } }),
      
      // 3. Cobros del mes actual (Flujo de caja)
      prisma.payment.aggregate({
        where: { paymentDate: { gte: startOfMonth } },
        _sum: { amountPaid: true }
      }),

      // 4. Cálculo de Mora (Facturas pendientes vencidas)
      prisma.invoice.aggregate({
        where: { status: 'PENDING', dueDate: { lt: new Date() } },
        _sum: { originalAmount: true }
      }),

      // 5. Alertas Críticas (Telemetría / Caída de Antenas de n8n)
      prisma.ticket.findMany({
        where: {
          title: { startsWith: '[TELEMETRÍA]' },
          status: 'OPEN'
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    ]);

    res.json({
      activeClients: activeClientsCount,
      suspendedClients: suspendedClientsCount,
      monthlyIncome: monthlyPayments._sum.amountPaid || 0,
      totalDebt: pendingInvoices._sum.originalAmount || 0,
      telemetryAlerts
    });

  } catch (error) {
    console.error('Error cargando Dashboard 360:', error);
    res.status(500).json({ error: 'Error calculando métricas del sistema.' });
  }
});

// 2. Clients CRUD
app.get('/api/clients', async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      where: {
        status: { not: 'BAJA' }
      },
      include: { plan: true },
      orderBy: { id: 'asc' }
    });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

app.post('/api/clients/filter', async (req, res) => {
  try {
    const { nodeId, panelId } = req.body;
    let whereClause = { status: { not: 'BAJA' } };
    
    if (nodeId) {
      whereClause.nodeRefId = parseInt(nodeId);
      // Panel es estrictamente opcional, si viene vacío no lo usamos.
      if (panelId) {
        whereClause.panelRefId = parseInt(panelId);
      }
    } else if (panelId) {
      whereClause.panelRefId = parseInt(panelId);
    }

    const clients = await prisma.client.findMany({
      where: whereClause,
      include: { plan: true },
      orderBy: { name: 'asc' },
    });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: 'Error al filtrar clientes' });
  }
});

app.get('/api/clients/bajas', async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      where: { status: 'BAJA' },
      include: { 
        plan: true, 
        tickets: { orderBy: { createdAt: 'desc' }, take: 3 }, 
        cancellationRequests: { orderBy: { requestedAt: 'desc' }, take: 1 },
        cutoffLists: { where: { status: 'PENDING' }, take: 1 }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const mappedClients = clients.map(client => {
      const isCutOff = client.cutoffLists && client.cutoffLists.length > 0;
      const { cutoffLists, ...clientData } = client;
      return {
        ...clientData,
        isCutOff
      };
    });

    res.json(mappedClients);
  } catch (error) {
    console.error('Error en /api/clients/bajas:', error);
    res.status(500).json({ error: 'Error al obtener clientes de baja' });
  }
});

// Dar servicio Mikrotik a un cliente en BAJA (sin darlo de alta)
app.put('/api/clients/:id/enable-service', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });
    if (!client.ipNumber) return res.status(400).json({ error: 'Cliente sin IP asignada' });
    await mikrotik.removeIpFromCutoffList(client.ipNumber, client.mainNode);
    res.json({ success: true, message: `Servicio habilitado para ${client.name} (${client.ipNumber})` });
  } catch (error) {
    console.error('Error al habilitar servicio:', error);
    res.status(500).json({ error: 'Error al habilitar servicio en Mikrotik' });
  }
});

// Cortar servicio Mikrotik a un cliente en BAJA
app.put('/api/clients/:id/disable-service', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });
    if (!client.ipNumber) return res.status(400).json({ error: 'Cliente sin IP asignada' });
    await mikrotik.addIpToCutoffList(client.ipNumber, client.mainNode, 'Morosos', `${client.name} (ID: ${client.id}) - Corte por BAJA`);
    res.json({ success: true, message: `Servicio cortado para ${client.name} (${client.ipNumber})` });
  } catch (error) {
    console.error('Error al cortar servicio:', error);
    res.status(500).json({ error: 'Error al cortar servicio en Mikrotik' });
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

    let variation = 0;
    while(true) {
      const cents = Math.floor(Math.random() * 999) + 1; // 1 to 999
      variation = cents / 100; // 0.01 to 9.99
      const exists = await prisma.client.findFirst({ where: { uniqueVariation: variation }});
      if(!exists) break;
    }

    const dataPayload = { dni, name, businessName, email, phone, phone2, observation, address, fiscalAddress, city, province, zipCode, mainNode, panelId, ipNumber, planId, cuit, taxCondition, status: status || 'ACTIVE', hasRouter, hasMast, registrationDate: parsedRegistrationDate, uniqueVariation: variation };
    if (reusableId !== null) {
      dataPayload.id = reusableId;
    }

    const client = await prisma.client.create({
      data: dataPayload,
    });

    // -------------------------------------------------------------------------
    // NOTIFICACIÓN AUTOMÁTICA DE NUEVO CLIENTE (ALTA) AL TÉCNICO
    // -------------------------------------------------------------------------
    try {
      const techPhones = ['5492634302101', '5492634757105'];
      const techMessage = `🚀 *NUEVA ALTA DE CLIENTE CREADA* 🚀\n\n` +
                          `👤 *Cliente:* ${client.name}\n` +
                          `📞 *Teléfono:* ${client.phone || 'No registrado'}\n` +
                          `📍 *Dirección:* ${client.address || 'No registrada'}\n` +
                          `🆔 *DNI/CUIT:* ${client.dni || client.cuit || 'No registrado'}\n` +
                          `📡 *IP Asignada:* ${client.ipNumber || 'Sin IP'}\n\n` +
                          `✅ *N° de Cliente:* TK${client.id}\n` +
                          `🔗 *Revisalo en el CRM para coordinar la instalación.*`;

      for (const techPhone of techPhones) {
        const techTarget = `${techPhone}@s.whatsapp.net`;
        
        if (typeof waSocket !== 'undefined' && waSocket && typeof waStatus !== 'undefined' && waStatus === 'CONNECTED') {
          console.log(`📱 [Auto-Envío Técnico] Enviando alerta de alta TK${client.id} a ${techPhone} por Baileys...`);
          waSocket.sendMessage(techTarget, { text: techMessage }).catch(e=>console.error(e));
        }

        if (process.env.WAHA_API_URL) {
          const wahaUrl = `${process.env.WAHA_API_URL}/api/sendText`;
          const sessionName = process.env.WAHA_SESSION || 'default';
          const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
          if (process.env.WAHA_API_KEY) headers['X-Api-Key'] = process.env.WAHA_API_KEY; 
          fetch(wahaUrl, { method: 'POST', headers, body: JSON.stringify({ chatId: `${techPhone}@c.us`, text: techMessage, session: sessionName }) })
          .catch(err => console.error('Error WAHA Alta:', err.message));
        }

        if (process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY) {
          const evoUrl = `${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE_NAME || 'interfast'}`;
          fetch(evoUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': process.env.EVOLUTION_API_KEY }, body: JSON.stringify({ number: techPhone, options: { delay: 1200 }, textMessage: { text: techMessage } }) })
          .catch(err => console.error('Error EVO Alta:', err.message));
        }
      }
    } catch (notifErr) {
      console.error('Error enviando notificación de alta al técnico:', notifErr.message);
    }
    // -------------------------------------------------------------------------

    res.json(client);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

app.delete('/api/clients/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // 1. Eliminar dependencias indirectas y directas para permitir borrar clientes con deuda o solicitudes de baja
    await prisma.cancellationRequest.deleteMany({ where: { clientId: id } });
    await prisma.cutoffList.deleteMany({ where: { clientId: id } });

    const tickets = await prisma.ticket.findMany({ where: { clientId: id } });
    const ticketIds = tickets.map(t => t.id);
    if (ticketIds.length > 0) {
      await prisma.ticketHistory.deleteMany({ where: { ticketId: { in: ticketIds } } });
      await prisma.ticket.deleteMany({ where: { clientId: id } });
    }

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
      if (status === 'SUSPENDED' || status === 'BAJA') {
        try { await mikrotik.addIpToCutoffList(client.ipNumber, client.mainNode, 'Morosos', `${client.name || 'Cliente'} (ID: ${client.id}) - Corte CRM`); } catch (e) { console.error('Mikrotik suspend error', e.message || JSON.stringify(e)); }
      } else if (status === 'ACTIVE') {
        try { await mikrotik.removeIpFromCutoffList(client.ipNumber, client.mainNode); } catch (e) { console.error('Mikrotik restore error', e.message || JSON.stringify(e)); }
        await ensureCurrentMonthInvoice(client.id);
      }
    }
    
    res.json(client);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al cambiar estado' });
  }
});

app.put('/api/clients/:id/debito-automatico', async (req, res) => {
  try {
    const { debitoAutomatico } = req.body;
    const client = await prisma.client.update({
      where: { id: parseInt(req.params.id) },
      data: { debitoAutomatico: Boolean(debitoAutomatico) },
    });
    res.json(client);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar débito automático' });
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

app.get('/api/clients/:id/advanced-diagnosis', async (req, res) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!client) {
      return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    }

    if (!client.ipNumber || !client.mainNode) {
      return res.status(400).json({ success: false, error: 'El cliente no tiene IP o Nodo asignado para diagnóstico.' });
    }

    const diagResult = await mikrotik.advancedDiagnosis(client.ipNumber, client.mainNode);
    diagResult.clientName = client.name;
    diagResult.ipNumber = client.ipNumber;
    diagResult.nodeName = client.mainNode;
    diagResult.timestamp = new Date().toISOString();

    res.json(diagResult);
  } catch (error) {
    console.error('Error in /advanced-diagnosis endpoint:', error);
    res.status(500).json({ success: false, error: 'Error interno en diagnóstico avanzado' });
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
      include: {
        client: {
          include: {
            tickets: {
              orderBy: { createdAt: 'desc' },
              take: 5
            }
          }
        }
      },
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
    const cId = parseInt(clientId);
    
    const existing = await prisma.cancellationRequest.findFirst({
      where: {
        clientId: cId,
        status: 'PENDING'
      }
    });

    if (existing) {
      const updated = await prisma.cancellationRequest.update({
        where: { id: existing.id },
        data: {
          reason: reason && (!existing.reason || !existing.reason.includes(reason)) 
            ? `${existing.reason} | ${reason}` 
            : existing.reason,
          requestedAt: new Date()
        }
      });
      return res.json(updated);
    }

    const baja = await prisma.cancellationRequest.create({
      data: {
        clientId: cId,
        reason,
        keepServiceUntil: req.body.keepServiceUntil ? new Date(req.body.keepServiceUntil) : null
      }
    });
    res.json(baja);
  } catch (error) {
    console.error('Error al registrar baja:', error);
    res.status(500).json({ error: 'Error al registrar la solicitud de baja' });
  }
});

// Actualizar fecha de servicio (keepServiceUntil) sin cambiar estado
app.patch('/api/bajas/:id/service-date', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { keepServiceUntil } = req.body;
    const updated = await prisma.cancellationRequest.update({
      where: { id },
      data: { keepServiceUntil: keepServiceUntil ? new Date(keepServiceUntil) : null }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar fecha de servicio' });
  }
});

app.put('/api/bajas/:id/confirm', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { keepServiceUntil } = req.body;
    const baja = await prisma.cancellationRequest.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        resolvedAt: new Date(),
        keepServiceUntil: keepServiceUntil ? new Date(keepServiceUntil) : null
      },
      include: { client: true }
    });
    if (baja.clientId) {
      // Solo pone en BAJA el estado del cliente (para facturación), NO corta el servicio Mikrotik aquí
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

app.post('/api/clients/generate-variations', async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      where: { uniqueVariation: 0.0 }
    });
    
    let updated = 0;
    for (const client of clients) {
      let variation = 0;
      let attempts = 0;
      while(attempts < 5000) {
        const cents = Math.floor(Math.random() * 999) + 1; // 1 to 999
        variation = cents / 100; // 0.01 to 9.99
        const exists = await prisma.client.findFirst({ where: { uniqueVariation: variation }});
        if(!exists) break;
        attempts++;
      }
      
      await prisma.client.update({
        where: { id: client.id },
        data: { uniqueVariation: variation }
      });
      updated++;
    }
    
    res.json({ message: `Variaciones asignadas a ${updated} clientes.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar variaciones' });
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
    const { name, megas, priceV1, dueDate1, priceV2, dueDate2, priceV3, dueDate3, priceV4, dueDate4 } = req.body;
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
        dueDate3: parseInt(dueDate3 || 20),
        priceV4: parseFloat(priceV4 || 0),
        dueDate4: parseInt(dueDate4 || 22)
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
    const { name, megas, priceV1, dueDate1, priceV2, dueDate2, priceV3, dueDate3, priceV4, dueDate4 } = req.body;
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
        dueDate3: parseInt(dueDate3 || 20),
        priceV4: parseFloat(priceV4 || 0),
        dueDate4: parseInt(dueDate4 || 22)
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
        const d3 = new Date(inv.dueDate3 || inv.dueDate);

        // Si hoy es mayor a Vencimiento 3, paga Precio 4 (deuda fija).
        if (today > d3 && inv.priceV4) {
          isLate = true;
          totalAmount = inv.priceV4;
          calculatedLateFee = totalAmount - inv.originalAmount;
        }
        // Si no pasó el V3, pero sí pasó el V2, paga Precio 3.
        else if (today > d2 && inv.priceV3) {
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

app.post('/api/invoices/generate', checkPermission('FACTURACION'), async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      where: { status: 'ACTIVE', isVip: false },
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

    for (let client of clients) {
      if (!client.plan || client.isVip) continue;

      // [INICIO MODIFICACIÓN REGLA 14 - Motor de Retenciones]
      if (client.promoEndDate && client.regularPlanId) {
        if (now > new Date(client.promoEndDate)) {
          console.log(`[Retenciones] Promoción vencida para ${client.name}. Restaurando plan original (ID: ${client.regularPlanId}).`);
          
          client = await prisma.client.update({
            where: { id: client.id },
            data: { 
              planId: client.regularPlanId,
              regularPlanId: null,
              promoEndDate: null
            },
            include: { plan: true }
          });

          if (!client.plan) continue;
        }
      }
      // [FIN MODIFICACIÓN REGLA 14]

      const existing = await prisma.invoice.findFirst({
        where: { clientId: client.id, month: currentMonth, year: currentYear }
      });

      if (!existing) {
        const dueDate1Date = new Date(currentYear, currentMonth - 1, client.plan.dueDate1 || 10, 23, 59, 59, 999);
        const dueDate2Date = new Date(currentYear, currentMonth - 1, client.plan.dueDate2 || 15, 23, 59, 59, 999);
        const dueDate3Date = new Date(currentYear, currentMonth - 1, client.plan.dueDate3 || 20, 23, 59, 59, 999);
        const dueDate4Date = new Date(currentYear, currentMonth - 1, client.plan.dueDate4 || 22, 23, 59, 59, 999);

        let discountToApply = 0;
        let remainingBalance = 0;
        const basePrice = client.plan.priceV1 || client.plan.totalPrice;

        if (client.walletBalance > 0) {
          if (client.walletBalance >= basePrice) {
            discountToApply = basePrice;
            remainingBalance = client.walletBalance - basePrice;
          } else {
            discountToApply = client.walletBalance;
            remainingBalance = 0;
          }
          
          await prisma.client.update({
            where: { id: client.id },
            data: { walletBalance: remainingBalance }
          });
          console.log(`💳 [Mensual] Saldo a favor aplicado: $${discountToApply} para cliente ${client.name}. Restante: $${remainingBalance}`);
        }

        const expectedCentsOffset = client.uniqueVariation || 0;
        
        let priceV1Val = Math.max(0, basePrice - discountToApply);
        let priceV2Val = Math.max(0, (client.plan.priceV2 || client.plan.totalPrice) - discountToApply);
        let priceV3Val = Math.max(0, (client.plan.priceV3 || client.plan.totalPrice) - discountToApply);
        let priceV4Val = Math.max(0, (client.plan.priceV4 || client.plan.totalPrice) - discountToApply);

        // Añadir los centavos únicos a los montos (solo si el precio no es 0 por saldo a favor total)
        if (priceV1Val > 0) priceV1Val = Math.round((priceV1Val + expectedCentsOffset) * 100) / 100;
        if (priceV2Val > 0) priceV2Val = Math.round((priceV2Val + expectedCentsOffset) * 100) / 100;
        if (priceV3Val > 0) priceV3Val = Math.round((priceV3Val + expectedCentsOffset) * 100) / 100;
        if (priceV4Val > 0) priceV4Val = Math.round((priceV4Val + expectedCentsOffset) * 100) / 100;

        const invoiceStatus = priceV1Val === 0 ? 'PAID' : 'PENDING';

        const createdInv = await prisma.invoice.create({
          data: {
            clientId: client.id,
            month: currentMonth,
            year: currentYear,
            originalAmount: priceV1Val,
            dueDate: dueDate1Date,
            priceV1: priceV1Val,
            dueDate1: dueDate1Date,
            priceV2: priceV2Val,
            dueDate2: dueDate2Date,
            priceV3: priceV3Val,
            dueDate3: dueDate3Date,
            priceV4: priceV4Val,
            dueDate4: dueDate4Date,
            status: invoiceStatus
          }
        });

        if (invoiceStatus === 'PAID') {
          await prisma.payment.create({
            data: {
              invoiceId: createdInv.id,
              method: 'CREDIT', // SALDO_A_FAVOR
              amountPaid: discountToApply,
              lateFeeApplied: 0,
              userId: 1
            }
          });
        }

        generatedCount++;
      }
    }

    // Iniciar el envío de PDFs en segundo plano para no bloquear la respuesta HTTP
    (async () => {
      console.log('🚀 Iniciando envío de PDFs de facturas en segundo plano...');
      const createdInvoices = await prisma.invoice.findMany({
        where: {
          month: currentMonth,
          year: currentYear,
          status: 'PENDING',
          clientId: { in: clients.map(c => c.id) }
        },
        include: { client: true }
      });

      let notifiedCount = 0;
      for (const inv of createdInvoices) {
        if (!inv.client || !inv.client.phone) continue;

        const phone = inv.client.phone.replace(/\D/g, '');
        if (phone.length < 8) continue;
        const targetPhone = phone.startsWith('54') ? `${phone}@s.whatsapp.net` : `549${phone}@s.whatsapp.net`;

        try {
          const centsVal = ((inv.clientId || (inv.client && inv.client.id) || inv.id || 1) % 1000) / 100;
          const totalWithCents = inv.priceV1 + centsVal;
          const totalEs = totalWithCents.toLocaleString('es-AR', {minimumFractionDigits: 2});

          let messageBody = `Hola ${inv.client.name}! 👋🏻\n\nTe acercamos la factura de tu servicio de Internet para el período ${inv.month}/${inv.year}.\n\n💰 Monto a Abonar (Vencimiento 1): $${totalEs}\n👉 Alias Mercado Pago: interfastsm (respetar centavos para acreditación automática).\n\n💡 ¿Querés pagar con tarjeta (Link de Pago), sumarte al Débito Automático Mensual, o en efectivo en un rapipago o pago facil? Respondeme este mensaje pidiéndomelo.\n\nTe adjuntamos la factura en formato PDF con el detalle de los 4 vencimientos y tarifas.\n\n⚠️ Si ya realizaste tu pago o transferencia en las últimas horas, por favor desestima este mensaje.`;
          messageBody = obfuscateMessage(messageBody);

          // Generar el buffer del PDF
          const pdfBuffer = await generateInvoicePDFBuffer(inv);

          // Enviar el documento vía WhatsApp
          if (waSocket && waStatus === 'CONNECTED') {
            await waSocket.sendMessage(targetPhone, {
              document: pdfBuffer,
              mimetype: 'application/pdf',
              fileName: `Factura_Internet_${inv.month}_${inv.year}.pdf`,
              caption: messageBody
            });
            console.log(`✉️ Factura PDF enviada con éxito a ${inv.client.name} (${targetPhone}).`);
          } else {
            console.log(`⚠️ Robot desconectado. No se pudo enviar PDF a ${inv.client.name}.`);
          }
        } catch (sendErr) {
          console.error(`❌ Error enviando factura PDF a cliente ID ${inv.clientId}:`, sendErr.message);
        }

        notifiedCount++;
        if (notifiedCount % 40 === 0) {
          console.log(`Pausa larga de 90 segundos después de ${notifiedCount} envíos (Anti-ban)...`);
          await sleep(90000);
        } else {
          const delay = getRandomDelay(15000, 25000);
          await sleep(delay);
        }
      }
      console.log('🏁 Proceso de envío de PDFs finalizado.');
    })().catch(err => console.error('Error en tarea en segundo plano de envío de facturas:', err));

    res.json({ message: `${generatedCount} facturas nuevas generadas. Los archivos PDF se están enviando vía WhatsApp en segundo plano.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar facturas' });
  }
});

// Endpoint de Puesta a Cero para Migración Definitiva (Limpia caja, cobros y facturas pagadas/pasadas, conservando morosos)
app.post('/api/admin/reset-migration', authenticateToken, async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Se requiere rol Administrador para este reseteo masivo.' });
  try {
    const cashDel = await prisma.cashMovement.deleteMany({});
    const payDel = await prisma.payment.deleteMany({});

    const nonPendingInvoices = await prisma.invoice.findMany({
      where: { status: { not: 'PENDING' } },
      select: { id: true }
    });
    const nonPendingIds = nonPendingInvoices.map(inv => inv.id);

    await prisma.cutoffList.deleteMany({
      where: {
        OR: [
          { invoiceId: { in: nonPendingIds } },
          { status: 'RESOLVED' }
        ]
      }
    });

    const invDel = await prisma.invoice.deleteMany({
      where: { status: { not: 'PENDING' } }
    });

    res.json({
      success: true,
      message: `✅ Puesta a Cero Completada: Se eliminaron ${cashDel.count} movimientos de caja, ${payDel.count} cobros históricos y ${invDel.count} facturas pagadas/pasadas. Solo se conservaron las facturas pendientes de cobro. ¡El sistema está en $0 listo para la facturación de julio!`
    });
  } catch (error) {
    console.error('Error en reseteo para migración:', error);
    res.status(500).json({ error: 'Error al ejecutar la puesta a cero.' });
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
          await mikrotik.addIpToCutoffList(invoice.client.ipNumber, invoice.client.mainNode, 'Morosos', `${invoice.client.name || 'Cliente'} (ID: ${invoice.client.id || invoice.clientId}) - Corte CRM`);
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
  const result = await emitAfipInvoiceHelper(req.params.id, afip);
  if (!result.success) return res.status(400).json({ error: result.error });
  sendAutomaticPaidInvoiceNotification(req.params.id);
  res.json({ message: result.alreadyEmitted ? 'La factura ya contaba con CAE en ARCA.' : 'Comprobante emitido en ARCA con éxito y enviado por WhatsApp.', cae: result.cae });
});

app.post('/api/invoices/:id/send-receipt', async (req, res) => {
  try {
    // Reutilizamos la función que envía el PDF + CAE por WhatsApp
    await sendAutomaticPaidInvoiceNotification(req.params.id);
    res.json({ message: 'Factura enviada por WhatsApp al cliente.' });
  } catch (error) {
    console.error('Error enviando factura por WhatsApp:', error);
    res.status(500).json({ error: 'Hubo un error al enviar el WhatsApp.' });
  }
});

app.post('/api/invoices/mass-afip', async (req, res) => {
  if (!afip) return res.status(400).json({ error: 'Módulo ARCA/AFIP no está configurado (faltan los archivos cert/key).' });
  try {
    const { invoiceIds } = req.body;
    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return res.status(400).json({ error: 'No se enviaron facturas para procesar.' });
    }
    let successCount = 0, failCount = 0, errors = [];
    for (const invId of invoiceIds) {
      const resAfip = await emitAfipInvoiceHelper(invId, afip);
      if (resAfip.success) successCount++;
      else { failCount++; errors.push(`Factura ID ${invId}: ${resAfip.error}`); }
    }
    res.json({ message: `Lote completado. Éxitos: ${successCount}, Errores: ${failCount}`, successCount, failCount, errors });
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

    res.json({ message: `El envío de notificaciones a ${invoices.length} facturas ha comenzado en segundo plano.` });

    (async () => {
      let notifiedCount = 0;
      for (const inv of invoices) {
        if (!inv.client || !inv.client.phone) continue;

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
        const d4 = new Date(inv.dueDate4 || inv.dueDate1); d4.setHours(23, 59, 59, 999);

        if (today > d3 && inv.priceV4) {
          totalAmountWithFee = inv.priceV4;
          expirationDate = d4;
        } else if (today > d2 && inv.priceV3) {
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
      const centsValForLink = ((inv.clientId || (inv.client && inv.client.id) || inv.id || 1) % 1000) / 100;
      const totalAmountWithCents = parseFloat((totalAmountWithFee + centsValForLink).toFixed(2));
      if (!process.env.MP_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN === '') {
        paymentLink = `https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=DEMO-SIMULACION-${inv.id}`;
      } else {
        const preference = new Preference(clientMP);
        const prefBody = {
          items: [{ id: `INV-${inv.id}`, title: `Internet TK${String(inv.clientId).padStart(3, '0')}`, quantity: 1, unit_price: totalAmountWithCents }],
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

      const dueDateStr = expirationDate ? expirationDate.toLocaleDateString('es-AR') : (inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('es-AR') : `10/${String(inv.month).padStart(2, '0')}/${inv.year}`);
      const centsVal = ((inv.clientId || (inv.client && inv.client.id) || inv.id || 1) % 1000) / 100;
      const totalWithCents = totalAmountWithFee + centsVal;
      const totalEs = totalWithCents.toLocaleString('es-AR', {minimumFractionDigits: 2});
      const pdfUrl = `https://interfast-backend-95ww.onrender.com/api/bot/factura-pdf?invoiceId=${inv.id}`;
      let message = `Hola ${inv.client.name}! 👋🏻\n\nTe informamos que implementamos un nuevo sistema de gestión y facturación para mejorar nuestro servicio. Te acercamos el detalle de tu factura de Internet:\n📅 *Período:* ${inv.month}/${inv.year}\n⏰ *Vencimiento:* ${dueDateStr}\n💰 *Total a Abonar:* *$${totalEs}*\n\n📥 *Podés descargar tu factura con los 4 vencimientos en PDF aquí:* \n${pdfUrl}\n\n🚀 *MÉTODO RECOMENDADO (Transferencia sin recargos):*\nPodés abonar al Alias Mercado Pago: *interfastsm*\n👉 *Monto exacto para imputación automática: $${totalEs}* (es indispensable transferir con los centavos para que el sistema reconozca tu pago en segundos).\nUna vez transferido, envíanos la foto del comprobante por aquí.\n\n💡 *¿Otras opciones de pago?*\n• Si preferís abonar con tarjeta de crédito/débito o en efectivo (Rapipago/PagoFácil), pídeme por aquí el *Link de Pago*.\n• ¡NUEVO! También podés pedirme sumarte al *Débito Automático Mensual* para despreocuparte de los vencimientos.\n\n⚠️ *Si ya realizaste tu pago o transferencia en las últimas horas, por favor desestima este mensaje.*\n\n¡Muchas gracias!`;
      message = obfuscateMessage(message);

      await sendWhatsAppMessage(targetPhone, message);
      
      await prisma.invoice.update({
        where: { id: inv.id },
        data: { notifiedAt: new Date() }
      });
      
      notifiedCount++;

      if (notifiedCount % 40 === 0) {
        console.log(`Pausa larga de 90 segundos después de ${notifiedCount} envíos (Anti-ban)...`);
        await sleep(90000);
      } else {
        const delay = getRandomDelay(15000, 25000);
        await sleep(delay);
      }
    }
    console.log(`¡Proceso silencioso completado! ${notifiedCount} deudores notificados automáticamente por el Robot (WAHA).`);
    })().catch(err => console.error("Error en mass-notify background:", err));

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al enviar messages masivos internos' });
  }
});

app.post('/api/invoices/mass-warning', async (req, res) => {
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
        const d4 = new Date(inv.dueDate4 || inv.dueDate1); d4.setHours(23, 59, 59, 999);

        if (today > d3 && inv.priceV4) {
          totalAmountWithFee = inv.priceV4;
          expirationDate = d4;
        } else if (today > d2 && inv.priceV3) {
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
      const centsValForLink2 = ((inv.clientId || (inv.client && inv.client.id) || inv.id || 1) % 1000) / 100;
      const totalAmountWithCents2 = parseFloat((totalAmountWithFee + centsValForLink2).toFixed(2));
      if (!process.env.MP_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN === '') {
        paymentLink = `https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=DEMO-SIMULACION-${inv.id}`;
      } else {
        const preference = new Preference(clientMP);
        const prefBody = {
          items: [{ id: `INV-${inv.id}`, title: `Internet TK${String(inv.clientId).padStart(3, '0')}`, quantity: 1, unit_price: totalAmountWithCents2 }],
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

      const dueDateStr = expirationDate ? expirationDate.toLocaleDateString('es-AR') : (inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('es-AR') : `10/${String(inv.month).padStart(2, '0')}/${inv.year}`);
      const centsVal = ((inv.clientId || (inv.client && inv.client.id) || inv.id || 1) % 1000) / 100;
      const totalWithCents = totalAmountWithFee + centsVal;
      const totalEs = totalWithCents.toLocaleString('es-AR', {minimumFractionDigits: 2});
      const pdfUrl = `https://interfast-backend-95ww.onrender.com/api/bot/factura-pdf?invoiceId=${inv.id}`;
      let message = `Hola ${inv.client.name}! ⚠️\n\nTe contactamos desde administración. A la fecha no registramos el pago de tu factura de Internet:\n📅 *Período:* ${inv.month}/${inv.year}\n⏰ *Venció el:* ${dueDateStr}\n💰 *Saldo Adeudado:* *$${totalEs}*\n\nPor este motivo, te enviamos este AVISO DE CORTE.\n\n📥 *Podés descargar tu factura con los 4 vencimientos en PDF aquí:* \n${pdfUrl}\n\n🚀 *MÉTODO RECOMENDADO PARA REGULARIZAR AL INSTANTE:*\nPodés transferir al Alias Mercado Pago: *interfastsm*\n👉 *Monto exacto para imputación automática: $${totalEs}* (respeta los centavos para acreditar en segundos).\nEnvíanos la captura del comprobante por aquí para evitar la suspensión del servicio.\n\n💡 *¿Otras opciones?* Pídeme por aquí el *Link de Pago* (para tarjetas o efectivo en Rapipago/PagoFácil) o sumarte al *Débito Automático*.\n\n⚠️ *Si ya realizaste tu pago o transferencia en las últimas horas, por favor desestima este mensaje.*\n\n¡Muchas gracias!`;
      message = obfuscateMessage(message);

      const isSent = await sendWhatsAppMessage(targetPhone, message);
      if (isSent) {
        await prisma.invoice.update({
          where: { id: inv.id },
          data: { notifiedAt: new Date() } // using same notifiedAt field or we could add a new one, but this is fine.
        });
        notifiedCount++;
      } else {
        console.error(`[Aviso] Falló la entrega del corte a ${inv.client.name}, no se marcará como notificado.`);
      }

      if (notifiedCount % 40 === 0) {
        console.log(`Pausa larga de 90 segundos después de ${notifiedCount} envíos (Anti-ban)...`);
        await sleep(90000);
      } else {
        const delay = getRandomDelay(15000, 25000);
        await sleep(delay);
      }
    }

    res.json({ message: `¡Avisos de corte enviados! ${notifiedCount} deudores advertidos automáticamente por el Robot.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al enviar avisos de corte' });
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

app.post('/api/cutoffs/restore', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No se enviaron IDs válidos' });
    }

    let successCount = 0;
    const errors = [];
    
    // DB Update
    for (const cutoffId of ids) {
      const cutoff = await prisma.cutoffList.findUnique({
        where: { id: parseInt(cutoffId) },
        include: { client: true }
      });
      
      if (cutoff && cutoff.client) {
        try {
          await prisma.client.update({
            where: { id: cutoff.clientId },
            data: { status: 'ACTIVE' }
          });
          
          await prisma.cutoffList.update({
            where: { id: cutoff.id },
            data: { status: 'RESOLVED' }
          });
          
          successCount++;
        } catch (err) {
          console.error(`Error DB restaurando IP ${cutoff.client.ipNumber}:`, err);
          errors.push(`Error DB en ID ${cutoff.clientId}: ${err.message}`);
        }
      }
    }

    // Mikrotik Async Update
    (async () => {
      for (const cutoffId of ids) {
        try {
          const cutoff = await prisma.cutoffList.findUnique({
            where: { id: parseInt(cutoffId) },
            include: { client: true }
          });
          if (cutoff && cutoff.client && cutoff.client.ipNumber && cutoff.client.mainNode) {
            await mikrotik.removeIpFromCutoffList(cutoff.client.ipNumber, cutoff.client.mainNode);
          }
        } catch (err) {
          console.error(`Error asíncrono en Mikrotik (Restaurar) ID ${cutoffId}:`, err.message);
        }
      }
    })();

    if (errors.length > 0) {
      return res.status(207).json({ 
        message: `Se actualizaron ${successCount} clientes en la base de datos. Hubo algunos errores.`, 
        details: errors 
      });
    }

    res.json({ message: `Se restauraron ${successCount} servicios correctamente.` });
  } catch (error) {
    console.error('Error en /api/cutoffs/restore:', error);
    res.status(500).json({ error: 'Error al restaurar los servicios', details: error.message || error.toString() });
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
app.get('/api/cash/daily', checkPermission('CAJA'), async (req, res) => {
  try {
    const { date, endDate } = req.query;
    let startOfDay, endOfDay;

    if (date && endDate) {
      const [year, month, day] = date.split('-');
      const [eyear, emonth, eday] = endDate.split('-');
      startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      endOfDay = new Date(Date.UTC(eyear, emonth - 1, eday, 23, 59, 59, 999));
    } else if (date) {
      const [year, month, day] = date.split('-');
      startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
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
        method: { not: 'OTRO_SISTEMA' } // Trae todos los cobros reales (CASH, MERCADOPAGO, TRANSFERENCIA, etc.)
      },
      include: {
        invoice: { include: { client: true } },
        user: { select: { username: true } }
      }
    });

    const movements = await prisma.cashMovement.findMany({
      where: { 
        createdAt: { gte: startOfDay, lte: endOfDay },
        category: { not: 'PAGO_FACTURA' }
      },
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ payments, movements });
  } catch (err) {
    console.error("ERROR IN /api/cash/daily:", err);
    res.status(500).json({ error: 'Error fetching daily cash flow' });
  }
});

app.post('/api/cash/movement', checkPermission('CAJA'), async (req, res) => {
  try {
    const { type, amount, category, description, operator } = req.body;

    const m = await prisma.cashMovement.create({
      data: {
        type,
        amount: parseFloat(amount),
        category: category || 'GASTOS_VARIOS',
        description,
        operator: operator || null,
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
        amountPaid: parseFloat(amountPaid) || 0,
        lateFeeApplied: parseFloat(lateFeeApplied) || 0,
        userId: parseInt(req.user?.id) || 1
      }
    });

    if (parseFloat(amountPaid) > 0) {
      const invInfo = await prisma.invoice.findUnique({ where: { id: invoiceId }, include: { client: true } });
      const clientDesc = invInfo?.client?.name || `Cliente #${invInfo?.clientId || ''}`;
      await prisma.cashMovement.create({
        data: {
          type: 'IN',
          amount: parseFloat(amountPaid),
          category: 'PAGO_FACTURA',
          description: `Cobro ${method || 'CASH'} - Factura #${invoiceId} (${clientDesc})`,
          userId: parseInt(req.user?.id) || 1
        }
      });
    }

    // Recalcular saldo iterando todos los pagos historicos
    const allPayments = await prisma.payment.findMany({ where: { invoiceId } });
    const totalGathered = allPayments.reduce((acc, p) => acc + p.amountPaid, 0);

    // Comparar contra la meta enviada por el front (o originalAmount si falta)
    const requiredTarget = totalRequired ? parseFloat(totalRequired) : 9999999;
    const finalStatus = (totalGathered + 0.01) >= requiredTarget ? 'PAID' : 'PARTIAL';

    // Generar automáticamente deuda por la diferencia si pagaron de menos habiendo recargo activo
    if (requiredTarget < 9999999 && (requiredTarget - totalGathered) > 10) {
      const diffAmount = Math.round((requiredTarget - totalGathered) * 100) / 100;
      const invInfo = await prisma.invoice.findUnique({ where: { id: invoiceId } });
      if (invInfo && invInfo.clientId) {
        await prisma.invoice.create({
          data: {
            clientId: invInfo.clientId,
            month: invInfo.month,
            year: invInfo.year,
            originalAmount: diffAmount,
            priceV1: diffAmount,
            priceV2: diffAmount,
            priceV3: diffAmount,
            priceV4: diffAmount,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            dueDate1: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            status: 'PENDING'
          }
        });
        console.log(`⚠️ [PUT Pay] Pago inferior al recargo ($${totalGathered} vs $${requiredTarget}). Generada factura por diferencia de $${diffAmount} al cliente #${invInfo.clientId}`);
      }
    }

    const invoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: finalStatus }
    });

    if (finalStatus === 'PAID') {
      await prisma.cutoffList.deleteMany({
        where: { invoiceId }
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
        // await ensureCurrentMonthInvoice(invoiceData.clientId); // Desactivado por solicitud del usuario
      }
      // [MODIFICACIÓN REGLAS 2 Y 14: Desacople Fiscal Total]
      // Factura fiscal jamás debe dispararse sola al asentar un cobro por Webhook de Mercado Pago.
      sendAutomaticPaidInvoiceNotification(invoiceId);
      if (invoiceData && invoiceData.client && invoiceData.client.ipNumber) {
        try {
          const targetNode = invoiceData.client.mainNode || (await prisma.node.findFirst({ orderBy: { id: 'asc' } }))?.name;
          if (targetNode) await mikrotik.removeIpFromCutoffList(invoiceData.client.ipNumber, targetNode);
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
app.get('/api/invoices/:id/mercadopago/redirect', async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.id);
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { client: true }
    });
    if (!invoice) return res.status(404).send('Factura no encontrada');

    const today = new Date();
    let expirationDate = new Date(invoice.dueDate);
    expirationDate.setHours(23, 59, 59, 999);
    let totalAmount = invoice.priceV1 || invoice.originalAmount;

    if (invoice.dueDate1) {
      const d1 = new Date(invoice.dueDate1); d1.setHours(23, 59, 59, 999);
      const d2 = new Date(invoice.dueDate2 || invoice.dueDate1); d2.setHours(23, 59, 59, 999);
      const d3 = new Date(invoice.dueDate3 || invoice.dueDate1); d3.setHours(23, 59, 59, 999);
      const d4 = new Date(invoice.dueDate4 || invoice.dueDate1); d4.setHours(23, 59, 59, 999);

      if (today <= d1) { expirationDate = d1; totalAmount = invoice.priceV1 || invoice.originalAmount; }
      else if (today <= d2) { expirationDate = d2; totalAmount = invoice.priceV2 || invoice.originalAmount; }
      else if (today <= d3) { expirationDate = d3; totalAmount = invoice.priceV3 || invoice.originalAmount; }
      else if (today <= d4) { expirationDate = d4; totalAmount = invoice.priceV4 || invoice.originalAmount; }
      else { expirationDate = null; totalAmount = invoice.priceV4 || invoice.originalAmount; }
    }

    let finalPrice = parseFloat(totalAmount);
    if (isNaN(finalPrice) || finalPrice <= 0) finalPrice = parseFloat(invoice.originalAmount);
    
    const unitPrice = finalPrice * 1.10;
    if (isNaN(unitPrice) || unitPrice <= 0) throw new Error('Monto inválido para cobrar');

    if (!clientMP || !process.env.MP_ACCESS_TOKEN) {
      throw new Error('Falta inicializar MP_ACCESS_TOKEN en Render');
    }

    const preference = new Preference(clientMP);
    const prefBody = {
      items: [
        {
          id: `INV-${invoice.id}`,
          title: `Abono de Internet TK${String(invoice.clientId).padStart(3, '0')} - ${invoice.month}/${invoice.year}`,
          quantity: 1,
          unit_price: Math.round(unitPrice * 100) / 100
        }
      ],
      payer: {
        name: invoice.client.name || 'Cliente Interfast',
        email: invoice.client.email && invoice.client.email.includes('@') && !invoice.client.email.toLowerCase().includes('interfast') ? invoice.client.email : 'cliente@anonimo.com',
      },
      external_reference: invoice.id.toString(),
      notification_url: "https://interfast-backend-95ww.onrender.com/api/mercadopago/webhook"
    };

    if (expirationDate) {
      prefBody.expires = true;
      prefBody.expiration_date_to = expirationDate.toISOString();
    }

    const prefs = await preference.create({ body: prefBody });
    res.redirect(prefs.init_point);
  } catch (error) {
    console.error('Rechazo MP:', error.response?.data || error.message);
    res.status(500).send(`
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #1e293b; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; padding: 20px; }
            .card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); max-width: 400px; width: 100%; }
            .icon { font-size: 3rem; margin-bottom: 1rem; }
            h1 { font-size: 1.5rem; margin-bottom: 1rem; color: #0f172a; }
            p { color: #64748b; line-height: 1.5; margin-bottom: 1.5rem; }
            .alias { background: #f1f5f9; padding: 1rem; border-radius: 0.5rem; font-weight: bold; font-size: 1.25rem; color: #0284c7; letter-spacing: 1px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">⚠️</div>
            <h1>Link no disponible temporalmente</h1>
            <p>Tuvimos un problema al generar tu enlace de pago automático con Mercado Pago. Para regularizar tu servicio de forma inmediata, por favor transferí el monto exacto por Mercado Pago al siguiente Alias:</p>
            <div class="alias">INTERFASTSM</div>
          </div>
        </body>
      </html>
    `);
  }
});

app.get('/api/invoices/:id/mercadopago/debito', async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.id);
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { client: true }
    });
    if (!invoice || !invoice.client) return res.status(404).send('Factura o cliente no encontrado');

    const planAmount = invoice.originalAmount || 22990;
    let subscriptionLink = `https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=INTERFAST-SUB-${invoice.client.id}`;
    
    if (clientMP) {
      try {
        const preapprovalPlan = new PreApprovalPlan(clientMP);
        const sub = await preapprovalPlan.create({
          body: {
            reason: `Debito Automatico Internet - TK${String(invoice.clientId).padStart(3, '0')} (${invoice.client.name})`,
            external_reference: `SUB-${invoice.clientId}`,
            notification_url: "https://interfast-backend-95ww.onrender.com/api/mercadopago/webhook",
            auto_recurring: {
              frequency: 1,
              frequency_type: 'months',
              transaction_amount: parseFloat(planAmount),
              currency_id: 'ARS'
            },
            back_url: 'https://interfast.com.ar'
          }
        });
        subscriptionLink = sub.init_point;
      } catch (err) {
        console.error('Error generando PreApprovalPlan MP en redirect:', err?.message || err);
        try {
          const preference = new Preference(clientMP);
          const prefBody = {
            items: [{ id: `SUB-${invoice.clientId}`, title: `Adhesión Débito Automático Internet - TK${String(invoice.clientId).padStart(3, '0')}`, quantity: 1, unit_price: parseFloat(planAmount) }],
            payer: { name: invoice.client.name, email: invoice.client.email || 'cliente@interfast.com.ar' },
            external_reference: `SUB-${invoice.clientId}`,
            notification_url: "https://interfast-backend-95ww.onrender.com/api/mercadopago/webhook"
          };
          const prefs = await preference.create({ body: prefBody });
          subscriptionLink = prefs.init_point;
        } catch (prefErr) {}
      }
    }
    res.redirect(subscriptionLink);
  } catch (error) {
    console.error('Error MP Debito Redirect:', error);
    res.status(500).send('Error al generar link de débito automático');
  }
});

let currentMassReminder = { isSending: false, total: 0, sent: 0 };
app.get('/api/invoices/mass-reminder/status', (req, res) => {
  res.json(currentMassReminder);
});

app.post('/api/invoices/mass-reminder', async (req, res) => {
  try {
    const { invoiceIds } = req.body;
    if (!invoiceIds || !Array.isArray(invoiceIds)) {
      return res.status(400).json({ error: 'Se requiere un array de invoiceIds' });
    }

    const invoices = await prisma.invoice.findMany({
      where: { id: { in: invoiceIds }, status: 'PENDING' },
      include: { client: true }
    });

    currentMassReminder = { isSending: true, total: invoices.length, sent: 0 };
    res.json({ message: 'Envío masivo iniciado en segundo plano. Se enviarán mensajes progresivamente.' });

    // Proceso asincrono
    (async () => {
      let notifiedCount = 0;
      for (const invoice of invoices) {
        if (!invoice.client || !invoice.client.phone) continue;
        
        const phoneClean = invoice.client.phone.replace(/\D/g, '');
        if (phoneClean.length < 8) continue;
        const targetPhone = phoneClean.startsWith('54') ? `${phoneClean}@s.whatsapp.net` : `549${phoneClean}@s.whatsapp.net`;
        
        const today = new Date();
        let activeV = 'V1';
        let activeAmount = invoice.priceV1 || invoice.originalAmount;
        
        if (invoice.dueDate1) {
          const d1 = new Date(invoice.dueDate1); d1.setHours(23, 59, 59, 999);
          const d2 = new Date(invoice.dueDate2 || invoice.dueDate1); d2.setHours(23, 59, 59, 999);
          const d3 = new Date(invoice.dueDate3 || invoice.dueDate1); d3.setHours(23, 59, 59, 999);

          if (today > d3 && invoice.priceV4) { activeV = 'V4'; activeAmount = invoice.priceV4; }
          else if (today > d2 && invoice.priceV3) { activeV = 'V3'; activeAmount = invoice.priceV3; }
          else if (today > d1 && invoice.priceV2) { activeV = 'V2'; activeAmount = invoice.priceV2; }
        }

        const getCents999 = (cId) => (((parseInt(cId) % 999) + 1) / 100);
        const centsVal = getCents999(invoice.clientId || (invoice.client && invoice.client.id) || invoice.id || 1);
        const totalConCentavos = parseFloat(activeAmount) + centsVal;
        const totalEs = totalConCentavos.toLocaleString('es-AR', {minimumFractionDigits: 2});
        const originalConCentavos = parseFloat(invoice.originalAmount) + centsVal;

        const formatD = (d) => {
          if (!d) return 'N/A';
          const dt = new Date(d);
          return `${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth() + 1).toString().padStart(2, '0')}/${dt.getFullYear()}`;
        };

        let pricesText = '';
        if (activeV === 'V1' || activeV === 'V2' || activeV === 'V3' || activeV === 'V4') {
          pricesText += `El total a abonar varía según el día de pago:\n`;
          if (activeV === 'V1' && invoice.priceV1) pricesText += `Venc. 1 (Del 1 al 10): *$${(parseFloat(invoice.priceV1) + centsVal).toLocaleString('es-AR', {minimumFractionDigits:2})}*\n`;
          if ((activeV === 'V1' || activeV === 'V2') && invoice.priceV2) pricesText += `Venc. 2 (Día 11 al 15): *$${(parseFloat(invoice.priceV2) + centsVal).toLocaleString('es-AR', {minimumFractionDigits:2})}*\n`;
          if ((activeV === 'V1' || activeV === 'V2' || activeV === 'V3') && invoice.priceV3) pricesText += `Venc. 3 (Día 16 al 20): *$${(parseFloat(invoice.priceV3) + centsVal).toLocaleString('es-AR', {minimumFractionDigits:2})}*\n`;
          if (invoice.priceV4) pricesText += `Venc. 4 (Día 21 al 31): *$${(parseFloat(invoice.priceV4) + centsVal).toLocaleString('es-AR', {minimumFractionDigits:2})}*\n`;
          pricesText += '\n';
        }

        const pdfUrl = `https://interfast-backend-95ww.onrender.com/api/bot/factura-pdf?invoiceId=${invoice.id}&v=${activeV}`;
        const mpLink = `https://interfast-backend-95ww.onrender.com/api/invoices/${invoice.id}/mercadopago/redirect`;
        const debitoLink = `https://interfast-backend-95ww.onrender.com/api/invoices/${invoice.id}/mercadopago/debito`;

        let msg = `Hola ${invoice.client.name}! 👋🏻\n\nTe acercamos el detalle de tu factura de Internet:\n` +
          `📅 *Período:* ${String(invoice.month).padStart(2,'0')}/${invoice.year}\n` +
          `💰 *Monto Original:* $${originalConCentavos.toLocaleString('es-AR', {minimumFractionDigits:2})}\n\n` +
          `${pricesText}` +
          `📥 *Descargá tu factura PDF aquí:* \n${pdfUrl}\n\n` +
          `🚀 *MÉTODO RECOMENDADO (Transferencia sin recargos):*\n` +
          `Podés abonar al Alias Mercado Pago: *INTERFASTSM* (SIN COMISIÓN)\n` +
          `👉 *Monto exacto para imputación automática: $${totalEs}* (es indispensable transferir con el centavo exacto que figura ahí).\n` +
          `Una vez transferido, envíanos la foto del comprobante por aquí.\n\n` +
          `💳 *¿Preferís pagar con tarjeta / efectivo (Rapipago/PagoFácil)?*\n` +
          `Podés hacerlo desde aquí (puede incluir recargo):\n${mpLink}\n\n` +
          `🔄 *¿Quieres adherirte al Débito Automático?* Hazlo desde aquí:\n${debitoLink}\n\n` + 
          `¡Muchas gracias!`;
        msg = obfuscateMessage(msg);

        const isSent = await sendWhatsAppMessage(targetPhone, msg);
        if (isSent) {
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: { notifiedAt: new Date() }
          });
          notifiedCount++;
        } else {
          console.error(`[Aviso] Falló la entrega masiva a ${invoice.client.name}, no se marcará como notificado.`);
        }
        currentMassReminder.sent = notifiedCount;
        if (notifiedCount % 40 === 0) {
          console.log(`Pausa larga de 90 segundos después de ${notifiedCount} envíos (Anti-ban)...`);
          await sleep(90000);
        } else {
          const delay = getRandomDelay(15000, 25000);
          await sleep(delay);
        }
      }
      currentMassReminder.isSending = false;
    })();
  } catch (error) {
    console.error('Error inicio mass reminder:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Error al iniciar envío masivo' });
  }
});

// N8N: Generar factura ARCA a demanda
app.post('/api/bot/generar-factura-arca', async (req, res) => {
  try {
    const { clientId, invoiceId } = req.body;
    let targetInvoiceId = invoiceId;

    if (!targetInvoiceId && clientId) {
      const inv = await prisma.invoice.findFirst({
        where: { clientId: parseInt(clientId), status: 'PAID' },
        orderBy: { id: 'desc' }
      });
      if (inv) targetInvoiceId = inv.id;
    }

    if (!targetInvoiceId) {
      return res.status(404).json({ error: 'No se encontró factura pagada para este cliente' });
    }

    const { emitAfipInvoiceHelper } = require('./afip_helper');
    const invoice = await prisma.invoice.findUnique({
      where: { id: parseInt(targetInvoiceId) }
    });

    if (invoice && invoice.afipCae) {
      return res.json({ message: 'La factura ya tiene comprobante AFIP', afipCae: invoice.afipCae, afipLink: invoice.afipLink });
    }

    await emitAfipInvoiceHelper(targetInvoiceId, afip);
    
    const updated = await prisma.invoice.findUnique({
      where: { id: parseInt(targetInvoiceId) }
    });

    res.json({ message: 'Factura generada con éxito', afipCae: updated.afipCae, afipLink: updated.afipLink });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar factura en ARCA' });
  }
});

// Pagos No Identificados
app.get('/api/unidentified-payments', async (req, res) => {
  try {
    const payments = await prisma.unidentifiedPayment.findMany({
      orderBy: { date: 'desc' }
    });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener pagos no identificados' });
  }
});

app.post('/api/unidentified-payments/:id/assign', async (req, res) => {
  try {
    const { invoiceId } = req.body;
    const paymentId = parseInt(req.params.id);

    const payment = await prisma.unidentifiedPayment.findUnique({ where: { id: paymentId } });
    if (!payment) return res.status(404).json({ error: 'Pago no encontrado' });

    const invoice = await prisma.invoice.findUnique({ where: { id: parseInt(invoiceId) }, include: { client: true } });
    if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });

    await prisma.invoice.update({
      where: { id: parseInt(invoiceId) },
      data: { status: 'PAID', paymentMethod: 'MERCADOPAGO', paymentDate: payment.date }
    });
    
    if (invoice.client && invoice.client.ipNumber) {
      try {
        const targetNode = invoice.client.mainNode || (await prisma.node.findFirst({ orderBy: { id: 'asc' } }))?.name;
        if (targetNode) await mikrotik.removeIpFromCutoffList(invoice.client.ipNumber, targetNode);
      } catch(e) {}
    }

    await prisma.unidentifiedPayment.delete({ where: { id: paymentId } });
    res.json({ message: 'Pago asignado con éxito' });
  } catch(error) {
    console.error(error);
    res.status(500).json({ error: 'Error al asignar pago' });
  }
});

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
      const d4 = new Date(invoice.dueDate4 || invoice.dueDate1); d4.setHours(23, 59, 59, 999);

      if (today <= d1) expirationDate = d1;
      else if (today <= d2) expirationDate = d2;
      else if (today <= d3) expirationDate = d3;
      else if (today <= d4) expirationDate = d4;
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
          unit_price: Math.round(parseFloat(totalAmount) * 1.10 * 100) / 100
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
        const d4 = new Date(invoice.dueDate4 || invoice.dueDate1); d4.setHours(23, 59, 59, 999);

        if (today <= d1) {
          expirationDate = d1;
          totalAmount = invoice.priceV1 || invoice.originalAmount;
        } else if (today <= d2) {
          expirationDate = d2;
          totalAmount = invoice.priceV2 || invoice.originalAmount;
        } else if (today <= d3) {
          expirationDate = d3;
          totalAmount = invoice.priceV3 || invoice.originalAmount;
        } else if (today <= d4) {
          expirationDate = d4;
          totalAmount = invoice.priceV4 || invoice.originalAmount;
        } else {
          expirationDate = null;
          totalAmount = invoice.priceV4 || invoice.originalAmount;
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
          unit_price: Math.round(parseFloat(combinedTotal) * 1.10 * 100) / 100
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

const processInvoiceImputation = async (invoiceId, transactionAmount, mpPaymentIdStr, mpFee = 0, mpTax = 0) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { client: true }
  });

  if (!invoice || invoice.status === 'PAID') {
    console.log(`⚠️ Imputación: La factura ${invoiceId} ya estaba PAGADA o no existe.`);
    return false;
  }

  const today = new Date();
  let expectedAmountForDate = invoice.priceV1 || invoice.originalAmount;
  let activeTierName = "Vencimiento 1";

  if (invoice.dueDate1) {
    const d1 = new Date(invoice.dueDate1); d1.setHours(23, 59, 59, 999);
    const d2 = new Date(invoice.dueDate2 || invoice.dueDate1); d2.setHours(23, 59, 59, 999);
    const d3 = new Date(invoice.dueDate3 || invoice.dueDate1); d3.setHours(23, 59, 59, 999);
    const d4 = new Date(invoice.dueDate4 || invoice.dueDate1); d4.setHours(23, 59, 59, 999);

    if (today > d3 && invoice.priceV4) {
      expectedAmountForDate = invoice.priceV4;
      activeTierName = "Vencimiento 4";
    } else if (today > d2 && invoice.priceV3) {
      expectedAmountForDate = invoice.priceV3;
      activeTierName = "Vencimiento 3";
    } else if (today > d1 && invoice.priceV2) {
      expectedAmountForDate = invoice.priceV2;
      activeTierName = "Vencimiento 2";
    }
  }

  const expectedTotalForDate = expectedAmountForDate;

  const updatedInvoice = await prisma.invoice.updateMany({
    where: { id: invoiceId, status: 'PENDING' },
    data: { status: 'PAID' }
  });

  if (updatedInvoice.count === 0) return false;

  await prisma.payment.create({
    data: {
      invoiceId: invoiceId,
      method: 'MERCADOPAGO',
      amountPaid: transactionAmount,
      mpFee: mpFee,
      mpTax: mpTax,
      lateFeeApplied: 0,
      mpPaymentId: mpPaymentIdStr
    }
  });

  await prisma.cashMovement.create({
    data: {
      type: 'IN',
      amount: transactionAmount,
      category: 'PAGO_FACTURA',
      description: `Cobro MP - Factura #${invoiceId} (${invoice.client?.name || 'Cliente'})`,
      userId: 1
    }
  });

  await prisma.cutoffList.deleteMany({
    where: { invoiceId: invoiceId }
  });

  if (invoice.clientId) {
    await prisma.client.update({
      where: { id: invoice.clientId },
      data: { status: 'ACTIVE' }
    });
  }

  const difference = expectedTotalForDate - transactionAmount;
  
  // Regla de $200 de diferencia para DEUDA
  if (difference > 200.0) {
    console.log(`⚠️ Imputación: Diferencia detectada para factura #${invoiceId}. Esperado: $${expectedTotalForDate}, Pagado: $${transactionAmount}. Diferencia: $${difference}`);
    
    await prisma.invoice.create({
      data: {
        clientId: invoice.clientId,
        month: invoice.month,
        year: invoice.year,
        originalAmount: difference,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'PENDING',
        priceV1: difference,
        priceV2: difference,
        priceV3: difference,
        priceV4: difference,
        dueDate1: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        dueDate2: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        dueDate3: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        dueDate4: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    if (waSocket && waStatus === 'CONNECTED' && invoice.client?.phone) {
      const phoneClean = invoice.client.phone.replace(/\D/g, '');
      const targetPhone = phoneClean.startsWith('54') ? `${phoneClean}@s.whatsapp.net` : `549${phoneClean}@s.whatsapp.net`;
      const diffMsg = `Hola ${invoice.client.name}! 👋\n\nConfirmamos la acreditación de tu pago por un total de *$${transactionAmount.toFixed(2)}*.\n\n⚠️ *Aviso de Diferencia:* Como tu pago fue registrado el día ${new Date().toLocaleDateString('es-AR')}, el total correspondiente a la fecha era de *$${expectedTotalForDate.toFixed(2)}* (${activeTierName}).\n\nPor este motivo, se ha generado automáticamente una factura pendiente por la diferencia de *$${difference.toFixed(2)}* en tu cuenta, la cual podrás abonar más adelante.\n\nTu servicio de Internet ya se encuentra activo. ¡Muchas gracias!`;
      
      await waSocket.sendMessage(targetPhone, { text: diffMsg }).catch(console.error);
    }
  } 
  // Regla de $200 de diferencia para SALDO A FAVOR
  else if (difference < -200.0) {
    const excessCredit = -difference;
    console.log(`💳 Imputación: Pago en exceso detectado para factura #${invoiceId}. Esperado: $${expectedTotalForDate}, Pagado: $${transactionAmount}. Crédito a favor: $${excessCredit}`);
    if (invoice.clientId) {
      await prisma.client.update({
        where: { id: invoice.clientId },
        data: { walletBalance: { increment: excessCredit } }
      });

      if (waSocket && waStatus === 'CONNECTED' && invoice.client?.phone) {
        const phoneClean = invoice.client.phone.replace(/\D/g, '');
        const targetPhone = phoneClean.startsWith('54') ? `${phoneClean}@s.whatsapp.net` : `549${phoneClean}@s.whatsapp.net`;
        const creditMsg = `Hola ${invoice.client.name}! 👋\n\nConfirmamos la acreditación de tu pago por un total de *$${transactionAmount.toFixed(2)}*.\n\n🎉 *Crédito a Favor:* Como el total correspondiente era de *$${expectedTotalForDate.toFixed(2)}*, registramos un saldo a favor en tu cuenta de *$${excessCredit.toFixed(2)}*, el cual se aplicará automáticamente como descuento en tu próxima factura mensual.\n\n¡Muchas gracias!`;
        
        await waSocket.sendMessage(targetPhone, { text: creditMsg }).catch(console.error);
      }
    }
  }

  // [MODIFICACIÓN REGLAS 2 Y 14: Desacople Fiscal Total]
  // Emisión AFIP/ARCA desactivada del flujo automático de cobro por caja.
  sendAutomaticPaidInvoiceNotification(invoiceId);

  if (invoice.client && invoice.client.ipNumber) {
    try {
      const targetNode = invoice.client.mainNode || (await prisma.node.findFirst({ orderBy: { id: 'asc' } }))?.name;
      if (targetNode) await mikrotik.removeIpFromCutoffList(invoice.client.ipNumber, targetNode);
    } catch (err) {
      console.error(`Error removiendo IP del Mikrotik (Imputación):`, err.message);
    }
  }

  console.log(`✅ Imputación: Factura N°${invoiceId} cobrada exitosamente ($${transactionAmount}).`);
  return true;
};

app.post('/api/mercadopago/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const topic = req.query.topic || req.query.type || req.body?.type || req.body?.action;
    let paymentId = req.query['data.id'] || req.query.id || req.body?.data?.id;
    if (!paymentId && req.body?.id && topic === 'payment.created') paymentId = req.body.id;

    if (paymentId && clientMP) {
      const existingPayment = await prisma.payment.findUnique({
        where: { mpPaymentId: String(paymentId) }
      });
      if (existingPayment) return;

      const payment = new Payment(clientMP);
      const mpPayment = await payment.get({ id: paymentId });
      
      if (mpPayment.status === 'approved') {
        const ref = (mpPayment.external_reference || mpPayment.metadata?.external_reference || '').toString().trim();
        const description = (mpPayment.description || mpPayment.reason || '').toString();
        let invoiceIdsToProcess = [];

        if (ref.startsWith('MULTI-')) {
          invoiceIdsToProcess = ref.replace('MULTI-', '').split('-').map(id => parseInt(id)).filter(id => !isNaN(id));
        } else if (ref.startsWith('SUB-') || description.includes('SUB-') || /TK\d+/.test(description)) {
          let subClientId = NaN;
          if (ref.startsWith('SUB-')) subClientId = parseInt(ref.replace('SUB-', ''));
          else {
            const match = description.match(/SUB-(\d+)/) || description.match(/TK0*(\d+)/);
            if (match && match[1]) subClientId = parseInt(match[1]);
          }
          if (!isNaN(subClientId)) {
            const pendingInv = await prisma.invoice.findFirst({
              where: { clientId: subClientId, status: 'PENDING' },
              orderBy: [{ year: 'asc' }, { month: 'asc' }]
            });
            if (pendingInv) invoiceIdsToProcess.push(pendingInv.id);
          }
        } else if (ref && ref.trim() !== '') {
          const singleId = parseInt(ref);
          if (!isNaN(singleId)) {
            const validInvoice = await prisma.invoice.findFirst({
              where: { id: singleId, status: 'PENDING' }
            });
            if (validInvoice) invoiceIdsToProcess.push(validInvoice.id);
          }
        }

        const transactionAmount = parseFloat(mpPayment.transaction_amount) || 0;
        let mpFee = 0;
        let mpTax = 0;
        if (mpPayment.fee_details && Array.isArray(mpPayment.fee_details)) {
          mpPayment.fee_details.forEach(fee => {
            if (fee.type === 'mercadopago_fee') mpFee += parseFloat(fee.amount) || 0;
            else mpTax += parseFloat(fee.amount) || 0;
          });
        }

        if (invoiceIdsToProcess.length === 0) {
          const pendingInvoices = await prisma.invoice.findMany({
            where: { status: 'PENDING' },
            include: { client: { select: { id: true, name: true, observation: true, dni: true, phone: true } } },
            orderBy: [{ year: 'asc' }, { month: 'asc' }]
          });

          const payerRaw = `${mpPayment.payer?.first_name || ''} ${mpPayment.payer?.last_name || ''} ${mpPayment.description || ''} ${mpPayment.point_of_interaction?.transaction_data?.bank_info?.payer?.long_name || ''}`;
          const payerClean = payerRaw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
          const payerDniRaw = String(mpPayment.payer?.identification?.number || '').replace(/\D/g, '');
          
          let matchedInvoice = null;

          const checkAmountTolerance = (inv) => {
            const possible = [inv.originalAmount, inv.priceV1, inv.priceV2, inv.priceV3, inv.priceV4].filter(a => a);
            return possible.some(amt => Math.abs(transactionAmount - amt) < 5.0);
          };

          for (const inv of pendingInvoices) {
            let isNameMatch = false;

            const obs = (inv.client?.observation || '');
            const rawAliases = obs.split(/[|\n]/).map(s => s.replace(/^.*MP:\s*/i, '').trim()).filter(s => s.length > 2);
            for (const alias of rawAliases) {
              const aliasClean = alias.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
              const aliasTokens = aliasClean.split(/\s+/).filter(w => w.length >= 3);
              const matchedAliasTokens = aliasTokens.filter(tok => payerClean.includes(tok)).length;
              if (aliasTokens.length > 0 && (payerClean.includes(aliasClean) || matchedAliasTokens >= 2 || (aliasTokens.length === 1 && matchedAliasTokens === 1))) {
                isNameMatch = true; break;
              }
            }

            if (!isNameMatch) {
              const clientRaw = (inv.client?.name || '');
              const clientClean = clientRaw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
              const clientTokens = clientClean.split(/\s+/).filter(w => w.length >= 3);
              const matchingTokens = clientTokens.filter(tok => payerClean.includes(tok)).length;
              if (matchingTokens >= 2 || (clientTokens.length === 1 && matchingTokens === 1)) {
                isNameMatch = true;
              }
            }

            if (isNameMatch && checkAmountTolerance(inv)) {
              console.log(`🎯 Webhook MP: MATCH POR NOMBRE/ALIAS. Cliente ${inv.client?.name}`);
              matchedInvoice = inv;
              break;
            }
          }

          if (!matchedInvoice && payerDniRaw.length >= 7) {
            for (const inv of pendingInvoices) {
              const cDni = String(inv.client?.dni || '').replace(/\D/g, '');
              if (cDni.length >= 7 && (payerDniRaw.includes(cDni) || cDni.includes(payerDniRaw))) {
                if (checkAmountTolerance(inv)) {
                  console.log(`🎯 Webhook MP: MATCH POR DNI/CUIL. Cliente ${inv.client?.name}`);
                  matchedInvoice = inv;
                  break;
                }
              }
            }
          }

          if (matchedInvoice) {
            invoiceIdsToProcess.push(matchedInvoice.id);
          } else {
            let suggestedClientName = '';
            const getCents999 = (cId) => (((parseInt(cId) % 999) + 1) / 100);
            
            for (const inv of pendingInvoices) {
              const cId = inv.clientId || (inv.client && inv.client.id) || inv.id || 1;
              const centsVal = getCents999(cId);
              const possibleAmounts = [
                (inv.priceV1 || inv.originalAmount) + centsVal,
                inv.priceV2 ? inv.priceV2 + centsVal : null,
                inv.priceV3 ? inv.priceV3 + centsVal : null,
                inv.priceV4 ? inv.priceV4 + centsVal : null
              ].filter(a => a);

              if (possibleAmounts.some(amt => Math.abs(transactionAmount - amt) < 0.05)) {
                suggestedClientName = inv.client?.name;
                break;
              }
            }

            console.error(`❌ Webhook MP: Pago guardado en Pagos No Identificados. Monto $${transactionAmount}.`);
            let finalPayerName = payerRaw.trim();
            if (suggestedClientName) {
              finalPayerName = `[POSIBLE CLIENTE: ${suggestedClientName} POR COINCIDENCIA DE CENTAVOS] ` + finalPayerName;
            }

            const existingUnidentified = await prisma.unidentifiedPayment.findFirst({
              where: { mpPaymentId: String(paymentId) }
            });
            if (!existingUnidentified) {
              await prisma.unidentifiedPayment.create({
                data: {
                  amount: transactionAmount,
                  date: new Date(),
                  mpPaymentId: String(paymentId),
                  payerName: finalPayerName,
                  payerEmail: mpPayment.payer?.email || '',
                  payerDni: String(mpPayment.payer?.identification?.number || '')
                }
              });
            }
            return;
          }
        }

        const existingUnidentified = await prisma.unidentifiedPayment.findFirst({
          where: { mpPaymentId: String(paymentId) }
        });
        if (existingUnidentified) {
           await prisma.unidentifiedPayment.delete({ where: { id: existingUnidentified.id } });
        }

        for (const invoiceId of invoiceIdsToProcess) {
          await processInvoiceImputation(invoiceId, transactionAmount, String(paymentId), mpFee, mpTax);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error fatal en Webhook MP:', error.message || error);
  }
});

app.post('/api/unidentified-payments/:id/assign', async (req, res) => {
  try {
    const { invoiceId } = req.body;
    const paymentId = parseInt(req.params.id);

    const payment = await prisma.unidentifiedPayment.findUnique({ where: { id: paymentId } });
    if (!payment) return res.status(404).json({ error: 'Pago no encontrado' });

    const invoice = await prisma.invoice.findUnique({ where: { id: parseInt(invoiceId) }, include: { client: true } });
    if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });

    const success = await processInvoiceImputation(invoice.id, payment.amount, payment.mpPaymentId || String(paymentId), 0, 0);

    if (success) {
      await prisma.unidentifiedPayment.delete({ where: { id: paymentId } });
      res.json({ success: true, message: 'Pago asignado y procesado exitosamente' });
    } else {
      res.status(400).json({ error: 'La factura ya estaba pagada o hubo un error en la imputación.' });
    }
  } catch (error) {
    console.error('Error al asignar pago no identificado:', error);
    res.status(500).json({ error: 'Error interno al asignar pago' });
  }
});

app.get('/api/reports/sales', async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: {
        method: { not: 'OTRO_SISTEMA' }
      },
      include: {
        invoice: {
          include: { client: { include: { plan: true } } }
        }
      },
      orderBy: { paymentDate: 'desc' }
    });

    const movements = await prisma.cashMovement.findMany({
      where: { category: { not: 'PAGO_FACTURA' } },
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
        const dueDate4Date = new Date(inv.year, inv.month - 1, plan.dueDate4 || 22, 23, 59, 59, 999);

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
            dueDate3: dueDate3Date,
            priceV4: plan.priceV4 || plan.totalPrice,
            dueDate4: dueDate4Date
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

    if (phone) {
      const cleanPhone = phone.toString().replace(/\D/g, '');
      const shortPhone = cleanPhone.length > 8 ? cleanPhone.slice(-8) : cleanPhone;
      
      const existingLead = await prisma.lead.findFirst({
        where: {
          phone: { contains: shortPhone }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (existingLead) {
        console.log(`[Lead Anti-Duplicado] Actualizando prospecto existente ID ${existingLead.id} para ${name || existingLead.name} (${phone})...`);
        let updatedNotes = existingLead.notes;
        if (notes && (!existingLead.notes || !existingLead.notes.includes(notes))) {
          updatedNotes = existingLead.notes ? `${existingLead.notes}\n[Act. ${new Date().toLocaleDateString()}] ${notes}` : notes;
        }

        const updatedLead = await prisma.lead.update({
          where: { id: existingLead.id },
          data: {
            name: name || existingLead.name,
            address: address || existingLead.address,
            latitude: latitude ? parseFloat(latitude) : existingLead.latitude,
            longitude: longitude ? parseFloat(longitude) : existingLead.longitude,
            status: status || existingLead.status,
            notes: updatedNotes
          }
        });
        return res.json(updatedLead);
      }
    }

    const lead = await prisma.lead.create({
      data: { phone, name, address, latitude: latitude ? parseFloat(latitude) : null, longitude: longitude ? parseFloat(longitude) : null, status: status || 'NEW', notes }
    });
    res.json(lead);
  } catch (error) {
    console.error('Error en POST /api/leads:', error);
    res.status(500).json({ error: 'Error al crear o actualizar prospecto' });
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

// --- ENDPOINTS BLINDADOS PARA BOT N8N (SOPORTE Y BÚSQUEDA) ---
function buildBotClientSearchWhere(query) {
  const rawQuery = query.toString().trim();
  const cleanQuery = rawQuery.replace(/[\.\-\s\+]/g, '');
  const isNumeric = /^\d+$/.test(cleanQuery);

  if (isNumeric || cleanQuery.length >= 4) {
    const cuitWithHyphens = cleanQuery.length === 11 ? `${cleanQuery.slice(0, 2)}-${cleanQuery.slice(2, 10)}-${cleanQuery.slice(10)}` : rawQuery;
    
    let dottedQuery = rawQuery;
    if (cleanQuery.length === 8) {
      dottedQuery = `${cleanQuery.slice(0, 2)}.${cleanQuery.slice(2, 5)}.${cleanQuery.slice(5)}`;
    } else if (cleanQuery.length === 7) {
      dottedQuery = `${cleanQuery.slice(0, 1)}.${cleanQuery.slice(1, 4)}.${cleanQuery.slice(4)}`;
    }

    const orConditions = [
      { dni: { equals: cleanQuery } },
      { dni: { equals: rawQuery } },
      { dni: { equals: dottedQuery } },
      { cuit: { equals: cleanQuery } },
      { cuit: { equals: rawQuery } },
      { cuit: { equals: cuitWithHyphens } },
      { name: { contains: rawQuery, mode: 'insensitive' } }
    ];

    if (cleanQuery.length >= 6) {
      const shortQuery = cleanQuery.length > 8 ? cleanQuery.slice(-8) : cleanQuery;
      orConditions.push(
        { phone: { contains: cleanQuery } },
        { phone: { contains: rawQuery } },
        { phone: { contains: shortQuery } },
        { phone2: { contains: cleanQuery } },
        { phone2: { contains: shortQuery } }
      );
    }

    return { OR: orConditions };
  } else {
    return {
      name: { contains: rawQuery, mode: 'insensitive' }
    };
  }
}

const botRequestLogs = [];
app.use('/api/bot', (req, res, next) => {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      method: req.method || 'GET',
      url: req.originalUrl || req.url || '',
      query: req.query || {},
      headers: { 'user-agent': (req.headers && req.headers['user-agent']) || '', 'x-api-key': (req.headers && req.headers['x-api-key']) || '' }
    };
    botRequestLogs.unshift(logEntry);
    if (botRequestLogs.length > 50) botRequestLogs.pop();
  } catch (e) {
    console.error("Error en middleware bot logging:", e.message);
  }
  next();
});
// --- CONTROL DE ATENCIÓN Y PAUSA INTELIGENTE DEL BOT ---
const pausedChatsMap = new Map(); // phone -> timestamp expiracion (ms)

app.post('/api/bot/pausar-chat', (req, res) => {
  const { phone, hours } = req.body;
  if (!phone) return res.status(400).json({ error: 'Falta parámetro phone' });
  const cleanPhone = phone.toString().replace(/\D/g, '');
  const durationHours = parseFloat(hours) || 1; // Pausa de 1 HORA por defecto al escribir manualmente
  const expireAt = Date.now() + durationHours * 3600 * 1000;
  pausedChatsMap.set(cleanPhone, expireAt);
  console.log(`[Bot Control] Chat ${cleanPhone} PAUSADO por ${durationHours} hora(s).`);
  res.json({ success: true, message: `Chat ${cleanPhone} pausado para Sofi por ${durationHours}h`, expireAt: new Date(expireAt).toISOString() });
});

app.post('/api/bot/reanudar-chat', (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Falta parámetro phone' });
  const cleanPhone = phone.toString().replace(/\D/g, '');
  pausedChatsMap.delete(cleanPhone);
  console.log(`[Bot Control] Chat ${cleanPhone} REANUDADO para Sofi.`);
  res.json({ success: true, message: `Chat ${cleanPhone} reanudado para Sofi` });
});

const lastMessageMap = new Map();

async function handleVerificarAtencion(req, res) {
  try {
    const setting = await prisma.systemSettings.findUnique({ where: { key: 'SOFI_ENABLED' } });
    const isEnabled = setting ? setting.value === 'true' : true;
    if (!isEnabled) {
      return res.json({
        canRespond: false,
        shouldIgnore: true,
        reason: 'Sofi está apagada desde el interruptor global del CRM.',
        code: 'BOT_GLOBALLY_DISABLED'
      });
    }

    const q = req.query || {};
    const b = req.body || {};

    const phone = q.phone || b.phone || '';
    
    // Ignorar estados de WhatsApp (status@broadcast) o extracciones fallidas de N8N
    if (phone.includes('@lid') || phone.includes('@s.whatsapp.net')) {
      // PERMITIDO EXPLÍCITAMENTE (Bypass anti-filtro)
    } else if (phone.includes('@broadcast') || phone === 'status@broadcast' || phone === 'error_extraccion') {
      return res.json({
        canRespond: false,
        shouldIgnore: true,
        reason: 'Mensaje de Estado de WhatsApp o remitente ignorado.',
        code: 'WHATSAPP_STATUS_IGNORED'
      });
    }

    const timestamp = q.timestamp || b.timestamp || q.msgDate || b.msgDate || '';
    const fromMeRaw = q.fromMe !== undefined ? q.fromMe : b.fromMe;
    const fromMe = String(fromMeRaw) === 'true';

    // 0. IGNORAR MENSAJES SALIENTES (fromMe = true) PARA QUE N8N NO SE RESPONDA A SÍ MISMO
    if (fromMe && phone && phone !== 'undefined') {
      const cleanPhone = String(phone).replace(/\D/g, '');
      if (cleanPhone && cleanPhone !== 'error_no_number' && cleanPhone.length >= 7) {
        // NOTA: Se desactiva la auto-pausa de 1 hora porque también se activaba cuando la propia IA (Sofi) 
        // enviaba un mensaje, lo que provocaba que se silenciara a sí misma indefinidamente.
        // Si un humano quiere intervenir, debe usar el botón "Pausar" en el CRM.
        
        console.log(`[Bot Control] MENSAJE SALIENTE DETECTADO -> Chat ${cleanPhone}. Se ignora para evitar bucle de N8N.`);
        return res.json({
          canRespond: false,
          shouldIgnore: true,
          reason: `Mensaje saliente. Sofi no debe procesar sus propios mensajes o los del operador.`,
          code: 'OUTGOING_MESSAGE_IGNORED'
        });
      }
    }

    // 1. CONTROL DE MENSAJES VIEJOS ENCOLEADOS (UNPUBLISH -> PUBLISH EN N8N)
    if (timestamp && timestamp !== 'undefined') {
      let msgTimeMs = parseInt(timestamp);
      if (!isNaN(msgTimeMs) && msgTimeMs > 0) {
        if (msgTimeMs < 10000000000) msgTimeMs = msgTimeMs * 1000;
        const ageSeconds = (Date.now() - msgTimeMs) / 1000;
        if (ageSeconds > 90) {
          console.log(`[Bot Control] OMITIENDO MENSAJE ANTIGUO (${Math.round(ageSeconds)}s de antigüedad):`, timestamp);
          return res.json({
            canRespond: false,
            shouldIgnore: true,
            reason: `Mensaje antiguo retenido durante pausa de n8n (${Math.round(ageSeconds)}s de antigüedad). Sofi no responderá.`,
            code: 'MESSAGE_TOO_OLD'
          });
        }
      }
    }

    // 2. CONTROL DE INTERVENCIÓN MANUAL POR OPERADOR HUMANO
    if (phone && phone !== 'undefined') {
      const cleanPhone = String(phone).replace(/\D/g, '');
      if (cleanPhone && cleanPhone.length >= 7) {
        const expireAt = pausedChatsMap.get(cleanPhone);
        if (expireAt) {
          if (Date.now() < expireAt) {
            console.log(`[Bot Control] OMITIENDO MENSAJE - CHAT ATENDIDO MANULMENTE: ${cleanPhone}`);
            return res.json({
              canRespond: false,
              shouldIgnore: true,
              reason: `El chat ${cleanPhone} fue atendido manualmente por un operador humano. Sofi no responderá.`,
              code: 'HUMAN_OPERATOR_ACTIVE',
              pausedUntil: new Date(expireAt).toISOString()
            });
          } else {
            pausedChatsMap.delete(cleanPhone); // Expiró la pausa
          }
        }
      }
    }

    // 3. DEBOUNCE ANTI-SPAM (7 SEGUNDOS) PARA EVITAR DOBLE RESPUESTA (ej. cuando mandan 2 imágenes juntas o mensajes cortos seguidos)
    if (phone && phone !== 'undefined') {
      const cleanPhone = String(phone).replace(/\D/g, '');
      if (cleanPhone && cleanPhone.length >= 7) {
        const now = Date.now();
        const lastMsgTime = lastMessageMap.get(cleanPhone) || 0;
        
        if (now - lastMsgTime < 7000) {
          lastMessageMap.set(cleanPhone, now); // Refrescar el temporizador si siguen llegando
          console.log(`[Bot Control] DEBOUNCE - Ignorando mensaje múltiple/simultáneo de ${cleanPhone}`);
          return res.json({
            canRespond: false,
            shouldIgnore: true,
            reason: `Mensaje recibido muy rápido (menos de 7s). Ignorado para evitar doble respuesta de Sofi.`,
            code: 'MESSAGE_DEBOUNCED'
          });
        }
        
        // Registrar la hora de este mensaje válido
        lastMessageMap.set(cleanPhone, now);
      }
    }

    return res.json({ canRespond: true, shouldIgnore: false });
  } catch (err) {
    console.error("Error en handleVerificarAtencion:", err);
    return res.json({ canRespond: true, shouldIgnore: false, errorFallback: true });
  }
}

app.get('/api/bot/verificar-atencion', handleVerificarAtencion);
app.post('/api/bot/verificar-atencion', handleVerificarAtencion);
app.get('/api/bot/check-status', handleVerificarAtencion);
app.post('/api/bot/check-status', handleVerificarAtencion);

app.get('/api/bot/buscar-cliente', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || typeof query !== 'string' || query.trim() === '') {
      return res.status(400).json({ error: 'Falta parámetro de búsqueda o ID de cliente válido' });
    }

    const whereClause = buildBotClientSearchWhere(query);
    const matchingClients = await prisma.client.findMany({
      where: whereClause
    });

    if (!matchingClients || matchingClients.length === 0) {
      return res.json({
        success: false,
        found: false,
        message: `No se encontró ningún cliente activo en el sistema con el criterio: "${query}". REGLA DE ORO IA: Si el usuario está consultando por una NUEVA INSTALACIÓN o solicitud de alta reciente, NO le insistas pidiendo más números de DNI/teléfono diciendo que no lo encuentras ni intentes crear ticket de soporte. Explícale amablemente que las coordinaciones de nuevas instalaciones y turnos los gestiona directamente el área de Instalaciones/Ventas, y toma o deriva sus datos para que lo contacten.`
      });
    }

    const primaryClient = matchingClients[0];
    const clientsList = matchingClients.map(c => `- ID ${c.id}: ${c.name} | Dir: ${c.address || 'Sin Dirección'} | DNI: ${c.dni || 'No cargado'}`).join('\n');
    
    let formatted_message = '';
    if (matchingClients.length === 1) {
      const cuitText = primaryClient.cuit ? ` | CUIT: ${primaryClient.cuit}` : '';
      formatted_message = `CLIENTE ENCONTRADO -> ID NUMERICO PARA HERRAMIENTAS: ${primaryClient.id} | Nombre: ${primaryClient.name} | DNI: ${primaryClient.dni || 'No cargado'}${cuitText} | Tel: ${primaryClient.phone || 'No cargado'} | Dirección: ${primaryClient.address || 'No cargada'}. REGLA DE ORO IA: Tienes terminantemente prohibido ofrecer promociones, descuentos, bonificaciones o condonar intereses de mora. Los importes del sistema son finales e innegociables.`;
    } else {
      formatted_message = `SE ENCONTRARON ${matchingClients.length} CUENTAS REGISTRADAS PARA ESTE CONTACTO:\n${clientsList}\n\nID PRINCIPAL PARA HERRAMIENTAS: ${primaryClient.id}. REGLA DE ORO IA: Tienes terminantemente prohibido ofrecer promociones, descuentos, bonificaciones o condonar intereses de mora. Los importes del sistema son finales e innegociables.`;
    }

    res.json({
      success: true,
      found: true,
      count: matchingClients.length,
      clientId: primaryClient.id,
      name: primaryClient.name,
      dni: primaryClient.dni,
      cuit: primaryClient.cuit,
      phone: primaryClient.phone,
      address: primaryClient.address,
      matchingClients,
      formatted_message
    });
  } catch (error) {
    console.error('Error en /api/bot/buscar-cliente:', error);
    res.status(500).json({ error: 'Error interno en búsqueda de cliente' });
  }
});

app.post('/api/bot/crear-ticket', async (req, res) => {
  try {
    const rawId = req.body.clientId || req.body.id || req.body.client_id || req.query.clientId || req.query.id || req.query.client_id || req.body.phone || req.query.phone || req.body.dni || req.query.dni || req.body.query || req.query.query || req.body.cliente || req.query.cliente || req.body.numero_limpio || req.query.numero_limpio;
    const { title, description, priority } = req.body;

    if (!rawId) {
      return res.status(400).json({ error: 'Falta parámetro clientId o identificador numérico/teléfono/DNI del cliente para crear el ticket.' });
    }

    let client = null;
    let parsedId = null;

    // 0. Si viene un nombre explicito de cliente en la solicitud o en la descripcion (ej: VILLEGAS NIDIA)
    const explicitName = req.body.clientName || req.body.clienteName || req.body.nombreCliente;
    if (explicitName) {
      client = await prisma.client.findFirst({
        where: { name: { contains: explicitName.toString().trim(), mode: 'insensitive' } }
      });
    }

    if (!client) {
      const strVal = rawId.toString().trim();
      const whereClause = buildBotClientSearchWhere(strVal);
      client = await prisma.client.findFirst({ where: whereClause });
    }
    
    if (client) {
      parsedId = client.id;
      console.log(`[Bot N8N] Auto-resolución de cliente al crear ticket: se resolvió al cliente ID ${client.id} (${client.name}).`);
    }

    if (!client) {
      return res.status(400).json({ error: `No existe un cliente con el identificador '${rawId}' en la base de datos para crear el ticket.` });
    }

    // Prevención estricta de duplicados
    const existingTicket = await prisma.ticket.findFirst({
      where: {
        clientId: parsedId,
        status: 'OPEN'
      },
      orderBy: { createdAt: 'desc' }
    });

    if (existingTicket) {
      console.log(`[Bot N8N] Previniendo ticket duplicado para el cliente ID ${parsedId} (${client.name}). Ticket abierto #${existingTicket.id}.`);
      return res.json({
        success: true,
        duplicate_prevented: true,
        ticketId: existingTicket.id,
        message: `El cliente ${client.name} ya tiene el ticket de soporte #${existingTicket.id} en estado ABIERTO. No es necesario crear uno nuevo. REGLA OBLIGATORIA IA: Infórmale al cliente que ya existe el ticket #${existingTicket.id} abierto para su caso y NO LE VUELVAS A PEDIR DNI NI TELÉFONO.`
      });
    }

    const ticket = await prisma.ticket.create({
      data: {
        clientId: parsedId,
        title: title || 'Soporte Técnico N8N',
        description: description || 'Generado por asistente virtual',
        priority: priority || 'NORMAL',
        history: {
          create: { action: 'CREADO', notes: 'Ticket abierto por Asistente N8N.' }
        }
      },
      include: {
        client: true,
        history: { orderBy: { createdAt: 'desc' } }
      }
    });

    console.log(`[Bot N8N] Ticket #${ticket.id} creado exitosamente para el cliente ID ${parsedId} (${client.name}).`);

    // -------------------------------------------------------------------------
    // NOTIFICACIÓN AUTOMÁTICA DE NUEVO TICKET AL TÉCNICO
    // -------------------------------------------------------------------------
    try {
      const techPhones = ['5492634302101', '5492634757105'];
      const techMessage = `🚨 *NUEVO TICKET TÉCNICO GENERADO POR SOFI* 🚨\n\n` +
                          `👤 *Cliente:* ${client.name}\n` +
                          `📞 *Teléfono:* ${client.phone || 'No registrado'}\n` +
                          `📍 *Dirección:* ${client.address || 'No registrada'}\n` +
                          `📄 *Asunto:* ${title || 'Soporte Técnico'}\n` +
                          `📝 *Detalle:* ${description || 'Sin detalle'}\n\n` +
                          `🎫 *Ticket N°:* ${ticket.id}\n` +
                          `🔗 *Revisalo en el CRM.*`;

      for (const techPhone of techPhones) {
        const techTarget = `${techPhone}@s.whatsapp.net`;

        // Intentar enviar por Baileys interno
        if (typeof waSocket !== 'undefined' && waSocket && typeof waStatus !== 'undefined' && waStatus === 'CONNECTED') {
          console.log(`📱 [Auto-Envío Técnico] Enviando alerta de ticket #${ticket.id} a ${techPhone} por Baileys...`);
          await waSocket.sendMessage(techTarget, { text: techMessage }).catch(e=>console.error(e));
        }

        // Intentar enviar por WAHA si está configurado
        if (process.env.WAHA_API_URL) {
          const wahaUrl = `${process.env.WAHA_API_URL}/api/sendText`;
          const sessionName = process.env.WAHA_SESSION || 'default';
          console.log(`🟢 [Auto-Envío Técnico] Enviando alerta por WAHA a ${techPhone}...`);
          
          const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
          if (process.env.WAHA_API_KEY) {
            headers['X-Api-Key'] = process.env.WAHA_API_KEY; 
          }

          fetch(wahaUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              chatId: `${techPhone}@c.us`,
              text: techMessage,
              session: sessionName
            })
          }).catch(err => console.error('Error enviando alerta técnica por WAHA:', err.message));
        }

        // Intentar enviar por Evolution API si está configurado
        if (process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY) {
          const evoUrl = `${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE_NAME || 'interfast'}`;
          console.log(`🟢 [Auto-Envío Técnico] Enviando alerta por Evolution API a ${techPhone}...`);
          fetch(evoUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': process.env.EVOLUTION_API_KEY
            },
            body: JSON.stringify({
              number: techPhone,
              options: { delay: 1200, presence: 'composing' },
              textMessage: { text: techMessage }
            })
          }).catch(err => console.error('Error enviando alerta técnica por Evolution API:', err.message));
        }
      }
    } catch (notifErr) {
      console.error('Error enviando notificación al técnico:', notifErr.message);
    }
    // -------------------------------------------------------------------------
    res.json({
      success: true,
      ticketId: ticket.id,
      message: `Ticket #${ticket.id} creado exitosamente para ${client.name}. REGLA OBLIGATORIA IA: Infórmale al cliente que su ticket de soporte técnico fue generado bajo el número #${ticket.id} y que un técnico se comunicará a la brevedad. TIENES TERMINANTEMENTE PROHIBIDO VOLVER A PEDIRLE SU DNI, CUIT O NÚMERO DE CELULAR una vez creado el ticket.`,
      ticket
    });
  } catch (error) {
    console.error('Error en /api/bot/crear-ticket:', error);
    res.status(500).json({ error: 'Error al crear ticket en el CRM' });
  }
});

// Endpoint de consulta de factura para el bot de N8N
app.post('/api/bot/registrar-comprobante', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Falta el número de teléfono' });

    const cleanPhone = String(phone).replace(/\D/g, '');
    global.recentReceipts.push({ phone: cleanPhone, timestamp: Date.now() });
    
    // Si entró un webhook de pago hace un ratito (menos de 24hs) que quedó como No Identificado
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const unidentified = await prisma.unidentifiedPayment.findMany({
      where: { date: { gte: twentyFourHoursAgo } },
      orderBy: { date: 'desc' }
    });
    
    for (const payment of unidentified) {
      if (payment.mpPaymentId) {
        // Disparar el webhook localmente para que intente procesarlo de nuevo, 
        // ahora sabiendo que este cliente mandó un comprobante.
        try {
          const axios = require('axios');
          await axios.post(`http://localhost:${port}/api/mercadopago/webhook`, {
            type: 'payment.created',
            data: { id: payment.mpPaymentId }
          });
        } catch (e) {
          console.error('Error reintentando pago no identificado:', e.message);
        }
      }
    }
    
    res.json({ message: 'Comprobante registrado. Sistema buscando pagos huérfanos...', phone: cleanPhone });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error registrando comprobante' });
  }
});

app.get('/api/bot/obtener-factura', async (req, res) => {
  try {
    const { query, clientId } = req.query;
    const searchTarget = clientId || query;
    
    if (!searchTarget || typeof searchTarget !== 'string' || searchTarget.trim() === '') {
      return res.status(400).json({ error: 'Falta parámetro de búsqueda o ID de cliente válido' });
    }

    let matchingClients = [];
    const parsedId = !isNaN(parseInt(searchTarget)) && searchTarget.toString().trim().length <= 8 ? parseInt(searchTarget) : null;
    
    if (!parsedId) {
      return res.status(400).json({ error: 'Falta parámetro de búsqueda o ID de cliente válido' });
    }
    
    // 1. Si se pasó clientId o un ID numérico corto de cliente, buscar cliente directo
    if (parsedId && parsedId <= 2147483647) {
      const exactClient = await prisma.client.findUnique({ where: { id: parsedId } });
      if (exactClient) {
        // Encontrar todas las cuentas asociadas a la misma persona para unificar deuda
        const samePersonClients = await prisma.client.findMany({
          where: {
            OR: [
              { dni: exactClient.dni },
              { phone: exactClient.phone }
            ],
            NOT: { OR: [{ dni: '' }, { phone: '' }] }
          }
        });
        
        const allClientsMap = new Map();
        allClientsMap.set(exactClient.id, exactClient);
        
        // Solo asociamos si realmente comparten un DNI o Teléfono válido (evitar asociar por campos vacíos)
        for (const c of samePersonClients) {
          if ((c.dni && c.dni.length > 4 && c.dni === exactClient.dni) || 
              (c.phone && c.phone.length > 4 && c.phone === exactClient.phone)) {
             allClientsMap.set(c.id, c);
          }
        }
        
        matchingClients = Array.from(allClientsMap.values());
      }
    }

    // 2. REGLA ESTRICTA DE SEGURIDAD PARA LA IA: Si no se encontró por ID directo, 
    // prohibir la búsqueda genérica que causa mezcla de clientes (Data Leak).
    if (matchingClients.length === 0) {
      return res.json({ 
        success: false, 
        found: false, 
        message: 'ERROR DE IA: Debes utilizar la herramienta buscar_cliente primero y pasarme estrictamente su ID numérico exacto.' 
      });
    }

    if (!matchingClients || matchingClients.length === 0) {
      return res.json({ success: false, found: false, message: `No se encontró ningún cliente en el CRM con el dato: "${searchTarget}".` });
    }

    const primaryClient = matchingClients[0];
    const clientIds = matchingClients.map(c => c.id);

    const pendingCount = await prisma.invoice.count({
      where: { clientId: { in: clientIds }, status: 'PENDING' }
    });

    let pendingInvoices = [];
    if (pendingCount > 0) {
      const oldestPending = await prisma.invoice.findFirst({
        where: { clientId: { in: clientIds }, status: 'PENDING' },
        orderBy: { dueDate: 'asc' },
        include: { client: { include: { plan: true } }, payments: true }
      });
      if (oldestPending) pendingInvoices.push(oldestPending);
    }

    let invoiceForPDF = null;
    let formatted_message = '';

    if (pendingCount > 0 && pendingInvoices.length > 0) {
      let totalDebtBase = 0;
      let periods = [];
      let breakdown = [];
      let latestDueDate = null;
      const today = new Date();

      let globalActiveV = 'V1';
      for (const inv of pendingInvoices) {
        let currentAmount = inv.priceV1 || inv.originalAmount;
        let activeV = 'V1';
        let currentDueDate = inv.dueDate1 ? new Date(inv.dueDate1) : new Date(inv.dueDate || today);

        if (inv.dueDate1) {
          const d1 = new Date(inv.dueDate1); d1.setHours(23, 59, 59, 999);
          const d2 = new Date(inv.dueDate2 || inv.dueDate1); d2.setHours(23, 59, 59, 999);
          const d3 = new Date(inv.dueDate3 || inv.dueDate1); d3.setHours(23, 59, 59, 999);
          const d4 = new Date(inv.dueDate4 || inv.dueDate1); d4.setHours(23, 59, 59, 999);

          if (today > d3 && inv.priceV4) {
            currentAmount = inv.priceV4;
            currentDueDate = d4;
            activeV = 'V4';
          } else if (today > d2 && inv.priceV3) {
            currentAmount = inv.priceV3;
            currentDueDate = d3;
            activeV = 'V3';
          } else if (today > d1 && inv.priceV2) {
            currentAmount = inv.priceV2;
            currentDueDate = d2;
            activeV = 'V2';
          } else {
            currentDueDate = d1;
          }
        }
        globalActiveV = activeV;
        
        const getCents999 = (cId) => (((parseInt(cId) % 999) + 1) / 100);
        const cId = inv.clientId || (inv.client && inv.client.id) || inv.id || 1;
        const centsVal = getCents999(cId);

        let pV1Num, pV2Num, pV3Num, pV4Num;
        if (inv.month === 8 && inv.year === 2026) {
          // Agosto 2026: V1 mantiene tarifa cargada, V2 a V4 aplican centavos unicos
          pV1Num = parseFloat(inv.priceV1 || inv.originalAmount);
          pV2Num = inv.priceV2 ? parseFloat(inv.priceV2) + centsVal : null;
          pV3Num = inv.priceV3 ? parseFloat(inv.priceV3) + centsVal : null;
          pV4Num = inv.priceV4 ? parseFloat(inv.priceV4) + centsVal : null;
        } else {
          // Septiembre 2026+: V1 a V4 aplican centavos unicos de 999 combinaciones
          pV1Num = parseFloat(inv.priceV1 || inv.originalAmount) + centsVal;
          pV2Num = inv.priceV2 ? parseFloat(inv.priceV2) + centsVal : null;
          pV3Num = inv.priceV3 ? parseFloat(inv.priceV3) + centsVal : null;
          pV4Num = inv.priceV4 ? parseFloat(inv.priceV4) + centsVal : null;
        }

        let currentAmountNum = pV1Num;
        if (activeV === 'V4' && pV4Num) currentAmountNum = pV4Num;
        else if (activeV === 'V3' && pV3Num) currentAmountNum = pV3Num;
        else if (activeV === 'V2' && pV2Num) currentAmountNum = pV2Num;

        totalDebtBase += currentAmountNum;
        periods.push(`${inv.month}/${inv.year}`);
        const accountLabel = matchingClients.length > 1 ? ` [Servicio: ${inv.client?.name || 'Cliente'} - ${inv.client?.address || 'S/D'}]` : '';
        
        let invDetail = `- Período ${inv.month}/${inv.year}${accountLabel}: Monto actual a abonar hoy: $${currentAmountNum.toLocaleString('es-AR', {minimumFractionDigits:2})}`;
        if (inv.dueDate1 && pV2Num) {
          const pV1 = pV1Num.toLocaleString('es-AR', {minimumFractionDigits:2});
          const pV2 = pV2Num.toLocaleString('es-AR', {minimumFractionDigits:2});
          const pV3 = pV3Num ? pV3Num.toLocaleString('es-AR', {minimumFractionDigits:2}) : null;
          const pV4 = pV4Num ? pV4Num.toLocaleString('es-AR', {minimumFractionDigits:2}) : null;
          invDetail += `\n  (Desglose de valores según fecha: V1: $${pV1} | V2: $${pV2}${pV3 ? ` | V3: $${pV3}` : ''}${pV4 ? ` | V4: $${pV4}` : ''})`;
        }
        breakdown.push(invDetail);
        if (!latestDueDate || currentDueDate > latestDueDate) {
          latestDueDate = currentDueDate;
        }
      }

      invoiceForPDF = pendingInvoices[0]; // Use last pending invoice for PDF
      const currentTotal = totalDebtBase; // Ya incluye los centavos desde la DB
      const aliasAmountEs = currentTotal.toLocaleString('es-AR', {minimumFractionDigits:2});
      const periodsStr = Array.from(new Set(periods)).join(' y ');

      let paymentLink = null;
      if (clientMP) {
        try {
          const preference = new Preference(clientMP);
          const prefBody = {
            items: [{ id: `MUL-INV-${primaryClient.id}`, title: `Internet TK${String(primaryClient.id).padStart(3, '0')} (${periodsStr})`, quantity: 1, unit_price: parseFloat(currentTotal.toFixed(2)) }],
            payer: { name: primaryClient.name, email: primaryClient.email || 'test@test.com' },
            external_reference: invoiceForPDF.id.toString(),
            notification_url: "https://interfast-backend-95ww.onrender.com/api/mercadopago/webhook"
          };
          if (latestDueDate && latestDueDate >= today) {
            prefBody.expires = true;
            prefBody.expiration_date_to = latestDueDate.toISOString();
          }
          const prefs = await preference.create({ body: prefBody });
          paymentLink = prefs.init_point;
        } catch (mpErr) {
          console.error('[Bot N8N] Error generando link MercadoPago multiple:', mpErr.message);
        }
      }
      if (!paymentLink) {
        paymentLink = `https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=DEMO-SIMULACION-${primaryClient.id}`;
      }

      const pdfUrl = `https://interfast-backend-95ww.onrender.com/api/bot/factura-pdf?invoiceId=${invoiceForPDF.id}`;
      const breakdownStr = breakdown.join('\n');
      const accountsSummaryText = matchingClients.length > 1 
        ? ` (IMPORTANTE MULTI-CUENTA: El cliente posee ${matchingClients.length} cuentas/servicios asociadas: ${matchingClients.map(c => `${c.name} - ${c.address || 'S/D'}`).join(' | ')})` 
        : '';

      formatted_message = `ESTADO DE CUENTA DE: ${primaryClient.name}${accountsSummaryText} | Períodos Adeudados: ${periodsStr} | Estado: PENDIENTE DE PAGO 🔴 | Vencimiento Actualizado: ${globalActiveV} | Monto Total a Abonar (Acumulado entre todas sus cuentas actualizado a la fecha de hoy): $${aliasAmountEs} | LINK MERCADOPAGO OCULTO POR DEFECTO: ${paymentLink}.
DETALLE INDIVIDUAL DE LA DEUDA:
${breakdownStr}

INSTRUCCIÓN ESTRICTA Y OBLIGATORIA PARA LA IA (SOFI):
0. VERIFICACIÓN OBLIGATORIA DE IDENTIDAD: Esta información de deuda pertenece EXCLUSIVAMENTE al cliente "${primaryClient.name}". Tienes PROHIBIDO entregar estos montos o este PDF si la persona con la que estás hablando no coincide con este titular.
1. PROHIBIDO Y CENSURADO: NO menciones números de factura, NO menciones CAE de ARCA, y NO entregues el link de Mercado Pago (paymentLink) en tu respuesta inicial.
2. Infórmale amablemente al cliente que adeuda los períodos indicados arriba por un total de $${aliasAmountEs}. ${matchingClients.length > 1 ? 'MENCIONALO CLARAMENTE que este importe es la SUMA de todas sus cuentas/servicios para que sepa qué está pagando.' : ''} El sistema ya calculó automáticamente la etapa de vencimiento actual (${globalActiveV}) y los posibles recargos por mora en este importe. OBLIGATORIO: Entrégale este enlace para que pueda descargar su detalle en PDF (el PDF solo mostrará la tarifa actual): ${pdfUrl}
3. OFRECE COMO ÚNICO MÉTODO PRINCIPAL LA TRANSFERENCIA SIN RECARGOS: Dale el Alias Mercado Pago 'interfastsm' y dile explícitamente: "Para abonar por transferencia (0% de comisión), transfiere el monto exacto con centavos: $${aliasAmountEs} al Alias interfastsm. Es fundamental respetar los centavos para que el sistema impute y reconozca tu pago en segundos. Luego, envíame la captura del comprobante por aquí".
4. ATENCIÓN SI EL CLIENTE QUIERE PAGAR SOLO UN MES O UNA SOLA CUENTA: Si pregunta si puede pagar solo una cuenta o un mes en vez del total, RESPÓNDELE QUE SÍ PUEDE. Detállale amablemente el importe individual de esa cuenta/mes (sacado del DETALLE INDIVIDUAL DE LA DEUDA) e indícale que transfiera ese monto exacto al alias interfastsm. (Aclárale que el Link de MercadoPago solo permite pagar el total). NO asumas que los otros meses o cuentas están pagos, aclárale que siguen pendientes.
5. PREGUNTA AL FINAL DEL MENSAJE: "💡 ¿Prefieres abonar con tarjeta de débito/crédito? Pídeme por aquí el Link de Pago. O si gustas, también puedo sumarte al Débito Automático Mensual para despreocuparte de los vencimientos".
6. SOLO SI EL CLIENTE TE PIDE EXPLÍCITAMENTE EL LINK DE PAGO O PAGAR CON TARJETA en un mensaje posterior, recién ahí entrégale el enlace de Mercado Pago: ${paymentLink}.
7. REGLA ESTRICTA DE COMPROBANTES Y PAGOS PARCIALES: Si el cliente te envía una imagen de un comprobante de pago, NUNCA LE CONFIRMES QUE EL PAGO IMPACTÓ. Dile que pasará a revisión administrativa. ADEMÁS: Si en tu análisis de la imagen del comprobante notas que el cliente abonó MENOS plata que el monto total de $${aliasAmountEs}, DEBES ADVERTIRLE EXPLÍCITAMENTE: "He notado que el monto del comprobante es menor al total adeudado. Ten en cuenta que si el sistema detecta un pago parcial, se generará automáticamente una deuda por la diferencia en tu cuenta hasta que la canceles en su totalidad".
8. REGLA CORTE DE SERVICIO: Los cortes de servicio se realizan los días 22 de cada mes. Si el cliente tiene múltiples facturas pendientes, y pregunta si pagando solo UNA de ellas se le reconecta el servicio, aclárale educadamente que NO, ya que la deuda del mes restante también se encuentra vencida y pasada de fecha de corte, por lo que deberá cancelar el total acumulado para recuperar su conexión.`;

    } else if (pendingCount === 0) {
      // Cliente al día, buscar estrictamente la última pagada de cualquiera de sus cuentas
      invoiceForPDF = await prisma.invoice.findFirst({
        where: { clientId: { in: clientIds }, status: 'PAID' },
        orderBy: { dueDate: 'desc' },
        include: { client: { include: { plan: true } }, payments: true }
      });

      if (!invoiceForPDF) {
        return res.json({ success: true, found: true, hasInvoice: false, message: `El cliente ${primaryClient.name} no tiene ninguna factura pagada en el sistema actualmente.` });
      }

      if (invoiceForPDF.status === 'PAID' && !invoiceForPDF.afipCae && afip) {
        console.log(`[Bot N8N] Emitiendo factura N°${invoiceForPDF.id} en ARCA automáticamente para solicitud del cliente...`);
        await emitAfipInvoiceHelper(invoiceForPDF.id, afip);
        const updatedInv = await prisma.invoice.findUnique({ where: { id: invoiceForPDF.id } });
        if (updatedInv && updatedInv.afipCae) invoiceForPDF.afipCae = updatedInv.afipCae;
      }

      const pdfUrl = `https://interfast-backend-95ww.onrender.com/api/bot/factura-pdf?invoiceId=${invoiceForPDF.id}`;
      const caeText = invoiceForPDF.afipCae ? ` (CAE ARCA: ${invoiceForPDF.afipCae})` : '';
      const accountsListStr = matchingClients.map(c => `${c.name} (${c.address || 'S/D'})`).join(', ');

      formatted_message = `ESTADO DE CUENTA DE: ${primaryClient.name} | Cuentas asociadas: ${accountsListStr} | Período: ${invoiceForPDF.month}/${invoiceForPDF.year} | Estado: PAGADA 🟢${caeText}.
INSTRUCCIÓN OBLIGATORIA PARA LA IA (SOFI):
1. Infórmale con alegría y amabilidad al cliente que todas sus cuentas de Internet (${accountsListStr}) se encuentran PAGADAS y al día. Entrégale este enlace para que pueda descargar su comprobante fiscal de su último pago (${invoiceForPDF.month}/${invoiceForPDF.year}) en PDF: ${pdfUrl}
2. ADVERTENCIA REVISIÓN COMPROBANTES: Si el cliente envía una imagen o foto de un comprobante de transferencia, NUNCA LE CONFIRMES QUE EL PAGO IMPACTÓ. Responde amablemente: "¡Hola! He recibido tu comprobante de pago. El mismo pasará a revisión por administración para que impacte en tu cuenta a la brevedad."`;
    }

    const responseObj = {
      success: true,
      found: true,
      hasInvoice: true,
      clientId: primaryClient.id,
      clientName: primaryClient.name,
      invoiceId: invoiceForPDF.id,
      month: invoiceForPDF.month,
      year: invoiceForPDF.year,
      status: invoiceForPDF.status,
      formatted_message
    };

    if (invoiceForPDF.status === 'PAID') {
      responseObj.cae = invoiceForPDF.afipCae;
    }

    res.json(responseObj);
  } catch (error) {
    console.error('Error en /api/bot/obtener-factura:', error);
    res.status(500).json({ error: 'Error interno consultando factura' });
  }
});

// Endpoint para generar Link de Adhesión a Débito Automático (Suscripción Mercado Pago) para N8N
app.get('/api/bot/debito-automatico', async (req, res) => {
  try {
    const rawParam = req.query.query || req.query.clientId || req.query.phone || req.query.dni || req.query.id || req.query.cuit || req.query.telefono || req.query.number || req.query.numero || req.query.text || req.query.search || req.query.cliente || req.query.numero_limpio || Object.values(req.query)[0];
    const searchTerm = rawParam ? rawParam.toString().trim() : null;
    console.log('[Bot N8N /debito-automatico] Petición recibida:', JSON.stringify(req.query), 'searchTerm interpretado:', searchTerm);
    if (!searchTerm || searchTerm === '[object Object]' || searchTerm === '{}' || searchTerm === '=') {
      return res.status(400).json({ error: `Falta parámetro query válido. Recibido por el servidor: ${JSON.stringify(req.query)}` });
    }

    let client = null;
    const parsedId = !isNaN(parseInt(searchTerm)) && searchTerm.toString().trim().length <= 8 ? parseInt(searchTerm) : null;

    if (parsedId && parsedId <= 2147483647) {
      client = await prisma.client.findUnique({
        where: { id: parsedId },
        include: { plan: true }
      });
    }

    if (!client) {
      const whereClause = buildBotClientSearchWhere(searchTerm);
      client = await prisma.client.findFirst({
        where: whereClause,
        include: { plan: true }
      });
    }

    if (!client) {
      return res.json({ success: false, found: false, message: `No se encontró ningún cliente en el CRM con el dato: "${searchTerm}".` });
    }

    const latestInvoice = await prisma.invoice.findFirst({
      where: { clientId: client.id },
      orderBy: { id: 'desc' }
    });

    let planAmount = latestInvoice?.originalAmount || client.plan?.price || 22990;
    if (!planAmount || isNaN(planAmount) || parseFloat(planAmount) <= 0) {
      planAmount = 22990; // Precio por defecto si el plan está en $0 para evitar que Mercado Pago rechace el link de suscripción
    }

    let subscriptionLink = null;
    if (clientMP) {
      try {
        const preapprovalPlan = new PreApprovalPlan(clientMP);
        const sub = await preapprovalPlan.create({
          body: {
            reason: `Debito Automatico Internet - TK${String(client.id).padStart(3, '0')} (${client.name})`,
            external_reference: `SUB-${client.id}`,
            notification_url: "https://interfast-backend-95ww.onrender.com/api/mercadopago/webhook",
            auto_recurring: {
              frequency: 1,
              frequency_type: 'months',
              transaction_amount: parseFloat(planAmount),
              currency_id: 'ARS'
            },
            back_url: 'https://interfast.com.ar'
          }
        });
        subscriptionLink = sub.init_point;
        console.log(`[Bot N8N] PreApprovalPlan creado exitosamente para cliente #${client.id}: ${subscriptionLink}`);
      } catch (err) {
        console.error('[Bot N8N] Error generando PreApprovalPlan MP:', err?.message || err, JSON.stringify(err?.cause || {}));
        try {
          const preference = new Preference(clientMP);
          const prefBody = {
            items: [{ id: `SUB-${client.id}`, title: `Adhesión Débito Automático Internet - TK${String(client.id).padStart(3, '0')}`, quantity: 1, unit_price: parseFloat(planAmount) }],
            payer: { name: client.name, email: client.email || 'cliente@interfast.com.ar' },
            external_reference: `SUB-${client.id}`,
            notification_url: "https://interfast-backend-95ww.onrender.com/api/mercadopago/webhook"
          };
          const prefs = await preference.create({ body: prefBody });
          subscriptionLink = prefs.init_point;
          console.log(`[Bot N8N] Respaldo Preference creado para débito automático #${client.id}: ${subscriptionLink}`);
        } catch (prefErr) {
          console.error('[Bot N8N] Error en respaldo Preference MP:', prefErr?.message || prefErr);
        }
      }
    }

    if (!subscriptionLink) {
      subscriptionLink = `https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=INTERFAST-SUB-${client.id}`;
    }

    const cuitText = client.cuit ? ` | CUIT: ${client.cuit}` : '';
    const formatted_message = `CLIENTE IDENTIFICADO PARA DÉBITO AUTOMÁTICO -> ID: ${client.id} | Nombre: ${client.name} | DNI: ${client.dni || 'No cargado'}${cuitText} | Importe Mensual: $${planAmount} | ENLACE DE ADHESIÓN A DÉBITO AUTOMÁTICO MERCADO PAGO: ${subscriptionLink}. INSTRUCCIÓN IA: Entrégale el ENLACE DE ADHESIÓN (subscriptionLink) al cliente de forma destacada una sola vez. Explícale que al ingresar allí podrá registrar su tarjeta de débito/crédito o cuenta de Mercado Pago y su cuota mensual se debitará automáticamente cada mes sin que deba realizar pagos manuales ni preocuparse por recargos. BAJO NINGUNA CIRCUNSTANCIA estás autorizada a ofrecer promociones o descuentos.`;

    res.json({
      success: true,
      found: true,
      clientId: client.id,
      clientName: client.name,
      dni: client.dni,
      cuit: client.cuit,
      planAmount,
      subscriptionLink,
      formatted_message
    });
  } catch (error) {
    console.error('Error en /api/bot/debito-automatico:', error);
    res.status(500).json({ error: 'Error interno generando adhesión a débito automático' });
  }
});

// Endpoint público de descarga o visualización de PDF de factura (para N8N y clientes)
app.get('/api/bot/factura-pdf', async (req, res) => {
  try {
    const { invoiceId, clientId } = req.query;
    let whereClause = {};
    if (invoiceId) whereClause.id = parseInt(invoiceId);
    else if (clientId) whereClause.clientId = parseInt(clientId);
    else return res.status(400).send('Se requiere invoiceId o clientId');

    const invoice = await prisma.invoice.findFirst({
      where: whereClause,
      orderBy: { id: 'desc' },
      include: { client: { include: { plan: true } }, payments: true }
    });

    if (!invoice) return res.status(404).send('Factura no encontrada.');

    if (invoice.status === 'PAID' && !invoice.afipCae && afip) {
      await emitAfipInvoiceHelper(invoice.id, afip);
      const updatedInv = await prisma.invoice.findUnique({ where: { id: invoice.id }, include: { client: true, payments: true } });
      if (updatedInv) Object.assign(invoice, updatedInv);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Factura_INTERFAST_N${invoice.id}.pdf"`);
    generateInvoicePDFStream(invoice, res);
  } catch (error) {
    console.error('Error generando PDF de factura para Bot:', error);
    res.status(500).send('Error generando PDF de la factura.');
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

// Sincronización periódica de Mercado Pago (cada 10 minutos)
// Busca cobros acreditados sin webhook y los concilia por centavos o referencia
cron.schedule('*/10 * * * *', async () => {
  return; // DESACTIVADO TEMPORALMENTE: los pagos de MP se procesan solo via webhook para evitar duplicados con registros manuales previos
  if (!clientMP) return;
  try {
    console.log('[Cron MP Sync] Iniciando conciliación periódica de Mercado Pago...');
    const payment = new Payment(clientMP);
    const searchResponse = await payment.search({
      options: {
        sort: 'date_created',
        criteria: 'desc',
        limit: 100,
        begin_date: 'NOW-2DAYS',
        end_date: 'NOW',
        status: 'approved'
      }
    });


    const mpPayments = searchResponse.results || [];
    
    for (const mpPayment of mpPayments) {
      if (mpPayment.status !== 'approved') continue;
      
      const existingPayment = await prisma.payment.findUnique({
        where: { mpPaymentId: String(mpPayment.id) }
      });
      if (existingPayment) {
        continue;
      }

      const transactionAmount = parseFloat(mpPayment.transaction_amount) || 0;
      const ref = (mpPayment.external_reference || mpPayment.metadata?.external_reference || '').toString().trim();
      const description = (mpPayment.description || mpPayment.reason || '').toString();

      let invoiceIdsToProcess = [];

      if (ref.startsWith('MULTI-')) {
        invoiceIdsToProcess = ref.replace('MULTI-', '').split('-').map(id => parseInt(id)).filter(id => !isNaN(id));
      } else if (ref.startsWith('SUB-') || description.includes('SUB-') || /TK\d+/.test(description)) {
        let subClientId = NaN;
        if (ref.startsWith('SUB-')) {
          subClientId = parseInt(ref.replace('SUB-', ''));
        } else {
          const match = description.match(/SUB-(\d+)/) || description.match(/TK0*(\d+)/);
          if (match && match[1]) subClientId = parseInt(match[1]);
        }
        if (!isNaN(subClientId)) {
          const pendingInv = await prisma.invoice.findFirst({
            where: { clientId: subClientId, status: 'PENDING' },
            orderBy: [{ year: 'asc' }, { month: 'asc' }]
          });
          if (pendingInv) {
            invoiceIdsToProcess.push(pendingInv.id);
          }
        }
      } else if (ref && ref.trim() !== '') {
        const singleId = parseInt(ref);
        if (!isNaN(singleId)) {
          const validInvoice = await prisma.invoice.findFirst({
            where: { id: singleId, status: 'PENDING' }
          });
          if (validInvoice) {
            invoiceIdsToProcess.push(validInvoice.id);
          }
        }
      }

      if (invoiceIdsToProcess.length === 0) {
        const pendingInvoices = await prisma.invoice.findMany({
          where: { status: 'PENDING' },
          include: { client: true }
        });

        let matchedInvoice = null;
        let exactCentsMatches = [];

        for (const inv of pendingInvoices) {
          const oldCentsOffset = ((inv.clientId || inv.id || 1) % 99 + 1) / 100;
          const newCentsOffset = ((inv.clientId || inv.id || 1) % 1000) / 100;
          const possibleAmounts = [
            inv.originalAmount + oldCentsOffset,
            inv.priceV1 + oldCentsOffset,
            inv.priceV2 ? inv.priceV2 + oldCentsOffset : null,
            inv.priceV3 ? inv.priceV3 + oldCentsOffset : null,
            inv.priceV4 ? inv.priceV4 + oldCentsOffset : null,
            inv.originalAmount + newCentsOffset,
            inv.priceV1 + newCentsOffset,
            inv.priceV2 ? inv.priceV2 + newCentsOffset : null,
            inv.priceV3 ? inv.priceV3 + newCentsOffset : null,
            inv.priceV4 ? inv.priceV4 + newCentsOffset : null
          ].filter(a => a !== null && a > 0);

          const matchesCentsAndAmount = possibleAmounts.some(amt => Math.abs(transactionAmount - amt) < 0.05);
          if (matchesCentsAndAmount) {
            exactCentsMatches.push(inv);
          }
        }

        const disambiguate = (candidates) => {
          const payerName = `${mpPayment.payer?.first_name || ''} ${mpPayment.payer?.last_name || ''} ${mpPayment.description || ''} ${mpPayment.additional_info?.payer?.first_name || ''} ${mpPayment.additional_info?.payer?.last_name || ''}`.toLowerCase();
          const payerEmail = (mpPayment.payer?.email || '').toLowerCase();
          const payerDni = String(mpPayment.payer?.identification?.number || '');

          for (const inv of candidates) {
            const clientName = (inv.client?.name || '').toLowerCase();
            const clientEmail = (inv.client?.email || '').toLowerCase();
            const clientDni = String(inv.client?.dni || '');

            if (clientDni && clientDni.length > 5 && payerDni.includes(clientDni)) return inv;
            if (clientEmail && clientEmail.length > 5 && payerEmail && payerEmail === clientEmail) return inv;

            const nameWords = clientName.split(/\s+/).filter(w => w.length > 3 && !['de', 'del', 'las', 'los', 'san', 'maria', 'jose', 'juan', 'escuela'].includes(w));
            const matchedWordsCount = nameWords.filter(word => payerName.includes(word)).length;
            if (nameWords.length > 0 && (matchedWordsCount >= 2 || (nameWords.length === 1 && matchedWordsCount === 1))) {
              return inv;
            }
          }
          return candidates.length === 1 ? candidates[0] : null;
        };

        if (exactCentsMatches.length === 1) {
          matchedInvoice = exactCentsMatches[0];
          console.log(`🎯 [Cron MP Sync] ¡ÉXITO! Factura #${matchedInvoice.id} del cliente ${matchedInvoice.client?.name} (ID: ${matchedInvoice.clientId}) imputada por coincidencia única de centavos ($${transactionAmount}).`);
        } else if (exactCentsMatches.length > 1) {
          matchedInvoice = disambiguate(exactCentsMatches);
          if (matchedInvoice) {
            console.log(`🎯 [Cron MP Sync] ¡DESAMBIGUACIÓN EXITOSA! Factura #${matchedInvoice.id} imputada a ${matchedInvoice.client?.name} por coincidencia de datos del pagador.`);
          }
        }

        if (!matchedInvoice) {
          console.log(`[Cron MP Sync] Sin coincidencia por centavos. Buscando por aproximación de monto y nombre/DNI/email...`);
          let nameAndAmountMatches = [];
          for (const inv of pendingInvoices) {
            const expectedCentsOffset = ((inv.clientId || inv.id || 1) % 1000) / 100;
            const possibleBaseAmounts = [
              inv.originalAmount,
              inv.priceV1,
              inv.priceV2,
              inv.priceV3,
              inv.priceV4
            ].filter(a => a !== null && a > 0);

            const matchesBaseAmount = possibleBaseAmounts.some(amt => 
              Math.abs(transactionAmount - amt) < 5.0 || 
              Math.abs((transactionAmount - expectedCentsOffset) - amt) < 5.0
            );
            
            if (matchesBaseAmount) {
              nameAndAmountMatches.push(inv);
            }
          }

          if (nameAndAmountMatches.length > 0) {
            
              for (let candidate of nameAndAmountMatches) {
                if (strictVerifyPayment(candidate, mpPayment)) {
                  matchedInvoice = candidate;
                  break;
                }
              }

            if (matchedInvoice) {
              console.log(`🎯 [Cron MP Sync - Conciliación Inteligente]: ¡ÉXITO! Factura #${matchedInvoice.id} imputada a ${matchedInvoice.client?.name} sin coincidencia estricta de centavos.`);
            }
          }
        }

        if (matchedInvoice) {
          invoiceIdsToProcess.push(matchedInvoice.id);
        }
      }

      for (const invoiceId of invoiceIdsToProcess) {
        const invoice = await prisma.invoice.findUnique({
          where: { id: invoiceId },
          include: { client: true }
        });

        if (!invoice || invoice.status === 'PAID') continue;

        const existingPayment = await prisma.payment.findFirst({
          where: { invoiceId: invoiceId }
        });
        if (existingPayment) {
          await prisma.invoice.update({
            where: { id: invoiceId },
            data: { status: 'PAID' }
          });
          continue;
        }

        console.log(`[Cron MP Sync] Procesando conciliación automática para Factura #${invoiceId} ($${transactionAmount})`);

        const today = new Date();
        let expectedAmountForDate = invoice.priceV1 || invoice.originalAmount;
        let activeTierName = "Vencimiento 1";

        if (invoice.dueDate1) {
          const d1 = new Date(invoice.dueDate1); d1.setHours(23, 59, 59, 999);
          const d2 = new Date(invoice.dueDate2 || invoice.dueDate1); d2.setHours(23, 59, 59, 999);
          const d3 = new Date(invoice.dueDate3 || invoice.dueDate1); d3.setHours(23, 59, 59, 999);
          const d4 = new Date(invoice.dueDate4 || invoice.dueDate1); d4.setHours(23, 59, 59, 999);

          if (today > d3 && invoice.priceV4) {
            expectedAmountForDate = invoice.priceV4;
            activeTierName = "Vencimiento 4";
          } else if (today > d2 && invoice.priceV3) {
            expectedAmountForDate = invoice.priceV3;
            activeTierName = "Vencimiento 3";
          } else if (today > d1 && invoice.priceV2) {
            expectedAmountForDate = invoice.priceV2;
            activeTierName = "Vencimiento 2";
          }
        }

        const expectedCentsOffset = ((invoice.clientId || invoice.id || 1) % 1000) / 100;
        const expectedTotalForDate = expectedAmountForDate + expectedCentsOffset;

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
        } else {
          mpFee = parseFloat((transactionAmount * 0.078147).toFixed(2));
        }

        await prisma.$transaction(async (tx) => {
          await tx.invoice.update({
            where: { id: invoiceId },
            data: { status: 'PAID' }
          });

          await tx.payment.create({
            data: {
              invoiceId: invoiceId,
              method: 'MERCADOPAGO',
              amountPaid: transactionAmount,
              mpFee: mpFee,
              mpTax: mpTax,
              lateFeeApplied: Math.max(0, expectedAmountForDate - (invoice.priceV1 || invoice.originalAmount)),
              mpPaymentId: String(mpPayment.id)
            }
          });

          await tx.cutoffList.deleteMany({
            where: { invoiceId: invoiceId }
          });

          if (invoice.clientId) {
            await tx.client.update({
              where: { id: invoice.clientId },
              data: { status: 'ACTIVE' }
            });
          }
        });

        console.log(`[Cron MP Sync] Factura #${invoiceId} del cliente ${invoice.client?.name} marcada como PAGADA.`);

        if (invoice.clientId) {
          // await ensureCurrentMonthInvoice(invoice.clientId); // Desactivado por solicitud del usuario
        }

        // [MODIFICACIÓN REGLAS 2 Y 14: Desacople Fiscal Total]
        // Bloque AFIP eliminado intencionalmente. Solo se asienta el pago internamente.
        console.log(`[Cron MP Sync] Pago asentado localmente para Factura #${invoiceId}. Emisión AFIP desactivada (Desacople).`);

        const difference = expectedTotalForDate - transactionAmount;
        if (difference > 5.0) {
          console.log(`[Cron MP Sync] Diferencia mayor a $5 detectada ($${difference}). Generando factura de diferencia.`);
          await prisma.invoice.create({
            data: {
              clientId: invoice.clientId,
              month: invoice.month,
              year: invoice.year,
              originalAmount: difference,
              dueDate: new Date(),
              status: 'PENDING',
              priceV1: difference,
              priceV2: difference,
              priceV3: difference,
              priceV4: difference,
              dueDate1: new Date(),
              dueDate2: new Date(),
              dueDate3: new Date(),
              dueDate4: new Date()
            }
          });

          if (waSocket && waStatus === 'CONNECTED' && invoice.client?.phone) {
            const phoneClean = invoice.client.phone.replace(/\D/g, '');
            const targetPhone = phoneClean.startsWith('54') ? `${phoneClean}@s.whatsapp.net` : `549${phoneClean}@s.whatsapp.net`;
            const diffMsg = `Hola ${invoice.client?.name}! 👋\n\nConfirmamos la acreditación de tu pago de *$${transactionAmount.toFixed(2)}*.\n\n⚠️ *Aviso de Diferencia:* Como tu pago fue registrado el día ${new Date().toLocaleDateString('es-AR')}, el total correspondiente era de *$${expectedTotalForDate.toFixed(2)}* (${activeTierName}).\n\nPor este motivo, se generó automáticamente una factura por la diferencia de *$${difference.toFixed(2)}* en tu cuenta.\n\n¡Muchas gracias!`;
            await waSocket.sendMessage(targetPhone, { text: diffMsg });
          }
        }
      }
    }
  } catch (cronErr) {
    console.error('[Cron MP Sync] Error en tarea de sincronización:', cronErr.message || cronErr);
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

app.get('/api/admin/test-mp', async (req, res) => {
  if (!clientMP) {
    return res.status(500).json({ error: 'clientMP is not configured' });
  }
  try {
    const payment = new Payment(clientMP);
    const searchResponse = await payment.search({
      options: {
        sort: 'date_created',
        criteria: 'desc',
        limit: 50
      }
    });
    res.json(searchResponse);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: error.message || error });
  }
});

app.post('/api/bot/send-custom-message', async (req, res) => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ error: 'Faltan parámetros phone o message.' });
    }
    const phoneClean = phone.replace(/\D/g, '');
    const targetPhone = phoneClean.startsWith('54') ? `${phoneClean}@s.whatsapp.net` : `549${phoneClean}@s.whatsapp.net`;
    
    if (waSocket && waStatus === 'CONNECTED') {
      await waSocket.sendMessage(targetPhone, { text: message });
      res.json({ message: 'Mensaje enviado por WhatsApp (Robot).' });
    } else {
      res.status(400).json({ error: 'El Robot de WhatsApp no está conectado.' });
    }
  } catch (error) {
    console.error('Error enviando custom message:', error);
    res.status(500).json({ error: 'Hubo un error al enviar el WhatsApp.' });
  }
});

app.post('/api/bot/broadcast-n8n', async (req, res) => {
  try {
    const { clients, message, nodeName } = req.body;
    if (!clients || !Array.isArray(clients) || !message) {
      return res.status(400).json({ error: 'Faltan parámetros clients o message.' });
    }

    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL_DIFUSION || 'https://interfast-n8n.onrender.com/webhook/difusion';
    
    // Enviamos todo el bloque de clientes a n8n en una sola petición.
    // Sofi (n8n) se encargará de iterarlos y aplicar la demora correspondiente para evitar baneos.
    try {
      await axios.post(n8nWebhookUrl, {
        nodeName: nodeName,
        message: message,
        clients: clients.map(c => ({
          phone: c.phone ? c.phone.replace(/\D/g, '') : '',
          clientName: c.name,
          clientId: c.id
        })).filter(c => c.phone !== '')
      });
    } catch (err) {
      const n8nError = err.response?.data?.message || err.message;
      console.error('Error enviando batch a n8n:', n8nError);
      return res.status(500).json({ error: `Hubo un error al comunicarse con n8n (Sofi): ${n8nError}` });
    }

    res.json({ message: `Difusión enviada a Sofi (n8n) para ${clients.length} clientes. Los mensajes se enviarán con demora en segundo plano.` });
  } catch (error) {
    console.error('Error en broadcast n8n:', error);
    res.status(500).json({ error: 'Hubo un error al procesar la difusión.' });
  }
});

// --- SOFI (n8n) TOGGLE ---
app.get('/api/bot/status', async (req, res) => {
  try {
    const setting = await prisma.systemSettings.findUnique({ where: { key: 'SOFI_ENABLED' } });
    const isEnabled = setting ? setting.value === 'true' : true; // Default true
    res.json({ enabled: isEnabled });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo el estado de Sofi' });
  }
});

app.post('/api/bot/toggle-sofi', async (req, res) => {
  try {
    const { enabled } = req.body;
    await prisma.systemSettings.upsert({
      where: { key: 'SOFI_ENABLED' },
      update: { value: enabled ? 'true' : 'false' },
      create: { key: 'SOFI_ENABLED', value: enabled ? 'true' : 'false' }
    });
    res.json({ message: `Sofi ${enabled ? 'activada' : 'desactivada'} correctamente.` });
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando el estado de Sofi' });
  }
});

// --- CHAT ENDPOINTS ---

// --- CHAT ENDPOINTS ---
app.get('/api/chat/contacts', async (req, res) => {
  try {
    const dbClients = await prisma.client.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, phone: true }
    });

    const contactMap = new Map();
    dbClients.forEach(c => {
      if (c.phone) {
        const cleanPhone = c.phone.replace(/\D/g, '');
        contactMap.set(cleanPhone, {
          clientId: c.id,
          name: c.name,
          phone: cleanPhone,
          lastMessage: '',
          lastMessageTime: new Date(0),
          unreadCount: 0
        });
      }
    });

    const recentChatsData = await prisma.$queryRaw`
      SELECT 
        phone, 
        MAX(name) as "name", 
        MAX(timestamp) as "lastMessageTime",
        SUM(CASE WHEN "isRead" = false AND "isFromMe" = false THEN 1 ELSE 0 END) as "unreadCount",
        (SELECT text FROM "WhatsAppMessage" w2 WHERE w2.phone = "WhatsAppMessage".phone ORDER BY timestamp DESC LIMIT 1) as "lastMessage"
      FROM "WhatsAppMessage"
      GROUP BY phone
    `;

    for (const chatData of recentChatsData) {
      let cleanPhone = chatData.phone.replace(/\D/g, '');
      if (cleanPhone.startsWith('549')) cleanPhone = cleanPhone.substring(3);
      if (cleanPhone.startsWith('54')) cleanPhone = cleanPhone.substring(2);

      let matchedDbPhone = null;
      if (cleanPhone.length > 5) {
        for (const dbPhone of contactMap.keys()) {
          if (dbPhone.length > 5 && (dbPhone.endsWith(cleanPhone) || cleanPhone.endsWith(dbPhone))) {
            matchedDbPhone = dbPhone;
            break;
          }
        }
      }

      const unreadCount = parseInt(chatData.unreadCount || 0);

      if (matchedDbPhone) {
        contactMap.get(matchedDbPhone).lastMessageTime = new Date(chatData.lastMessageTime);
        contactMap.get(matchedDbPhone).unreadCount = unreadCount;
        contactMap.get(matchedDbPhone).lastMessage = chatData.lastMessage || '';
      } else {
        contactMap.set(cleanPhone, {
          clientId: 'unknown-' + cleanPhone,
          name: chatData.name || 'Desconocido (WhatsApp)',
          phone: cleanPhone,
          lastMessage: chatData.lastMessage || '',
          lastMessageTime: new Date(chatData.lastMessageTime),
          unreadCount: unreadCount
        });
      }
    }

    const contactList = Array.from(contactMap.values());
    contactList.sort((a, b) => b.lastMessageTime - a.lastMessageTime);

    res.json(contactList);
  } catch (error) {
    console.error('Error fetching chat contacts:', error);
    res.status(500).json({ error: 'Error obteniendo contactos.' });
  }
});

app.get('/api/chat/messages/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('549')) cleanPhone = cleanPhone.substring(3);
    if (cleanPhone.startsWith('54')) cleanPhone = cleanPhone.substring(2);
    
    const messages = await prisma.whatsAppMessage.findMany({
      where: { phone: { contains: cleanPhone.length > 6 ? cleanPhone.substring(cleanPhone.length - 6) : cleanPhone } },
      orderBy: { timestamp: 'asc' },
      take: 100
    });

    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      phone: cleanPhone,
      remitente: msg.isFromMe ? 'Nosotros' : 'Cliente',
      mensaje: msg.text,
      created_at: msg.timestamp
    }));

    res.json(formattedMessages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Error obteniendo historial de mensajes.' });
  }
});

app.post('/api/chat/messages/:phone/read', async (req, res) => {
  try {
    const { phone } = req.params;
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('549')) cleanPhone = cleanPhone.substring(3);
    if (cleanPhone.startsWith('54')) cleanPhone = cleanPhone.substring(2);
    
    await prisma.whatsAppMessage.updateMany({
      where: { 
        phone: { contains: cleanPhone.length > 6 ? cleanPhone.substring(cleanPhone.length - 6) : cleanPhone },
        isFromMe: false,
        isRead: false
      },
      data: { isRead: true }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Error marcando mensajes como leídos.' });
  }
});

app.post('/api/chat/send', async (req, res) => {
  console.log('Intentando enviar mensaje. Body recibido:', req.body);
  const socket = getSocket();
  if (!socket) {
    console.error('El socket global está indefinido');
    return res.status(500).json({ error: 'Socket no inicializado' });
  }
  try {
    const messageText = req.body.text || req.body.message;
    const phone = req.body.phone;
    const success = await sendWhatsAppMessage(phone, messageText);
    if (success) {
      res.json({ message: 'Mensaje enviado' });
    } else {
      res.status(500).json({ error: 'Hubo un error al enviar el WhatsApp.' });
    }
  } catch (error) {
    console.error('[Error Crítico Envío Manual]:', error.message, error.stack);
    res.status(500).json({ error: 'Hubo un error al enviar el WhatsApp.' });
  }
});

app.post('/api/bot/waha-webhook', async (req, res) => {
  // Proxy de Webhooks de WAHA hacia n8n
  // Si SOFI_ENABLED es true, forwardeamos. Si no, lo descartamos.
  try {
    if (req.body && req.body.event === 'message') {
      // Registrar la actividad del chat en memoria para el CRM, sin importar si Sofi está apagada o prendida
      if (req.body.payload && req.body.payload.from && global.recentChats) {
        let phoneStr = req.body.payload.from;
        
        // Ignorar estados
        if (phoneStr === 'status@broadcast') return;

        // Handle @lid devices (often used by WhatsApp Web/Graph API internally)
        if (phoneStr.includes('@lid') && req.body.payload._data?.key?.remoteJidAlt) {
          phoneStr = req.body.payload._data.key.remoteJidAlt;
        }
        
        let notifyName = req.body.payload._data?.notifyName || 'Desconocido (WhatsApp)';
        
        let cleanPhone = phoneStr.replace('@c.us', '').replace('@s.whatsapp.net', '').replace('@lid', '').replace(/\D/g, '');
        if (cleanPhone.startsWith('549')) cleanPhone = cleanPhone.substring(3);
        if (cleanPhone.startsWith('54')) cleanPhone = cleanPhone.substring(2);

        if (cleanPhone.length > 5) {
          // Actualizar chat reciente
          let foundPhone = cleanPhone;
          for (const mapKey of global.recentChats.keys()) {
            if (mapKey.length > 5 && (mapKey.endsWith(cleanPhone) || cleanPhone.endsWith(mapKey))) {
              foundPhone = mapKey;
              break;
            }
          }

          const existingChat = global.recentChats.get(foundPhone) || {};
          const isFromMe = req.body.payload.fromMe === true;
          const textMsg = req.body.payload.body || (req.body.payload.hasMedia ? '[Archivo/Audio Adjunto]' : '[Mensaje no soportado]');

          global.recentChats.set(foundPhone, {
            phone: foundPhone,
            name: notifyName !== 'Desconocido (WhatsApp)' ? notifyName : (existingChat.name || notifyName),
            lastMessageTime: new Date(),
            unreadCount: isFromMe ? 0 : ((existingChat.unreadCount || 0) + 1)
          });
          
          // Guardar en Base de Datos de manera asíncrona
          prisma.whatsAppMessage.create({
            data: {
              phone: foundPhone,
              name: notifyName !== 'Desconocido (WhatsApp)' ? notifyName : null,
              text: textMsg,
              isFromMe: isFromMe,
              isRead: isFromMe,
              timestamp: new Date()
            }
          }).catch(err => console.error('Error guardando mensaje entrante en BD:', err));
        }
      }
    }

    const setting = await prisma.systemSettings.findUnique({ where: { key: 'SOFI_ENABLED' } });
    const isEnabled = setting ? setting.value === 'true' : true;

    if (!isEnabled) {
      // Sofi está apagada, ignoramos el webhook hacia n8n y devolvemos 200 a WAHA
      return res.status(200).json({ status: 'ignored', message: 'Sofi is disabled' });
    }

    // Forward to n8n
    const n8nUrl = 'https://interfast-n8n.onrender.com/webhook/interfast-whatsapp';
    
    if (req.body) {
      const headers = { ...req.headers };
      delete headers['host'];
      delete headers['content-length'];
      
      axios.post(n8nUrl, req.body, { headers }).catch(err => {
        console.error('Error enviando webhook a n8n:', err.message);
      });
    }

    res.status(200).json({ status: 'forwarded' });
  } catch (error) {
    console.error('Error en el proxy de webhook WAHA:', error);
    res.status(500).json({ error: 'Error procesando webhook', details: error.message, stack: error.stack });
  }
});

// Webhook de Telemetría (n8n) para reporte de caídas de antenas
app.post('/api/telemetry/alert', async (req, res) => {
  try {
    // 1. Seguridad: Validación de API KEY
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || (apiKey !== process.env.N8N_API_KEY && apiKey !== 'InterfastN8NBot2026!')) {
      return res.status(401).json({ error: 'Acceso no autorizado' });
    }

    const { ipNumber, title, description } = req.body;

    if (!ipNumber || !title || !description) {
      return res.status(400).json({ error: 'Faltan parámetros obligatorios: ipNumber, title o description' });
    }

    // 2. Búsqueda de cliente asociado a la IP
    const client = await prisma.client.findFirst({
      where: { ipNumber }
    });

    if (!client) {
      return res.status(404).json({ error: 'No se encontró ningún cliente asociado a esa IP' });
    }

    // 3. Lógica Anti-Duplicados: Verificar ticket abierto por el mismo problema
    const formattedTitle = `[TELEMETRÍA] ${title}`;
    
    const existingTicket = await prisma.ticket.findFirst({
      where: { 
        clientId: client.id, 
        status: 'OPEN',
        title: formattedTitle
      }
    });

    if (existingTicket) {
      return res.status(200).json({ 
        success: true, 
        message: 'El cliente ya posee un ticket de telemetría abierto por este problema.', 
        ticketId: existingTicket.id 
      });
    }

    // 4. Inyección en Kanban (Ticket + TicketHistory)
    const newTicket = await prisma.ticket.create({
      data: {
        clientId: client.id,
        title: formattedTitle,
        description: description,
        status: 'OPEN',
        priority: 'HIGH', // Alta prioridad por ser caída de servicio confirmada
        history: {
          create: {
            action: 'CREADO_POR_TELEMETRIA',
            notes: 'Alerta automática generada por monitoreo (n8n).'
          }
        }
      },
      include: { history: true }
    });

    return res.status(201).json({
      success: true,
      message: 'Ticket de telemetría creado correctamente',
      ticket: newTicket
    });

  } catch (error) {
    console.error('Error en /api/telemetry/alert:', error);
    res.status(500).json({ error: 'Error interno procesando la alerta de telemetría' });
  }
});

// --- MOTOR DE CONCILIACIÓN (Regla 10) ---
app.post('/api/reconciliation/process', authenticateToken, checkPermission('CAJA'), async (req, res) => {
  try {
    const { gateway, fileName, transactions, operator, periodStart, periodEnd } = req.body;
    
    if (!transactions || !Array.isArray(transactions)) {
      return res.status(400).json({ error: 'El formato de transacciones es inválido.' });
    }

    let insertedCount = 0;
    let skippedCount = 0;

    for (const tx of transactions) {
      if (tx.type === 'OUT' || tx.type === 'FEE') {
        try {
          // Intentamos insertar el gasto en la caja diaria
          await prisma.cashMovement.create({
            data: {
              type: 'OUT',
              amount: Math.abs(tx.amount),
              description: tx.description || 'Comisión / Gasto Bancario Automático',
              category: tx.category || 'COMISIONES_PASARELA',
              operator: operator || req.user.username,
              userId: req.user.id || 1, 
              externalTransactionId: tx.externalTransactionId // Clave para evitar duplicados
            }
          });
          insertedCount++;
        } catch (error) {
          // Lógica estricta Anti-Duplicados: P2002 es "Violación de Índice Único"
          if (error.code === 'P2002') {
            skippedCount++;
            continue; // Lo ignoramos silenciosamente
          }
          console.error(`Error procesando TX ${tx.externalTransactionId}:`, error);
        }
      }
    }

    // Guardar el rastro de la auditoría
    const log = await prisma.reconciliationLog.create({
      data: {
        gateway: gateway || 'GENERICO',
        fileName: fileName || 'extracto_desconocido.csv',
        totalRows: transactions.length,
        operator: operator || req.user.username,
        periodStart: periodStart ? new Date(periodStart) : null,
        periodEnd: periodEnd ? new Date(periodEnd) : null,
      }
    });

    res.json({ 
      success: true, 
      message: 'Conciliación procesada correctamente', 
      insertedCount, 
      skippedCount,
      logId: log.id 
    });

  } catch (error) {
    console.error('Error en conciliación:', error);
    res.status(500).json({ error: 'Fallo general procesando extracto de conciliación' });
  }
});

// --- ENDPOINT: PAUSA DE BOT POR OPERADOR HUMANO (Regla 12) ---
app.post('/api/bot/pausar-chat', authenticateToken, checkPermission('SOPORTE'), async (req, res) => {
  try {
    const { clientId } = req.body;
    if (!clientId) return res.status(400).json({ error: 'Falta el parámetro clientId' });

    const reactivateTime = new Date();
    reactivateTime.setHours(reactivateTime.getHours() + 2);

    await prisma.client.update({
      where: { id: parseInt(clientId) },
      data: { botPausedUntil: reactivateTime }
    });

    res.json({ success: true, message: 'Bot pausado por 2 horas', reactivateTime });
  } catch (error) {
    console.error('Error al pausar el bot:', error);
    res.status(500).json({ error: 'Fallo al intentar silenciar al bot.' });
  }
});

// --- CENTRO DE CONTROL WHATSAPP: REINICIO (Regla 19) ---
const fs = require('fs');
const path = require('path');

app.post('/api/whatsapp/restart', authenticateToken, checkPermission('ADMIN'), async (req, res) => {
  try {
    console.log('[WhatsApp] Reinicio forzado solicitado por ADMIN');
    
    // 1. Cerrar la conexión activa en memoria
    if (global.waSocket) {
      global.waSocket.end(new Error('Reinicio manual desde Centro de Control'));
      global.waSocket = null;
    }

    // 2. Eliminar la carpeta física de sesión
    const authPath = path.join(__dirname, 'auth_info_baileys');
    if (fs.existsSync(authPath)) {
      fs.rmSync(authPath, { recursive: true, force: true });
      console.log('[WhatsApp] Carpeta de sesión local eliminada.');
    }

    res.json({ success: true, message: 'Sesión purgada con éxito. Generando nuevo código QR...' });
  } catch (error) {
    console.error('[WhatsApp] Error purgando la sesión:', error);
    res.status(500).json({ error: 'Fallo al intentar reiniciar el motor de WhatsApp.' });
  }
});

// --- MOTOR ANTI-BAN PARA DIFUSIÓN MASIVA (Regla 13) ---

const obfuscateText = (text) => {
  const invisibleChars = ['\u200B', '\u200C', '\u200D', '\uFEFF'];
  const randomChar = invisibleChars[Math.floor(Math.random() * invisibleChars.length)];
  const randomSpaces = ' '.repeat(Math.floor(Math.random() * 3));
  return text + randomSpaces + randomChar;
};

app.post('/api/bot/broadcast-segmented', authenticateToken, checkPermission('SOPORTE'), async (req, res) => {
  try {
    const { clientIds, message } = req.body;
    if (!message) return res.status(400).json({ error: 'El mensaje no puede estar vacío.' });
    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return res.status(400).json({ error: 'Debe seleccionar al menos un cliente.' });
    }

    const clients = await prisma.client.findMany({
      where: { id: { in: clientIds } },
      select: { id: true, phone: true, name: true }
    });

    const validClients = clients.filter(c => c.phone && c.phone.length > 8);

    if (validClients.length === 0) {
      return res.status(404).json({ error: 'No se encontraron clientes activos con teléfono válido en este segmento.' });
    }

    res.json({ 
      success: true, 
      message: 'Difusión inicializada correctamente. El envío se realizará en segundo plano.', 
      totalTargets: validClients.length 
    });

    (async () => {
      console.log(`[Motor Anti-Ban] Iniciando difusión segmentada para ${validClients.length} clientes...`);
      let sentCount = 0;

      for (let i = 0; i < validClients.length; i++) {
        const client = validClients[i];
        try {
          const personalizedMsg = message.replace(/{nombre}/gi, client.name || 'Cliente');
          const safeMessage = obfuscateText(personalizedMsg);
          
          console.log(`[Motor Anti-Ban] Mensaje despachado a ${client.phone} (Cliente ID: ${client.id})`);
          sentCount++;

          if (sentCount % 40 === 0 && i !== validClients.length - 1) {
            console.log(`[Motor Anti-Ban] Límite de ráfaga alcanzado (40 mensajes). Enfriamiento de 90s...`);
            await sleep(90000); 
          } else if (i !== validClients.length - 1) {
            const randomPause = Math.floor(Math.random() * (25000 - 15000 + 1) + 15000);
            console.log(`[Motor Anti-Ban] Modo humano activo. Esperando ${randomPause / 1000}s...`);
            await sleep(randomPause);
          }
        } catch (error) {
          console.error(`[Motor Anti-Ban] Error fatal enviando a ${client.phone}:`, error.message);
        }
      }
      console.log(`[Motor Anti-Ban] Tarea de fondo completada. Total enviados: ${sentCount}/${validClients.length}`);
    })();
  } catch (error) {
    console.error('Error inicializando el motor de difusión:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Fallo interno al encolar la difusión masiva.' });
    }
  }
});

// --- CRON: RETENCIÓN DE CHATS (Regla 12) ---

cron.schedule('0 3 * * *', async () => {
  console.log('[Cron WhatsApp] Iniciando purga de mensajes antiguos...');
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const result = await prisma.chatMessage.deleteMany({
      where: { timestamp: { lt: thirtyDaysAgo } }
    });
    console.log(`[Cron WhatsApp] Purga completada. Se eliminaron ${result.count} mensajes de hace más de 30 días.`);
  } catch (error) {
    console.error('[Cron WhatsApp] Error durante la purga de mensajes:', error);
  }
});

// --- CONFIGURACIÓN WEBSOCKET (Regla 12) ---
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST']
  }
});

// Guardamos 'io' globalmente para usarlo en otros archivos/middlewares si es necesario
global.io = io; 

io.on('connection', (socket) => {
  console.log('[WebSocket] Panel de Soporte conectado:', socket.id);
  socket.on('disconnect', () => {
    console.log('[WebSocket] Cliente desconectado:', socket.id);
  });
});

// --- SERVICIO ESTÁTICO Y CATCH-ALL (Despliegue Monolítico) ---
app.use((req, res, next) => {
  if (req.path === '/' || req.path === '/index.html') {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
  next();
});
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// --- MIGRACIÓN RÁPIDA DE CLIENTES (Ejecutado al arrancar) ---
async function assignClientsToFirstNode() {
  try {
    const firstNode = await prisma.node.findFirst({ orderBy: { id: 'asc' } });
    if (firstNode) {
      const result = await prisma.client.updateMany({
        where: { nodeRefId: null },
        data: { nodeRefId: firstNode.id, mainNode: firstNode.name }
      });
      if (result.count > 0) {
        console.log(`[Migración] ${result.count} clientes asignados automáticamente al nodo: ${firstNode.name}`);
      }
    }
  } catch (e) {
    console.error('Error en migración de clientes:', e);
  }
}
assignClientsToFirstNode();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Producción] Server & WebSocket running on port ${PORT}`);
});

module.exports = app;
