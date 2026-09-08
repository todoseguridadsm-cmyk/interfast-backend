const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { MercadoPagoConfig, Payment } = require('mercadopago');
const axios = require('axios');
const xlsx = require('xlsx');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const fs = require('fs');
const path = require('path');

// Inicializar cliente MP (usando variable de entorno principal)
const clientMP = process.env.MP_ACCESS_TOKEN ? new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN }) : null;

// Funciones de Levenshtein movidas a mercadopagoConciliator.js

// --- WEBHOOK MERCADO PAGO (CASCADA 4 FASES Y TOLERANCIA MATEMÁTICA) ---
// --- ENDPOINT PARA LEER LOGS ESPÍA ---
router.post('/mercadopago/webhook-logs', (req, res) => {
  const logPath = path.join(__dirname, '../mp_webhook_logs.txt');
  if (fs.existsSync(logPath)) {
    res.type('text/plain').send(fs.readFileSync(logPath, 'utf8'));
  } else {
    res.send('No logs yet.');
  }
});

router.post('/mercadopago/webhook', async (req, res) => {
  res.sendStatus(200); // 200 INMEDIATO a MP para evitar retries por Timeout

  try {
    // --- LOGGER TEMPORAL DE DIAGNOSTICO ---
    const logData = `[${new Date().toISOString()}] WEBHOOK INCOMING:\nQUERY: ${JSON.stringify(req.query)}\nBODY: ${JSON.stringify(req.body)}\n-----------------------\n`;
    fs.appendFileSync(path.join(__dirname, '../mp_webhook_logs.txt'), logData);

    const topic = req.query.topic || req.query.type || req.body?.type || req.body?.action;
    let paymentId = req.query['data.id'] || req.query.id || req.body?.data?.id;
    if (!paymentId && req.body?.id && topic === 'payment.created') paymentId = req.body.id;

    // A veces MP manda el id directamente en data.id aunque el topic no sea payment.created
    if (!paymentId && req.body?.data?.id) paymentId = req.body.data.id;

    // Regla de Oro: Idempotencia Fuerte
    if (!paymentId) return;
    const existingPayment = await prisma.payment.findUnique({
      where: { mpPaymentId: String(paymentId) }
    });
    if (existingPayment) return; // Se aborta silenciosamente si ya existe

    if (!clientMP) {
      console.error('Webhook MP abortado: MP_ACCESS_TOKEN no configurado en el servidor.');
      return;
    }

    const payment = new Payment(clientMP);
    const mpPayment = await payment.get({ id: paymentId });
    if (mpPayment.status !== 'approved') return;

    const transactionAmount = parseFloat(mpPayment.transaction_amount) || 0;
    const { processMercadoPagoPayment } = require('../services/mercadopagoConciliator');
    await processMercadoPagoPayment(prisma, mpPayment, transactionAmount, paymentId, 'MERCADOPAGO_WEBHOOK');

  } catch (err) {
    console.error('Error en Webhook MercadoPago:', err);
  }
});

