const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
require('dotenv').config({ path: '../.env' }); 

const prisma = new PrismaClient();
const MP_TOKEN = process.env.MP_ACCESS_TOKEN;

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

async function searchMPPayments() {
  if (!MP_TOKEN) throw new Error("MP_ACCESS_TOKEN no encontrado.");
  const beginDate = "2026-08-29T00:00:00Z";
  const endDate = "2026-09-03T23:59:59Z";
  const url = `https://api.mercadopago.com/v1/payments/search?status=approved&begin_date=${beginDate}&end_date=${endDate}`;
  
  console.log(`Consultando API Mercado Pago desde ${beginDate} hasta ${endDate}...`);
  try {
    let allResults = [];
    let paging = { offset: 0, limit: 50 };
    let hasMore = true;
    while (hasMore) {
        const response = await axios.get(`${url}&offset=${paging.offset}&limit=${paging.limit}`, {
        headers: { 'Authorization': `Bearer ${MP_TOKEN}` }
        });
        const results = response.data.results;
        allResults = allResults.concat(results);
        if (results.length < paging.limit) {
            hasMore = false;
        } else {
            paging.offset += paging.limit;
        }
    }
    return allResults;
  } catch (err) {
    return [];
  }
}

async function run() {
  console.log(`=== INICIANDO INYECCIÓN EN PRODUCCIÓN (FASE 0 + EMBUDO) ===\n`);

  const mpPaymentsRaw = await searchMPPayments();
  const pendingInvoices = await prisma.invoice.findMany({
    where: { status: 'PENDING', month: 9 },
    include: { client: true },
    orderBy: [{ year: 'asc' }, { month: 'asc' }]
  });

  let countMatched = 0;
  let countUnmatched = 0;
  let countIgnored = 0;

  // FASE 0: DICCIONARIO DE EXCEPCIONES MANUALES (HARDCODE)
  const excepcionesManuales = {
    "22991.74": "CARMAGNANI EDITH MARGARITA",
    "22991.43": "PATRICIA SILVANA SFREDDO",
    "22991.73": "MABEL ZORRILLA",
    "22991.52": "FUNES ELISA NOEMI",
    "22990.93": "RAUL AMBROSIO",
    "22990.75": "ANDREA MICAELA BENZONI",
    "22990.24": "LETICIA PAOLA DOMINGUEZ",
    "22992.01": "ADRIANA ELISA PETIOT"
  };

  for (const mpPayment of mpPaymentsRaw) {
    const paymentId = mpPayment.id;
    const transactionAmount = parseFloat(mpPayment.transaction_amount) || 0;
    
    // Regla de Oro: Idempotencia (ignoramos si ya existe, aunque como hicimos rollback no debería)
    const existingPayment = await prisma.payment.findUnique({
      where: { mpPaymentId: String(paymentId) }
    });
    
    if (existingPayment) {
        countIgnored++;
        continue;
    }

    const payerRaw = `${mpPayment.payer?.first_name || ''} ${mpPayment.payer?.last_name || ''} ${mpPayment.description || ''}`.trim();
    const payerClean = payerRaw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const payerDniRaw = String(mpPayment.payer?.identification?.number || '').replace(/\D/g, '');
    const dateApproved = mpPayment.date_approved;
    
    let matchedInvoice = null;
    let matchPhase = '';

    // --- FASE 0: VALIDACIÓN DEL DICCIONARIO DE EXCEPCIONES ---
    const exceptionTarget = excepcionesManuales[transactionAmount.toString()];
    if (exceptionTarget) {
        const targetClean = exceptionTarget.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        for (const inv of pendingInvoices) {
            const clientNameClean = (inv.client?.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
            if (clientNameClean === targetClean || clientNameClean.includes(targetClean)) {
                matchedInvoice = inv;
                matchPhase = 'FASE 0 (Excepción Manual Asignada)';
                break;
            }
        }
    }

    // SI NO ES EXCEPCIÓN MANUAL, PASA AL EMBUDO ESTÁNDAR
    if (!matchedInvoice) {
        for (const inv of pendingInvoices) {
            // FASE A: Match por DNI/CUIT (Regex)
            const cDni = String(inv.client?.dni || '').replace(/\D/g, '');
            if (cDni.length >= 7 && payerDniRaw.length >= 7) {
                if (payerDniRaw.includes(cDni) || cDni.includes(payerDniRaw)) {
                matchedInvoice = inv; 
                matchPhase = 'FASE A (DNI)';
                break;
                }
            }

            // FASE B: Match por Nombre
            const clientClean = (inv.client?.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
            const clientTokens = clientClean.split(/\s+/).filter(w => w.length >= 3);
            const matchingTokens = clientTokens.filter(tok => payerClean.includes(tok)).length;
            if (matchingTokens >= 2 || (clientTokens.length === 1 && matchingTokens === 1)) {
                matchedInvoice = inv; 
                matchPhase = 'FASE B (Tokenización Nombre)';
                break;
            }

            // FASE C: Match por Observaciones (Alias MP y Levenshtein)
            const obs = (inv.client?.observation || '');
            const rawAliases = obs.split(/[|\n]/).map(s => s.replace(/^.*MP:\s*/i, '').trim()).filter(s => s.length > 2);
            
            let aliasMatched = false;
            for (const alias of rawAliases) {
                const aliasClean = alias.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
                if (aliasClean === payerClean || levenshteinDistance(aliasClean, payerClean) <= 2) {
                aliasMatched = true; break;
                }
                const aliasTokens = aliasClean.split(/\s+/).filter(w => w.length >= 3);
                const matchedAliasTokens = aliasTokens.filter(tok => payerClean.includes(tok)).length;
                if (aliasTokens.length > 0 && (matchedAliasTokens >= 2 || (aliasTokens.length === 1 && matchedAliasTokens === 1))) {
                aliasMatched = true; break;
                }
            }
            if (aliasMatched) { 
                matchedInvoice = inv; 
                matchPhase = 'FASE C (Observaciones/Alias)';
                break; 
            }
        }
    }
    
    // FASE D: Centavos (Último Recurso)
    if (!matchedInvoice) {
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
                matchedInvoice = inv;
                matchPhase = 'FASE D (Variación de Centavos)';
                break;
            }
        }
    }

    if (matchedInvoice) {
      countMatched++;
      console.log(`--------------------------------------------------`);
      console.log(`✅ MATCH MP: ID ${paymentId} | Payer: ${payerRaw || 'N/A'} | Monto: $${transactionAmount}`);
      console.log(`   -> Cliente Asignado: ${matchedInvoice.client.name} (ID: ${matchedInvoice.clientId})`);
      console.log(`   -> Factura Asignada: ID ${matchedInvoice.id} | Plan: $${matchedInvoice.originalAmount}`);
      console.log(`   -> Identificado por: ${matchPhase}`);

      const invoiceAmount = matchedInvoice.priceV1 || matchedInvoice.originalAmount;
      const difference = transactionAmount - invoiceAmount;
      const currentOperator = 'REGULARIZATION_SCRIPT';

      try {
        await prisma.$transaction(async (tx) => {
          await tx.payment.create({
            data: {
              amountPaid: transactionAmount,
              method: 'MERCADOPAGO',
              operator: currentOperator,
              mpPaymentId: String(paymentId),
              paymentDate: new Date(dateApproved),
              invoiceId: matchedInvoice.id,
              userId: 1
            }
          });

          await tx.invoice.update({
            where: { id: matchedInvoice.id },
            data: { status: 'PAID', operator: currentOperator }
          });

          await tx.cashMovement.create({
            data: {
              type: 'IN',
              amount: transactionAmount,
              category: 'PAGO_FACTURA',
              description: `Ingreso MP Regularizado Cliente ${matchedInvoice.client.name}`,
              createdAt: new Date(dateApproved),
              operator: currentOperator,
              userId: 1
            }
          });

          if (difference >= 5.0) {
            await tx.client.update({
              where: { id: matchedInvoice.clientId },
              data: { walletBalance: { increment: difference } }
            });
          } else if (difference <= -5.0) {
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
                dueDate: matchedInvoice.dueDate,
                dueDate2: matchedInvoice.dueDate2,
                dueDate3: matchedInvoice.dueDate3,
                dueDate4: matchedInvoice.dueDate4,
                status: 'PENDING',
                createdBy: currentOperator,
                operator: currentOperator
              }
            });
          }
        });
        console.log(`   [ÉXITO] Inyección completada en Base de Datos.`);
      } catch (err) {
        console.error(`   🚨 [ERROR BD] Falló inyección para ID ${paymentId}:`, err.message);
      }
    } else {
      countUnmatched++;
      console.log(`--------------------------------------------------`);
      console.log(`❌ HUÉRFANO MP: ID ${paymentId} | Payer: ${payerRaw || 'N/A'} | Monto: $${transactionAmount}`);
      console.log(`   -> No pudo pasar el embudo.`);
    }
  }
  
  console.log(`\n=== RESUMEN DRY-RUN ===`);
  console.log(`Pagos ya procesados en BD (Ignorados): ${countIgnored}`);
  console.log(`Pagos listos para conciliar: ${countMatched}`);
  console.log(`Pagos huérfanos sin cliente: ${countUnmatched}`);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
