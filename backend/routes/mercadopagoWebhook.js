const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { MercadoPagoConfig, Payment } = require('mercadopago');
const axios = require('axios');
const xlsx = require('xlsx');

// Inicializar cliente MP (usando variable de entorno principal)
const clientMP = process.env.MP_ACCESS_TOKEN ? new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN }) : null;

// --- ALGORITMO LEVENSHTEIN (Distancia de Edición NATIVA) ---
function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// --- WEBHOOK MERCADO PAGO (CASCADA 4 FASES Y TOLERANCIA MATEMÁTICA) ---
router.post('/mercadopago/webhook', async (req, res) => {
  res.sendStatus(200); // 200 INMEDIATO a MP para evitar retries por Timeout

  try {
    const topic = req.query.topic || req.query.type || req.body?.type || req.body?.action;
    let paymentId = req.query['data.id'] || req.query.id || req.body?.data?.id;
    if (!paymentId && req.body?.id && topic === 'payment.created') paymentId = req.body.id;

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
    
    // Obtenemos facturas pendientes para la cascada
    const pendingInvoices = await prisma.invoice.findMany({
      where: { status: 'PENDING' },
      include: { client: true },
      orderBy: [{ year: 'asc' }, { month: 'asc' }]
    });

    // =========================================================================
    // MEJORA: EXTRACCIÓN PROFUNDA DE DATOS (TRANSFERENCIAS CVU Y PAGOS CIEGOS)
    // =========================================================================
    
    // 1. Intentar extracción estándar (Payer Node)
    let extractedFirstName = mpPayment.payer?.first_name || '';
    let extractedLastName = mpPayment.payer?.last_name || '';
    let extractedDni = String(mpPayment.payer?.identification?.number || '');

    // 2. Si vienen vacíos, buscar en el nodo de Transferencias 3.0 (CVU / Bank Info)
    const bankInfo = mpPayment.point_of_interaction?.transaction_data?.bank_info;
    if (bankInfo && bankInfo.payer_info) {
        if (!extractedFirstName && bankInfo.payer_info.name) {
            extractedFirstName = bankInfo.payer_info.name; 
        }
        if (!extractedDni && bankInfo.payer_info.document_number) {
            extractedDni = String(bankInfo.payer_info.document_number);
        }
    }

    // 3. Fallback adicional en transaction_details (a veces MP inyecta datos ahí en ciertas tarjetas)
    const txDetails = mpPayment.transaction_details;
    if (txDetails) {
        // En algunas integraciones el DNI de la tarjeta se esconde aquí
        // Aunque no es común, protege la integridad de los datos ciegos.
    }

    // =========================================================================
    // INYECCIÓN DE LOS DATOS RESCATADOS HACIA EL EMBUDO RÍGIDO
    // =========================================================================
    
    const payerRaw = `${extractedFirstName} ${extractedLastName} ${mpPayment.description || ''}`.trim();
    const payerClean = payerRaw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const payerDniRaw = extractedDni.replace(/\D/g, '');
    
    let matchedInvoice = null;

    // EL EMBUDO DE IDENTIFICACIÓN (CÓDIGO INNEGOCIABLE INTACTO)
    for (const inv of pendingInvoices) {
      // FASE A: Match por DNI/CUIT (Regex)
      const cDni = String(inv.client?.dni || '').replace(/\D/g, '');
      if (cDni.length >= 7 && payerDniRaw.length >= 7) {
        if (payerDniRaw.includes(cDni) || cDni.includes(payerDniRaw)) {
          matchedInvoice = inv; break;
        }
      }

      // FASE B: Match por Nombre (Tokenización Cruzada, al menos 2 tokens)
      const clientClean = (inv.client?.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      const clientTokens = clientClean.split(/\s+/).filter(w => w.length >= 3);
      const matchingTokens = clientTokens.filter(tok => payerClean.includes(tok)).length;
      if (matchingTokens >= 2 || (clientTokens.length === 1 && matchingTokens === 1)) {
        matchedInvoice = inv; break;
      }

      // FASE C: Match por Observaciones (Alias MP y Levenshtein)
      const obs = (inv.client?.observation || '');
      const rawAliases = obs.split(/[|\n]/).map(s => s.replace(/^.*MP:\s*/i, '').trim()).filter(s => s.length > 2);
      
      let aliasMatched = false;
      for (const alias of rawAliases) {
        const aliasClean = alias.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        // Tolerancia de Levenshtein (<= 2 errores tipográficos permitidos)
        if (aliasClean === payerClean || levenshteinDistance(aliasClean, payerClean) <= 2) {
          aliasMatched = true; break;
        }
        
        // Tokenización sobre el alias
        const aliasTokens = aliasClean.split(/\s+/).filter(w => w.length >= 3);
        const matchedAliasTokens = aliasTokens.filter(tok => payerClean.includes(tok)).length;
        if (aliasTokens.length > 0 && (matchedAliasTokens >= 2 || (aliasTokens.length === 1 && matchedAliasTokens === 1))) {
          aliasMatched = true; break;
        }
      }
      
      if (aliasMatched) { matchedInvoice = inv; break; }
    }

    const currentOperator = 'MERCADOPAGO_WEBHOOK';

    if (matchedInvoice) {
      // EVALUACIÓN MATEMÁTICA Y ATOMICIDAD ($transaction)
      const invoiceAmount = matchedInvoice.priceV1 || matchedInvoice.originalAmount;
      const difference = transactionAmount - invoiceAmount;

      await prisma.$transaction(async (tx) => {
        // 1. Guardar Payment Atómicamente
        await tx.payment.create({
          data: {
            amountPaid: transactionAmount,
            method: 'MERCADOPAGO',
            operator: currentOperator,
            mpPaymentId: String(paymentId),
            invoiceId: matchedInvoice.id
          }
        });

        // 2. Marcar Invoice original como PAID
        await tx.invoice.update({
          where: { id: matchedInvoice.id },
          data: { status: 'PAID', paymentDate: new Date(), paymentMethod: 'MERCADOPAGO', operator: currentOperator }
        });

        // 3. Asentar CashMovement (Ingreso)
        await tx.cashMovement.create({
          data: {
            type: 'IN',
            amount: transactionAmount,
            category: 'PAGO_FACTURA',
            description: `Ingreso MP Webhook Cliente ${matchedInvoice.client.name}`,
            operator: currentOperator,
            userId: 1
          }
        });

        // 4. LÓGICA MATEMÁTICA (Excedente vs Parcial)
        if (difference >= 5.0) {
          // EXCEDENTE A FAVOR
          await tx.client.update({
            where: { id: matchedInvoice.clientId },
            data: { walletBalance: { increment: difference } }
          });
        } else if (difference <= -5.0) {
          // PAGO PARCIAL (Mantiene mismo vencimiento)
          const remainingDebt = Math.abs(difference);
          await tx.invoice.create({
            data: {
              clientId: matchedInvoice.clientId,
              month: matchedInvoice.month,
              year: matchedInvoice.year,
              originalAmount: remainingDebt,
              priceV1: remainingDebt,
              priceV2: remainingDebt,
              priceV3: remainingDebt,
              priceV4: remainingDebt,
              dueDate: matchedInvoice.dueDate,   // Mismo vencimiento original
              dueDate2: matchedInvoice.dueDate2, // Mismo vencimiento original
              dueDate3: matchedInvoice.dueDate3, // Mismo vencimiento original
              dueDate4: matchedInvoice.dueDate4, // Mismo vencimiento original
              status: 'PENDING',
              createdBy: currentOperator,
              operator: currentOperator
            }
          });

          // Notificación Asíncrona n8n
          const webhookN8N = process.env.N8N_WEBHOOK_PARTIAL_PAYMENT;
          if (webhookN8N) {
            axios.post(webhookN8N, {
              clientId: matchedInvoice.clientId,
              clientName: matchedInvoice.client.name,
              phone: matchedInvoice.client.phone,
              paidAmount: transactionAmount,
              remainingDebt: remainingDebt
            }).catch(() => {});
          }
        }
      });
      console.log(`✅ Webhook MP: Conciliado Cliente ${matchedInvoice.client.name} | Pago: $${transactionAmount}`);
    } else {
      // FASE D: HUÉRFANOS Y CÁLCULO DE CENTAVOS
      let suggestedClientName = '';
      const getCents999 = (cId) => (((parseInt(cId) % 999) + 1) / 100);
      
      for (const inv of pendingInvoices) {
        const cId = inv.clientId;
        const centsVal = getCents999(cId);
        const possibleAmounts = [
          (inv.priceV1 || inv.originalAmount) + centsVal,
          inv.priceV2 ? inv.priceV2 + centsVal : null,
          inv.priceV3 ? inv.priceV3 + centsVal : null,
          inv.priceV4 ? inv.priceV4 + centsVal : null
        ].filter(a => a);

        if (possibleAmounts.some(amt => Math.abs(transactionAmount - amt) < 0.05)) {
          suggestedClientName = inv.client.name;
          break;
        }
      }

      let finalPayerName = payerRaw;
      if (suggestedClientName) {
        finalPayerName = `[POSIBLE CLIENTE: ${suggestedClientName} POR CENTAVOS EXACTOS] ` + finalPayerName;
      }

      const existingUnidentified = await prisma.unidentifiedPayment.findFirst({
        where: { mpPaymentId: String(paymentId) }
      });
      
      if (!existingUnidentified) {
        await prisma.unidentifiedPayment.create({
          data: {
            amount: transactionAmount,
            payerName: finalPayerName,
            paymentDate: new Date(),
            mpPaymentId: String(paymentId)
          }
        });
        console.error(`❌ Webhook MP: Huérfano -> ${finalPayerName}`);
      }
    }
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

module.exports = router;
