const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getInvoiceTierStatus } = require('../utils/tierHelper');

const JWT_SECRET = process.env.JWT_SECRET || 'TKIP_SUPER_PRIVATE_KEY_2026';

// Middleware de autenticación para clientes del Portal
const authenticatePortalClient = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso no autorizado al portal de clientes' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.clientId || decoded.type !== 'CLIENT_PORTAL') {
      return res.status(403).json({ error: 'Token inválido para el portal' });
    }

    const client = await prisma.client.findUnique({
      where: { id: decoded.clientId },
      include: { plan: true }
    });

    if (!client) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    req.portalClient = client;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesión expirada o inválida' });
  }
};

// 1. Login del Cliente en el Portal (DNI + Teléfono opcional)
router.post('/auth', async (req, res) => {
  try {
    const { dni, phone } = req.body;
    if (!dni) {
      return res.status(400).json({ error: 'Por favor, ingresa tu número de DNI' });
    }

    const cleanDni = String(dni).replace(/\D/g, '');
    if (cleanDni.length < 6) {
      return res.status(400).json({ error: 'DNI inválido' });
    }

    // Buscar cliente por DNI
    let client = await prisma.client.findFirst({
      where: {
        dni: { contains: cleanDni }
      },
      include: { plan: true }
    });

    if (!client) {
      // Intento secundario por CUIT si aplica
      client = await prisma.client.findFirst({
        where: {
          cuit: { contains: cleanDni }
        },
        include: { plan: true }
      });
    }

    if (!client) {
      return res.status(404).json({
        error: 'No encontramos un servicio registrado con ese número de DNI. Por favor verifica tus datos o contacta a soporte.'
      });
    }

    // Validar teléfono opcionalmente si se envía
    if (phone) {
      const cleanPhoneInput = String(phone).replace(/\D/g, '');
      const clientPhoneClean = String(client.phone || '').replace(/\D/g, '');
      if (cleanPhoneInput.length >= 4 && clientPhoneClean.length >= 4) {
        const lastFourInput = cleanPhoneInput.slice(-4);
        const lastFourClient = clientPhoneClean.slice(-4);
        if (lastFourInput !== lastFourClient) {
          return res.status(400).json({ error: 'El número de teléfono o los últimos 4 dígitos no coinciden con nuestros registros.' });
        }
      }
    }

    // Generar token de 60 días para permanencia en la PWA
    const token = jwt.sign(
      { clientId: client.id, dni: client.dni, type: 'CLIENT_PORTAL' },
      JWT_SECRET,
      { expiresIn: '60d' }
    );

    res.json({
      success: true,
      token,
      client: {
        id: client.id,
        name: client.name,
        dni: client.dni,
        address: client.address,
        city: client.city,
        status: client.status,
        planName: client.plan?.name || 'PLAN ESTÁNDAR',
        megas: client.plan?.megas || 30
      }
    });

  } catch (error) {
    console.error('Error en /api/portal/auth:', error);
    res.status(500).json({ error: 'Error al iniciar sesión en el portal' });
  }
});

