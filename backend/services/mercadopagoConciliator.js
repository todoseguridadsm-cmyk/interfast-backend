const levenshteinDistance = (a, b) => {
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
};

const { getInvoiceTierStatus } = require('../utils/tierHelper');
const mikrotik = require('../mikrotik');

const processMercadoPagoPayment = async (prisma, mpPayment, transactionAmount, paymentId, operator = 'MERCADOPAGO_WEBHOOK') => {
  // Check if it already exists to prevent duplicate processing
  const existingPayment = await prisma.payment.findUnique({
    where: { mpPaymentId: String(paymentId) }
  });
  if (existingPayment) return { status: 'ignored', reason: 'already_exists' };

  const pendingInvoices = await prisma.invoice.findMany({
    where: { status: 'PENDING' },
    include: { client: true },
    orderBy: [{ year: 'asc' }, { month: 'asc' }]
  });

  let extractedFirstName = mpPayment.payer?.first_name || '';
  let extractedLastName = mpPayment.payer?.last_name || '';
  let extractedDni = String(mpPayment.payer?.identification?.number || '');

  const bankInfo = mpPayment.point_of_interaction?.transaction_data?.bank_info;
  if (bankInfo && bankInfo.payer_info) {
    if (!extractedFirstName && bankInfo.payer_info.name) {
      extractedFirstName = bankInfo.payer_info.name;
    }
    if (!extractedDni && bankInfo.payer_info.document_number) {
      extractedDni = String(bankInfo.payer_info.document_number);
    }
  }

  // Si el DNI sigue vacío pero el email está, podríamos usar el email (Mercado Pago a veces manda el email pero no el nombre)
  const payerEmail = (mpPayment.payer?.email || '').trim().toLowerCase();

  const payerRaw = `${extractedFirstName} ${extractedLastName} ${mpPayment.description || ''} ${payerEmail}`.trim();
  const payerClean = payerRaw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const payerWords = new Set(payerClean.split(/[^a-z0-9]+/).filter(Boolean));
  const payerDniRaw = extractedDni.replace(/\D/g, '');

  const hasTokenMatch = (tok) => {
    if (payerWords.has(tok)) return true;
    // Solo permitir coincidencia de subcadena en email/texto continuo si el apellido/token tiene >= 5 letras (evita "sar" dentro de "lasar")
    return tok.length >= 5 && payerClean.includes(tok);
  };

  let matchedInvoice = null;
  const paymentDateForMatch = mpPayment.date_approved || mpPayment.date_created || new Date();
  const getCents999ForMatch = (cId) => (((parseInt(cId, 10) % 999) + 1) / 100);
  const getCents1000ForMatch = (cId) => ((parseInt(cId, 10) % 1000) / 100);

  const hasExactCentsForInvoice = (inv) => {
    const tierAmt = getInvoiceTierStatus(inv, new Date(paymentDateForMatch)).totalAmount;
    const c999 = getCents999ForMatch(inv.clientId);
    const c1000 = getCents1000ForMatch(inv.clientId);
    return (
      Math.abs(transactionAmount - (tierAmt + c999)) < 0.015 ||
      Math.abs(transactionAmount - (tierAmt + c1000)) < 0.015
    );
  };

  const pickBestInvoiceByAmount = (candidates) => {
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];
    // 1. Si una de las cuentas candidatas (por DNI, Titular u Observaciones) coincide EXACTAMENTE con los centavos identificatorios del cliente (ej. .70 de Escudero Melina #169 vs .20 de Gerardo Luna #219), tiene prioridad absoluta:
    const exactCentMatches = candidates.filter(hasExactCentsForInvoice);
    if (exactCentMatches.length === 1) return exactCentMatches[0];

    const pool = exactCentMatches.length > 1 ? exactCentMatches : candidates;
    // 2. Priorizar la factura cuyo monto esperado sea más cercano al monto transferido
    return pool.slice().sort((a, b) => {
      const amtA = getInvoiceTierStatus(a, new Date(paymentDateForMatch)).totalAmount;
      const amtB = getInvoiceTierStatus(b, new Date(paymentDateForMatch)).totalAmount;
      const diffA = Math.abs(transactionAmount - amtA);
      const diffB = Math.abs(transactionAmount - amtB);
      if (Math.abs(diffA - diffB) > 100) return diffA - diffB;
      return (a.year - b.year) || (a.month - b.month) || (a.id - b.id);
    })[0];
  };

  // PASADA 1 (DNI / CUIT o Email exacto) + PASADA 2 (Nombre o Alias en Observaciones)
  const pass1Candidates = [];
  const pass2Candidates = [];

  for (const inv of pendingInvoices) {
    let matchedPass1 = false;
    const cDni = String(inv.client?.dni || '').replace(/\D/g, '');
    if (cDni.length >= 7 && cDni !== '11111111' && payerDniRaw.length >= 7) {
      if (payerDniRaw.includes(cDni) || cDni.includes(payerDniRaw)) {
        matchedPass1 = true;
      }
    }
    const cEmail = String(inv.client?.email || '').trim().toLowerCase();
    if (!matchedPass1 && cEmail && cEmail.length >= 6 && payerEmail && cEmail === payerEmail) {
      matchedPass1 = true;
    }
    if (matchedPass1) {
      pass1Candidates.push(inv);
    }

    const clientClean = (inv.client?.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const clientTokens = [...new Set(clientClean.split(/\s+/).filter(w => w.length >= 3))];
    const matchingTokens = clientTokens.filter(hasTokenMatch).length;
    if (matchingTokens >= 2 || (clientTokens.length === 1 && matchingTokens === 1)) {
      pass2Candidates.push(inv);
      continue;
    }

    const obs = (inv.client?.observation || '');
    const rawAliases = obs.split(/[|\n]/).map(s => s.replace(/^.*MP:\s*/i, '').trim()).filter(s => s.length > 2);

    let aliasMatched = false;
    for (const alias of rawAliases) {
      const aliasClean = alias.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      if (aliasClean === payerClean || levenshteinDistance(aliasClean, payerClean) <= 2) {
        aliasMatched = true; break;
      }

      const aliasTokens = [...new Set(aliasClean.split(/\s+/).filter(w => w.length >= 3))];
      const matchedAliasTokens = aliasTokens.filter(hasTokenMatch).length;
      if (aliasTokens.length > 0 && (matchedAliasTokens >= 2 || (aliasTokens.length === 1 && matchedAliasTokens === 1))) {
        aliasMatched = true; break;
      }
    }

    if (aliasMatched) pass2Candidates.push(inv);
  }

  // Si en Pasada 2 (Observaciones/Nombre) hay una cuenta con coincidencia EXACTA de centavos identificatorios (ej. Gerardo Luna pagando .70 por Escudero Melina #169), priorizarla:
  const allUniqueCandidates = [...new Map([...pass1Candidates, ...pass2Candidates].map(i => [i.id, i])).values()];
  const exactCentInAll = allUniqueCandidates.filter(hasExactCentsForInvoice);
  if (exactCentInAll.length === 1) {
    matchedInvoice = exactCentInAll[0];
  } else if (pass1Candidates.length > 0) {
    matchedInvoice = pickBestInvoiceByAmount(pass1Candidates);
  } else if (pass2Candidates.length > 0) {
    matchedInvoice = pickBestInvoiceByAmount(pass2Candidates);
  }

  if (matchedInvoice) {
    const paymentDate = mpPayment.date_approved || mpPayment.date_created || new Date();
    const tierStatus = getInvoiceTierStatus(matchedInvoice, new Date(paymentDate));
    const invoiceAmount = tierStatus.totalAmount;
    
    // Obtenemos los centavos del id del cliente para saber el monto exacto esperado
    const getCents999 = (cId) => (((parseInt(cId) % 999) + 1) / 100);
    const expectedCents = getCents999(matchedInvoice.clientId);
    const expectedExactAmount = invoiceAmount + expectedCents;
    
    // Calculamos la diferencia contra el monto exacto con centavos
    const difference = transactionAmount - expectedExactAmount;

    await prisma.$transaction(async (tx) => {
      // Buscar si el cliente tiene otras facturas pendientes para cascada real (2 o más meses juntos)
      const otherPendingInvoices = await tx.invoice.findMany({
        where: {
          clientId: matchedInvoice.clientId,
          id: { not: matchedInvoice.id },
          status: 'PENDING'
        },
        orderBy: [{ year: 'asc' }, { month: 'asc' }]
      });

      const canCascadeNext = otherPendingInvoices.length > 0 && difference >= ((otherPendingInvoices[0].priceV1 || otherPendingInvoices[0].originalAmount) - 100);
      const firstInvoiceAmount = canCascadeNext ? expectedExactAmount : transactionAmount;

      await tx.payment.create({
        data: {
          amountPaid: firstInvoiceAmount,
          method: 'MERCADOPAGO',
          operator: operator,
          mpPaymentId: String(paymentId),
          invoiceId: matchedInvoice.id,
          paymentDate: new Date(paymentDate)
        }
      });

      await tx.invoice.update({
        where: { id: matchedInvoice.id },
        data: { status: 'PAID', operator: operator }
      });

      await tx.cutoffList.deleteMany({
        where: { invoiceId: matchedInvoice.id }
      });

      await tx.cashMovement.create({
        data: {
          type: 'IN',
          amount: transactionAmount,
          category: 'PAGO_FACTURA',
          description: `Ingreso MP Webhook Cliente ${matchedInvoice.client.name}`,
          operator: operator,
          userId: 1
        }
      });

      if (canCascadeNext) {
        let remainingCredit = difference;

        for (const nextInv of otherPendingInvoices) {
          if (remainingCredit < 5.0) break;

          const nextTier = getInvoiceTierStatus(nextInv, new Date(paymentDate));
          const nextTargetAmount = nextTier.totalAmount;

          if (remainingCredit >= (nextTargetAmount - 100.0)) {
            const amountToApply = remainingCredit;
            await tx.payment.create({
              data: {
                amountPaid: amountToApply,
                method: 'MERCADOPAGO',
                operator: operator,
                invoiceId: nextInv.id,
                paymentDate: new Date(paymentDate)
              }
            });

            await tx.invoice.update({
              where: { id: nextInv.id },
              data: { status: 'PAID', operator: operator }
            });

            await tx.cutoffList.deleteMany({
              where: { invoiceId: nextInv.id }
            });

            remainingCredit = Math.max(0, remainingCredit - amountToApply);
            console.log(`✅ [Cascada Automática MP] Factura #${nextInv.id} (${nextInv.month}/${nextInv.year}) saldada automáticamente para ${matchedInvoice.client.name}`);
          } else {
            break;
          }
        }
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
            createdBy: operator,
            operator: operator
          }
        });

        const webhookN8N = process.env.N8N_WEBHOOK_PARTIAL_PAYMENT;
        if (webhookN8N) {
          const axios = require('axios');
          axios.post(webhookN8N, {
            clientId: matchedInvoice.clientId,
            clientName: matchedInvoice.client.name,
            phone: matchedInvoice.client.phone,
            paidAmount: transactionAmount,
            remainingDebt: remainingDebt
          }).catch(() => { });
        }
      }

      await tx.cutoffList.deleteMany({
        where: {
          OR: [
            { invoiceId: matchedInvoice.id },
            { clientId: matchedInvoice.clientId }
          ]
        }
      });

      await tx.client.update({
        where: { id: matchedInvoice.clientId },
        data: { status: 'ACTIVE' }
      });
    });

    // Rehabilitar automáticamente el servicio en MikroTik quitando la IP de la lista 'Morosos'
    if (matchedInvoice.client && matchedInvoice.client.ipNumber) {
      try {
        const targetNode = matchedInvoice.client.mainNode || (await prisma.node.findFirst({ orderBy: { id: 'asc' } }))?.name;
        if (targetNode) {
          await mikrotik.removeIpFromCutoffList(matchedInvoice.client.ipNumber, targetNode);
          console.log(`✅ [MikroTik Auto-Restore] IP ${matchedInvoice.client.ipNumber} (${matchedInvoice.client.name}) quitada de 'Morosos' en nodo ${targetNode}`);
        }
      } catch (mkErr) {
        console.error(`⚠️ Error removiendo IP ${matchedInvoice.client.ipNumber} de MikroTik tras pago MP:`, mkErr.message || mkErr);
      }
    }

    console.log(`✅ Conciliado Cliente ${matchedInvoice.client.name} | Pago: $${transactionAmount}`);
    return { status: 'success', matchedInvoice };
  } else {
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

    let finalPayerName = payerRaw || 'PAGADOR DESCONOCIDO';
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
            date: new Date(),
            mpPaymentId: String(paymentId)
          }
      });
      console.error(`❌ Huérfano -> ${finalPayerName}`);
      return { status: 'orphan', payerName: finalPayerName };
    }
    return { status: 'ignored', reason: 'orphan_already_exists' };
  }
};

module.exports = { processMercadoPagoPayment, levenshteinDistance };
