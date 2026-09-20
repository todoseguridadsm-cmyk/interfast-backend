const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getInvoiceTierStatus } = require('../utils/tierHelper');
const { runConnectionTest } = require('../services/connectionTestService');

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
    if (!phone) {
      return res.status(400).json({ error: 'Por favor, ingresa tu número de teléfono registrado o sus últimos 4 dígitos' });
    }

    const cleanDni = String(dni).replace(/\D/g, '');
    if (cleanDni.length < 6) {
      return res.status(400).json({ error: 'DNI inválido' });
    }

    // Buscar TODAS las cuentas del DNI (un titular puede tener varias)
    let clients = await prisma.client.findMany({
      where: {
        dni: { contains: cleanDni },
        status: { not: 'BAJA' }
      },
      include: { plan: true },
      orderBy: { id: 'asc' }
    });

    // Intento secundario por CUIT si no encontró por DNI
    if (clients.length === 0) {
      clients = await prisma.client.findMany({
        where: {
          cuit: { contains: cleanDni },
          status: { not: 'BAJA' }
        },
        include: { plan: true },
        orderBy: { id: 'asc' }
      });
    }

    if (clients.length === 0) {
      return res.status(404).json({
        error: 'No encontramos un servicio registrado con ese número de DNI. Por favor verifica tus datos o contacta a soporte.'
      });
    }

    // Si hay múltiples cuentas, devolver la lista para que el cliente elija
    // sin generar token todavía (el frontend mostrará un selector)
    if (clients.length > 1) {
      return res.json({
        success: true,
        multipleAccounts: true,
        accounts: clients.map(c => ({
          id: c.id,
          name: c.name,
          address: c.address || 'Sin dirección registrada',
          city: c.city || '',
          status: c.status,
          planName: c.plan?.name || 'Sin Plan',
          megas: c.plan?.megas || 0
        }))
      });
    }

    // Cuenta única: loguear directamente
    const client = clients[0];

    // Validar teléfono de forma OBLIGATORIA
    const cleanPhoneInput = String(phone).replace(/\D/g, '');
    const clientPhoneClean = String(client.phone || '').replace(/\D/g, '');
    
    if (clientPhoneClean.length >= 4) {
      if (cleanPhoneInput.length < 4) {
        return res.status(400).json({ error: 'Por favor, ingresa al menos los últimos 4 dígitos de tu número de teléfono.' });
      }
      const lastFourInput = cleanPhoneInput.slice(-4);
      const lastFourClient = clientPhoneClean.slice(-4);
      if (lastFourInput !== lastFourClient) {
        return res.status(400).json({ error: 'El número de teléfono o los últimos 4 dígitos no coinciden con nuestros registros de seguridad.' });
      }
    } else {
      // Si el cliente no tiene un teléfono válido registrado en la base de datos,
      // no le permitimos loguearse por seguridad (deberán actualizarlo).
      return res.status(403).json({ error: 'No tienes un teléfono registrado válido en el sistema. Por favor, comunícate con soporte para actualizar tus datos de seguridad.' });
    }

    // Generar token de 60 días para permanencia en la PWA
    const token = jwt.sign(
      { clientId: client.id, dni: client.dni, type: 'CLIENT_PORTAL' },
      JWT_SECRET,
      { expiresIn: '60d' }
    );

    res.json({
      success: true,
      multipleAccounts: false,
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

// 1b. Seleccionar cuenta específica (cuando hay múltiples por DNI)
router.post('/auth/select', async (req, res) => {
  try {
    const { clientId, dni, phone } = req.body;
    if (!clientId || !dni) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const cleanDni = String(dni).replace(/\D/g, '');

    // Verificar que el clientId pertenece al DNI ingresado (seguridad)
    const client = await prisma.client.findFirst({
      where: {
        id: parseInt(clientId),
        OR: [
          { dni: { contains: cleanDni } },
          { cuit: { contains: cleanDni } }
        ]
      },
      include: { plan: true }
    });

    if (!client) {
      return res.status(403).json({ error: 'No se pudo verificar la identidad del titular.' });
    }

    // Validar teléfono también al seleccionar cuenta
    const cleanPhoneInput = String(phone).replace(/\D/g, '');
    const clientPhoneClean = String(client.phone || '').replace(/\D/g, '');
    
    if (clientPhoneClean.length >= 4) {
      if (cleanPhoneInput.length < 4) {
        return res.status(400).json({ error: 'Por favor, ingresa al menos los últimos 4 dígitos de tu número de teléfono.' });
      }
      const lastFourInput = cleanPhoneInput.slice(-4);
      const lastFourClient = clientPhoneClean.slice(-4);
      if (lastFourInput !== lastFourClient) {
        return res.status(400).json({ error: 'El número de teléfono no coincide con los registros del titular.' });
      }
    } else {
      return res.status(403).json({ error: 'Titular sin teléfono registrado válido. Por favor comunícate con soporte.' });
    }

    // Generar token de 60 días
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
    console.error('Error en /api/portal/auth/select:', error);
    res.status(500).json({ error: 'Error al seleccionar la cuenta' });
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

    // Facturas activas pendientes
    const pendingInvoices = invoices.filter(i => i.status === 'PENDING').reverse(); // reverse para orden cronológico
    let activeBill = null;

    if (pendingInvoices.length > 0) {
      const getCents999 = (cId) => (((parseInt(cId) % 999) + 1) / 100);
      const centsVal = getCents999(client.id || 1);
      
      let totalSum = 0;
      const detailedPending = pendingInvoices.map(inv => {
        const tierStatus = getInvoiceTierStatus(inv);
        const total = Math.round(parseFloat(tierStatus.totalAmount) * 100) / 100;
        totalSum += total;
        
        return {
          invoiceId: inv.id,
          period: `${String(inv.month).padStart(2, '0')}/${inv.year}`,
          month: inv.month,
          year: inv.year,
          activeTier: tierStatus.activeTier,
          isLate: tierStatus.isLate,
          calculatedLateFee: tierStatus.calculatedLateFee,
          baseAmount: Math.round(parseFloat(inv.priceV1 || inv.originalAmount) * 100) / 100,
          totalAmount: total,
          dueDate1: inv.dueDate1 || inv.dueDate,
          dueDate2: inv.dueDate2 || null,
          dueDate3: inv.dueDate3 || null,
          dueDate4: inv.dueDate4 || null,
          mpLink: `https://interfast-backend-95ww.onrender.com/api/invoices/${inv.id}/mercadopago/redirect`,
          pdfUrl: `https://interfast-backend-95ww.onrender.com/api/bot/factura-pdf?invoiceId=${inv.id}&v=${tierStatus.activeTier}`
        };
      });

      // Sumar los centavos dinámicos 1 sola vez al gran total
      totalSum = Math.round((totalSum + centsVal) * 100) / 100;

      activeBill = {
        totalAmount: totalSum,
        centsOffset: centsVal,
        invoices: detailedPending, // Array de facturas impagas detalladas
        multiplePending: detailedPending.length > 1,
        singleMpLink: detailedPending.length === 1 ? detailedPending[0].mpLink : null,
        singlePdfUrl: detailedPending.length === 1 ? detailedPending[0].pdfUrl : null,
        aliasMercadoPago: 'INTERFASTSM'
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
      invoicesHistory: invoices.map(inv => {
        const tierStatus = getInvoiceTierStatus(inv);
        // Si está pendiente, calculamos con recargo. Si ya está pagada, mostramos el original.
        const finalAmount = inv.status === 'PENDING' ? tierStatus.totalAmount : inv.originalAmount;
        
        return {
          id: inv.id,
          period: `${String(inv.month).padStart(2, '0')}/${inv.year}`,
          amount: inv.originalAmount,
          totalAmount: finalAmount,
          status: inv.status,
          dueDate: inv.dueDate,
          mpLink: `https://interfast-backend-95ww.onrender.com/api/invoices/${inv.id}/mercadopago/redirect`,
          pdfUrl: `https://interfast-backend-95ww.onrender.com/api/bot/factura-pdf?invoiceId=${inv.id}&v=${tierStatus.activeTier}`
        };
      }),
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

// Prueba de Conexión Automática (Diagnóstico)
router.post('/connection-test', async (req, res) => {
  try {
    const { documentId } = req.body;
    if (!documentId) return res.status(400).json({ error: 'Faltan datos de sesión' });

    const result = await runConnectionTest(documentId);
    res.json(result);
  } catch (error) {
    console.error('Error en connection-test:', error);
    res.status(500).json({ error: 'Error del servidor al ejecutar el diagnóstico.' });
  }
});

module.exports = router;