// =========================================================================
// NUEVO WEBHOOK: CONCILIACIÓN AUTOMÁTICA DE REPORTES MENSUALES (COSTOS MP)
// =========================================================================
router.post('/mercadopago/reports-webhook', async (req, res) => {
  // 1. Regla de Oro: Responder 200 INMEDIATO a MP
  res.sendStatus(200);
  console.log('📡 [WEBHOOK MP REPORTS] Petición recibida:', { query: req.query, body: req.body });

  try {
    const topic = req.query.topic || req.query.type || req.body?.type || req.body?.action;
    let reportId = req.query['data.id'] || req.query.id || req.body?.data?.id || req.body?.id;

    // Asegurarnos de que sea el webhook correcto
    if (!reportId || topic !== 'report.created') {
      console.log('⚠️ [WEBHOOK MP REPORTS] Abortado por payload inválido o topic incorrecto');
      return;
    }

    // 2. Idempotencia: Verificar si este reporte ya fue procesado
    const existing = await prisma.cashMovement.findFirst({
      where: { description: { contains: `Reporte MP #${reportId}` } }
    });
    if (existing) return; // Se aborta silenciosamente si ya existe

    // 3. Descarga Directa del Reporte Binario
    const reportUrl = `https://api.mercadopago.com/v1/account/release_report/${reportId}`;
    const reportRes = await axios.get(reportUrl, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
      responseType: 'arraybuffer' // Crucial para mantener la integridad del archivo Excel
    });

    // 4. Parseo en Memoria (Cero archivos temporales en disco)
    const workbook = xlsx.read(reportRes.data, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let totalCostos = 0;

    // 5. Extracción y Sumatoria
    data.forEach(row => {
      const fee = parseFloat(row['fee_amount'] || 0);
      const financing = parseFloat(row['financing_fee_amount'] || 0);
      const taxes = parseFloat(row['taxes_amount'] || 0);
      const telco = parseFloat(row['tax_amount_telco'] || 0);

      // Sumamos los valores (Math.abs garantiza que siempre sumen positivo para el egreso)
      totalCostos += Math.abs(fee) + Math.abs(financing) + Math.abs(taxes) + Math.abs(telco);
    });

    // Si el reporte vino en ceros, abortar para no ensuciar la base de datos
    if (totalCostos === 0) return;

    // 6. Asiento Atómico en Caja
    await prisma.$transaction(async (tx) => {
      await tx.cashMovement.create({
        data: {
          type: 'OUT',
          amount: totalCostos,
          category: 'GASTOS_VARIOS', // Conciliación MP
          description: `Costos, comisiones y retenciones mensuales MP (Reporte #${reportId})`,
          operator: 'MERCADOPAGO_WEBHOOK',
          userId: 1
        }
      });
    });

    console.log(`✅ Webhook MP Reports: Conciliado Reporte Mensual #${reportId} por $${totalCostos}`);
  } catch (err) {
    console.error('❌ Error en Webhook MercadoPago Reports:', err.response?.data || err.message);
  }
});

// =========================================================================
// PLAN B: UPLOAD MANUAL DE REPORTES MP (BOTÓN DE PÁNICO)
// =========================================================================
router.post('/mercadopago/upload-report', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo.' });

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let totalCostos = 0;

    data.forEach(row => {
      Object.keys(row).forEach(key => {
        const lowerKey = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        if (lowerKey.includes('comision') || lowerKey.includes('impuesto') || lowerKey.includes('retencion') || lowerKey.includes('cargo')) {
          let val = row[key];
          if (typeof val === 'string') {
            // Limpiar signos de moneda y espacios
            val = val.replace(/[^\d.,-]/g, '');
            // Si hay puntos y comas (ej. 1.500,50), quitamos el punto (miles)
            if (val.includes(',') && val.includes('.')) {
              val = val.replace(/\./g, '');
            }
            // Reemplazar la coma decimal por punto para parseFloat
            val = val.replace(',', '.');
          }
          const num = parseFloat(val);
          if (!isNaN(num)) {
            totalCostos += Math.abs(num);
          }
        }
      });
    });

    if (totalCostos === 0) {
      return res.status(400).json({ error: 'No se encontraron comisiones o retenciones en el archivo.' });
    }

    const operador = 'MERCADOPAGO';

    const m = await prisma.cashMovement.create({
      data: {
        type: 'OUT',
        amount: Number(totalCostos.toFixed(2)),
        category: 'GASTOS_VARIOS',
        description: `[CAJA: MERCADOPAGO] Costos MP - ${req.file.originalname}`,
        operator: operador,
        userId: parseInt(req.user?.id) || 1
      },
      include: { user: { select: { username: true } } }
    });

    console.log(`✅ Upload MP Report: Conciliado manualmente por $${totalCostos} por ${operador}`);
    res.json({ message: 'Conciliación exitosa', movement: m });
  } catch (err) {
    console.error('❌ Error en Upload MercadoPago Reports:', err);
    res.status(500).json({ error: 'Error procesando el archivo de Mercado Pago' });
  }
});

module.exports = router;