// 2. Consulta de Estado Completo del Cliente
router.get('/me', authenticatePortalClient, async (req, res) => {
  try {
    const client = req.portalClient;

    // Facturas del cliente
    const invoices = await prisma.invoice.findMany({
      where: { clientId: client.id },
      include: { payments: true },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 12
    });

    // Factura activa pendiente
    const pendingInvoice = invoices.find(i => i.status === 'PENDING');
    let activeBill = null;

    if (pendingInvoice) {
      const tierStatus = getInvoiceTierStatus(pendingInvoice);
      const getCents999 = (cId) => (((parseInt(cId) % 999) + 1) / 100);
      const centsVal = getCents999(client.id || pendingInvoice.id || 1);
      
      const totalConCentavos = Math.round((parseFloat(tierStatus.totalAmount) + centsVal) * 100) / 100;
      const baseOriginalConCentavos = Math.round((parseFloat(pendingInvoice.priceV1 || pendingInvoice.originalAmount) + centsVal) * 100) / 100;

      activeBill = {
        invoiceId: pendingInvoice.id,
        period: `${String(pendingInvoice.month).padStart(2, '0')}/${pendingInvoice.year}`,
        month: pendingInvoice.month,
        year: pendingInvoice.year,
        activeTier: tierStatus.activeTier,
        isLate: tierStatus.isLate,
        calculatedLateFee: tierStatus.calculatedLateFee,
        baseAmount: baseOriginalConCentavos,
        totalAmount: totalConCentavos,
        centsOffset: centsVal,
        dueDate1: pendingInvoice.dueDate1 || pendingInvoice.dueDate,
        dueDate2: pendingInvoice.dueDate2 || null,
        dueDate3: pendingInvoice.dueDate3 || null,
        dueDate4: pendingInvoice.dueDate4 || null,
        aliasMercadoPago: 'INTERFASTSM',
        mpLink: `https://interfast-backend-95ww.onrender.com/api/invoices/${pendingInvoice.id}/mercadopago/redirect`,
        debitoLink: `https://interfast-backend-95ww.onrender.com/api/invoices/${pendingInvoice.id}/mercadopago/debito`,
        pdfUrl: `https://interfast-backend-95ww.onrender.com/api/bot/factura-pdf?invoiceId=${pendingInvoice.id}&v=${tierStatus.activeTier}`
      };
    }

    // Reclamos / Tickets del cliente
    const tickets = await prisma.ticket.findMany({
      where: { clientId: client.id },
      orderBy: { id: 'desc' },
      take: 10
    });

    // Historial de pagos
    const payments = await prisma.payment.findMany({
      where: { invoice: { clientId: client.id } },
      include: { invoice: true },
      orderBy: { id: 'desc' },
      take: 10
    });

    res.json({
      client: {
        id: client.id,
        name: client.name,
        dni: client.dni,
        address: client.address || 'Domicilio Registrado',
        city: client.city || 'Mendoza',
        phone: client.phone || 'S/D',
        email: client.email || 'S/D',
        status: client.status,
        walletBalance: client.walletBalance || 0,
        plan: client.plan ? {
          id: client.plan.id,
          name: client.plan.name,
          megas: client.plan.megas,
          basePrice: client.plan.totalPrice || client.plan.priceV1
        } : null
      },
      activeBill,
      invoicesHistory: invoices.map(inv => ({
        id: inv.id,
        period: `${String(inv.month).padStart(2, '0')}/${inv.year}`,
        amount: inv.originalAmount,
        status: inv.status,
        dueDate: inv.dueDate,
        pdfUrl: `https://interfast-backend-95ww.onrender.com/api/bot/factura-pdf?invoiceId=${inv.id}`
      })),
      tickets: tickets.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        createdAt: t.createdAt
      })),
      recentPayments: payments.map(p => ({
        id: p.id,
        period: p.invoice ? `${String(p.invoice.month).padStart(2, '0')}/${p.invoice.year}` : 'Pago',
        amountPaid: p.amountPaid,
        method: p.method,
        paymentDate: p.paymentDate
      }))
    });

  } catch (error) {
    console.error('Error en /api/portal/me:', error);
    res.status(500).json({ error: 'Error al obtener datos del cliente' });
  }
});

// 3. Crear nuevo Ticket / Reclamo desde la App
router.post('/tickets', authenticatePortalClient, async (req, res) => {
  try {
    const client = req.portalClient;
    const { category, title, description } = req.body;

    if (!description || description.trim().length < 5) {
      return res.status(400).json({ error: 'Por favor, describe brevemente tu inconveniente o consulta.' });
    }

    const ticketTitle = title ? title.trim() : `[Portal App] ${category || 'Soporte Técnico'}`;

    const newTicket = await prisma.ticket.create({
      data: {
        clientId: client.id,
        title: ticketTitle,
        description: description.trim(),
        status: 'OPEN',
        priority: category === 'Sin Señal' ? 'HIGH' : 'NORMAL'
      }
    });

    res.json({
      success: true,
      message: 'Reclamo registrado exitosamente. Nuestro equipo técnico lo revisará a la brevedad.',
      ticket: newTicket
    });

  } catch (error) {
    console.error('Error en POST /api/portal/tickets:', error);
    res.status(500).json({ error: 'Error al registrar el reclamo' });
  }
});

module.exports = router;
