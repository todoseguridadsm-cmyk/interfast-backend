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
  const payerEmail = mpPayment.payer?.email || '';

  const payerRaw = `${extractedFirstName} ${extractedLastName} ${mpPayment.description || ''} ${payerEmail}`.trim();
  const payerClean = payerRaw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const payerDniRaw = extractedDni.replace(/\D/g, '');

  let matchedInvoice = null;

  for (const inv of pendingInvoices) {
    const cDni = String(inv.client?.dni || '').replace(/\D/g, '');
    if (cDni.length >= 7 && payerDniRaw.length >= 7) {
      if (payerDniRaw.includes(cDni) || cDni.includes(payerDniRaw)) {
        matchedInvoice = inv; break;
      }
    }

    const clientClean = (inv.client?.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const clientTokens = clientClean.split(/\s+/).filter(w => w.length >= 3);
    const matchingTokens = clientTokens.filter(tok => payerClean.includes(tok)).length;
    if (matchingTokens >= 2 || (clientTokens.length === 1 && matchingTokens === 1)) {
      matchedInvoice = inv; break;
    }

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

    if (aliasMatched) { matchedInvoice = inv; break; }
  }

  if (matchedInvoice) {
    const invoiceAmount = matchedInvoice.priceV1 || matchedInvoice.originalAmount;
    const difference = transactionAmount - invoiceAmount;

    await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          amountPaid: transactionAmount,
          method: 'MERCADOPAGO',
          operator: operator,
          mpPaymentId: String(paymentId),
          invoiceId: matchedInvoice.id
        }
      });

      await tx.invoice.update({
        where: { id: matchedInvoice.id },
        data: { status: 'PAID', operator: operator }
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
    });
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
