const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { MercadoPagoConfig, Payment } = require('mercadopago');
const axios = require('axios');

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

    const payerRaw = `${mpPayment.payer?.first_name || ''} ${mpPayment.payer?.last_name || ''} ${mpPayment.description || ''}`.trim();
    const payerClean = payerRaw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const payerDniRaw = String(mpPayment.payer?.identification?.number || '').replace(/\D/g, '');
    
    let matchedInvoice = null;

    // EL EMBUDO DE IDENTIFICACIÓN
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
            amount: transactionAmount,
            method: 'MERCADOPAGO',
            operator: currentOperator,
            mpPaymentId: String(paymentId),
            clientId: matchedInvoice.clientId,
            invoiceId: matchedInvoice.id,
            description: `Cobro MP Automático - Factura #${matchedInvoice.id}`
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
            description: `Ingreso MP Webhook Cliente ${matchedInvoice.client.name}`,
            operator: currentOperator,
            method: 'MERCADOPAGO'
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

module.exports = router;
