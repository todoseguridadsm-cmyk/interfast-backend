const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const xlsx = require('xlsx');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// =========================================================================
// UPLOAD MANUAL DE EXTRACTO BANCO ROELA (COMISIONES E IMPUESTOS BANCARIOS)
// =========================================================================
router.post('/bank/upload-roela-report', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo.' });

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer', codepage: 1252 });
    const sheetName = workbook.SheetNames[0];
    const rawRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

    if (!rawRows || rawRows.length === 0) {
      return res.status(400).json({ error: 'El archivo Excel está vacío.' });
    }

    // 1. Detectar período del extracto y localizar la fila de cabecera en las primeras filas
    let period = '';
    let extractedEndDate = null;
    let headerRowIdx = 0;

    for (let i = 0; i < Math.min(rawRows.length, 25); i++) {
      const row = rawRows[i] || [];
      const firstCell = String(row[0] || row[1] || '');

      if (!period && firstCell.toLowerCase().includes('extracto de cuenta')) {
        period = firstCell.trim();
        // Intentar parsear fecha final: "Extracto de Cuenta entre el 1/8/2026 y el 31/8/2026"
        const match = firstCell.match(/y el\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
        if (match) {
          const day = parseInt(match[1]);
          const month = parseInt(match[2]);
          const year = parseInt(match[3]);
          extractedEndDate = new Date(Date.UTC(year, month - 1, day, 15, 0, 0));
        }
      }

      const trimmedCells = row.map(c => String(c || '').trim().toLowerCase());
      const foundDesc = trimmedCells.some(c => c.startsWith('descripci') || c === 'detalle');
      const foundAmount = trimmedCells.some(c =>
        c === 'monto' || c === 'importe' || c.startsWith('débito') || c.startsWith('debito')
      );
      if (foundDesc && foundAmount) {
        headerRowIdx = i;
        break;
      }
    }

    // Helper para convertir fechas seriales de Excel, dd/mm/yyyy o yyyy-mm-dd a Date (15:00 UTC = 12:00 ART)
    const parseExcelDate = (rawDate) => {
      if (rawDate instanceof Date && !isNaN(rawDate.getTime())) return rawDate;
      if (typeof rawDate === 'number' && rawDate > 20000) {
        const utcDays = Math.floor(rawDate - 25569);
        return new Date(Date.UTC(1970, 0, 1 + utcDays, 15, 0, 0));
      }
      if (typeof rawDate === 'string') {
        const cleanStr = rawDate.trim();
        const mDMY = cleanStr.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
        if (mDMY) return new Date(Date.UTC(parseInt(mDMY[3]), parseInt(mDMY[2]) - 1, parseInt(mDMY[1]), 15, 0, 0));
        const mYMD = cleanStr.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
        if (mYMD) return new Date(Date.UTC(parseInt(mYMD[1]), parseInt(mYMD[2]) - 1, parseInt(mYMD[3]), 15, 0, 0));
      }
      return null;
    };

    // Helper para parsear montos numéricos o strings con formato argentino/internacional
    const parseCellNumber = (rawVal) => {
      if (rawVal === undefined || rawVal === null || rawVal === '') return NaN;
      if (typeof rawVal === 'number') return rawVal;
      let s = String(rawVal).trim().replace(/[^\d.,-]/g, '');
      if (!s) return NaN;
      if (s.includes(',') && s.includes('.')) {
        if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
          s = s.replace(/\./g, '').replace(',', '.'); // Ej: -18.681,40
        } else {
          s = s.replace(/,/g, ''); // Ej: -18,681.40
        }
      } else if (s.includes(',')) {
        s = s.replace(',', '.');
      }
      return parseFloat(s);
    };

    // 2. Leer filas como objetos desde la cabecera detectada y limpiar espacios (.trim()) en todas las keys
    const jsonRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
      range: headerRowIdx,
      defval: ''
    });

    const rows = jsonRows.map(rawRow => {
      const cleanRow = {};
      Object.keys(rawRow).forEach(key => {
        const cleanKey = key.trim();
        cleanRow[cleanKey] = rawRow[key];

        const lowerKey = cleanKey.toLowerCase();
        if (lowerKey.startsWith('descripci') || (lowerKey === 'detalle' && cleanRow['Descripción'] === undefined)) {
          cleanRow['Descripción'] = rawRow[key];
        } else if (lowerKey === 'monto') {
          cleanRow['Monto'] = rawRow[key];
        } else if (lowerKey === 'importe') {
          cleanRow['Importe'] = rawRow[key];
        } else if (lowerKey.startsWith('débito') || lowerKey.startsWith('debito')) {
          cleanRow['Débito'] = rawRow[key];
        } else if (lowerKey.startsWith('crédito') || lowerKey.startsWith('credito')) {
          cleanRow['Crédito'] = rawRow[key];
        } else if (lowerKey.startsWith('fecha')) {
          if (cleanRow['Fecha'] === undefined) cleanRow['Fecha'] = rawRow[key];
        } else if (lowerKey.includes('comprobante') || lowerKey.includes('operaci')) {
          cleanRow['Comprobante'] = rawRow[key];
        }
      });
      return cleanRow;
    });

    // 3. Validar que exista "Descripción" y ("Monto" o "Importe" o "Débito"/"Crédito")
    const headerKeys = rows.length > 0 ? Object.keys(rows[0]) : [];
    const hasDescripcion = headerKeys.includes('Descripción');
    const hasMontoOrImporte = headerKeys.includes('Monto') || headerKeys.includes('Importe') || headerKeys.includes('Débito') || headerKeys.includes('Crédito');

    if (!hasDescripcion || !hasMontoOrImporte) {
      return res.status(400).json({ error: 'No se encontraron las columnas de Descripción y Monto/Importe en el extracto.' });
    }

    let totalComisionesImpuestos = 0;
    const rawDebitEntries = [];
    const ownTransfersIn = [];
    let minRowDate = null;
    let maxRowDate = null;
    let validMovementRows = 0;

    for (const row of rows) {
      const desc = String(row['Descripción'] || '').trim();
      if (!desc || desc.toLowerCase().includes('saldo al inicio') || desc.toLowerCase().includes('saldo anterior') || desc.toLowerCase().startsWith('convenio:')) continue;

      let rawVal = (row['Monto'] !== undefined && row['Monto'] !== '') ? row['Monto'] : row['Importe'];
      let importe = parseCellNumber(rawVal);

      if (isNaN(importe) && (row['Débito'] !== undefined || row['Crédito'] !== undefined)) {
        const deb = parseCellNumber(row['Débito']);
        const cred = parseCellNumber(row['Crédito']);
        if (!isNaN(deb) || !isNaN(cred)) {
          importe = (isNaN(cred) ? 0 : Math.abs(cred)) - (isNaN(deb) ? 0 : Math.abs(deb));
        }
      }
      if (isNaN(importe) || importe === 0) continue;

      validMovementRows++;
      const rowDate = parseExcelDate(row['Fecha']);
      if (rowDate) {
        if (!minRowDate || rowDate < minRowDate) minRowDate = rowDate;
        if (!maxRowDate || rowDate > maxRowDate) maxRowDate = rowDate;
      }

      const comp = String(row['Comprobante'] ?? '').trim();
      const dLower = desc.toLowerCase();

      const isTransferPrefix =
        dLower.startsWith('tra d t') ||
        dLower.startsWith('transf') ||
        dLower.startsWith('tr.interb') ||
        dLower.startsWith('credin') ||
        dLower.includes('credito inmediato') ||
        dLower.includes('crédito inmediato');

      // 1) Transferencias propias entrantes (ej. MercadoPago -> Banco Roela, Mismo Titular / CUIT 30-71701055-4)
      if (importe > 0 && (dLower.includes('mismo ti') || dLower.includes('30717010554')) && !dLower.includes('rech') && !dLower.includes('dev')) {
        ownTransfersIn.push({ desc, amount: Number(importe.toFixed(2)), comp, date: rowDate });
        continue;
      }

      // 2) Transferencias de terceros / clientes entrantes -> se concilian por factura, no como gasto ni devolución impositiva
      if (importe > 0 && isTransferPrefix) {
        continue;
      }

      // 3) Impuestos, comisiones, mantenimiento, SIRO e intereses (y sus devoluciones como DEV.IMP.LEY 25413)
      const isImpuesto =
        dLower.includes('impuesto') ||
        dLower.includes('imp.ley') ||
        dLower.includes('dev.imp') ||
        dLower.includes('i.v.a.') ||
        /\biva\b/i.test(dLower) ||
        dLower.includes('percepc') ||
        dLower.includes('retenc') ||
        dLower.includes('sellos');
      const isComision =
        dLower.includes('com.') ||
        dLower.includes('comision') ||
        dLower.includes('comisión') ||
        dLower.includes('mantenimiento') ||
        dLower.includes('siro') ||
        dLower.includes('interes');

      const isRefundOrReversal =
        dLower.includes('dev') ||
        dLower.includes('rever') ||
        dLower.includes('bonif') ||
        dLower.includes('cred.imp') ||
        dLower.includes('ajuste');

      if ((isImpuesto || isComision) && (importe < 0 || isRefundOrReversal)) {
        totalComisionesImpuestos += (-importe);
      } else if (dLower.includes('debito directo') || dLower.includes('débito directo')) {
        // Incluye tanto el débito (importe < 0) como sus rechazos ("RECH.DEBITO DIRECTO..." o "RECHAZOS DE DEBITO DIRECTO...", importe > 0)
        rawDebitEntries.push({ desc, importe, comp, date: rowDate });
      } else if (importe < 0 && !isTransferPrefix) {
        // Otros egresos / pagos de servicios efectivos
        rawDebitEntries.push({ desc, importe, comp, date: rowDate });
      }
    }

    const statementClosingDate = extractedEndDate || maxRowDate || new Date();
    const minIso = (minRowDate || statementClosingDate).toISOString().slice(0, 10);
    const maxIso = (maxRowDate || statementClosingDate).toISOString().slice(0, 10);
    const stmtSignature = `ROELA-STMT-${minIso}_${maxIso}_${validMovementRows}`;

    // 4. Evitar carga duplicada del mismo período de extracto
    const existingReport = await prisma.cashMovement.findFirst({
      where: {
        operator: 'BANCO_ROELA',
        externalTransactionId: stmtSignature
      }
    });
    if (existingReport) {
      return res.status(400).json({
        error: `Este extracto de Banco Roela (${minIso} al ${maxIso}) ya fue procesado anteriormente.`
      });
    }

    // 5. Emparejar débitos directos con sus rechazos (por N° de Comprobante + monto, o por monto exacto como fallback)
    const charges = rawDebitEntries.filter(d => d.importe < 0);
    const rejections = rawDebitEntries.filter(d => d.importe > 0);
    const specificDebits = {};

    for (const ch of charges) {
      let rejIdx = -1;
      if (ch.comp) {
        rejIdx = rejections.findIndex(r => r.comp === ch.comp && Math.abs(r.importe - Math.abs(ch.importe)) < 0.02);
      }
      if (rejIdx === -1) {
        rejIdx = rejections.findIndex(r => Math.abs(r.importe - Math.abs(ch.importe)) < 0.02);
      }

      if (rejIdx !== -1) {
        // Débito rechazado y reversado por el banco -> efecto neto $0
        rejections.splice(rejIdx, 1);
      } else {
        const groupKey = ch.desc.trim();
        if (!specificDebits[groupKey]) {
          specificDebits[groupKey] = { originalDesc: groupKey, total: 0, count: 0, date: ch.date };
        }
        specificDebits[groupKey].total += Math.abs(ch.importe);
        specificDebits[groupKey].count++;
        if (ch.date && (!specificDebits[groupKey].date || ch.date > specificDebits[groupKey].date)) {
          specificDebits[groupKey].date = ch.date;
        }
      }
    }

    if (!period && maxRowDate) {
      const m = String(maxRowDate.getUTCMonth() + 1).padStart(2, '0');
      const y = maxRowDate.getUTCFullYear();
      period = `Período ${m}/${y}`;
    }

    const operadorName = req.user?.username || 'tkip';
    const userId = parseInt(req.user?.id) || 1;
    const createdMovements = [];
    const createdIncomes = [];

    // 1. Registrar Transferencias Propias entrantes (ej. MercadoPago -> Banco Roela, Mismo Titular) si aún no estaban asentadas en Caja Roela
    for (const tr of ownTransfersIn) {
      const txDate = tr.date || statementClosingDate;
      const extId = `ROELA-OWN-${tr.comp || txDate.toISOString().slice(0, 10)}-${tr.amount}`;
      const minWindow = new Date(txDate.getTime() - 4 * 24 * 60 * 60 * 1000);
      const maxWindow = new Date(txDate.getTime() + 4 * 24 * 60 * 60 * 1000);

      const alreadyRecorded = await prisma.cashMovement.findFirst({
        where: {
          OR: [
            { externalTransactionId: extId },
            {
              operator: 'BANCO_ROELA',
              type: 'IN',
              category: { not: 'PAGO_FACTURA' },
              amount: tr.amount,
              createdAt: { gte: minWindow, lte: maxWindow }
            }
          ]
        }
      });

      if (!alreadyRecorded) {
        const mIngresoPropio = await prisma.cashMovement.create({
          data: {
            type: 'IN',
            amount: tr.amount,
            category: 'INGRESO_MANUAL',
            description: `[CAJA: BANCO_ROELA] Transferencia Propia Recibida (MP -> Roela) - ${tr.desc}${tr.comp ? ` - Comp #${tr.comp}` : ''}`,
            operator: 'BANCO_ROELA',
            createdAt: txDate,
            userId,
            externalTransactionId: extId
          },
          include: { user: { select: { username: true } } }
        });
        createdMovements.push(mIngresoPropio);
        createdIncomes.push({ concepto: tr.desc, monto: tr.amount, comprobante: tr.comp });
      }
    }

    // 2. Registrar Comisiones e Impuestos netos de Roela en la fecha del extracto
    if (totalComisionesImpuestos > 0) {
      const mComisiones = await prisma.cashMovement.create({
        data: {
          type: 'OUT',
          amount: Number(totalComisionesImpuestos.toFixed(2)),
          category: 'GASTOS_VARIOS',
          description: `[CAJA: BANCO_ROELA] Costos Banco Roela - ${req.file.originalname} (Por: ${operadorName})`,
          operator: 'BANCO_ROELA',
          createdAt: statementClosingDate,
          userId,
          externalTransactionId: stmtSignature
        },
        include: { user: { select: { username: true } } }
      });
      createdMovements.push(mComisiones);
    }

    // 3. Registrar cada Débito Directo / Servicio efectivo en su fecha real de débito
    for (const [key, item] of Object.entries(specificDebits)) {
      const netAmount = Number(item.total.toFixed(2));
      if (netAmount > 0) {
        const mDebito = await prisma.cashMovement.create({
          data: {
            type: 'OUT',
            amount: netAmount,
            category: 'GASTOS_VARIOS',
            description: `[CAJA: BANCO_ROELA] ${item.originalDesc} (Por: ${operadorName})`,
            operator: 'BANCO_ROELA',
            createdAt: item.date || statementClosingDate,
            userId
          },
          include: { user: { select: { username: true } } }
        });
        createdMovements.push(mDebito);
      }
    }

    if (createdMovements.length === 0) {
      return res.status(400).json({ error: 'No se detectaron nuevos movimientos pendientes de conciliar en el archivo subido.' });
    }

    const totalEgresosNeto = createdMovements.filter(m => m.type === 'OUT').reduce((acc, m) => acc + m.amount, 0);
    const totalIngresosPropios = createdMovements.filter(m => m.type === 'IN').reduce((acc, m) => acc + m.amount, 0);

    console.log(`✅ Upload Roela Report: Creados ${createdMovements.length} movimientos | Ingresos propios: $${totalIngresosPropios.toFixed(2)} | Egresos: $${totalEgresosNeto.toFixed(2)}`);
    res.json({
      message: 'Extracto de Banco Roela procesado y discriminado con éxito',
      movements: createdMovements,
      movement: createdMovements[0],
      totalEgresos: Number(totalEgresosNeto.toFixed(2)),
      totalIngresosPropios: Number(totalIngresosPropios.toFixed(2)),
      breakdown: {
        period: period || 'No especificado',
        filename: req.file.originalname,
        transferenciasPropias: createdIncomes,
        comisionesEImpuestos: Number(totalComisionesImpuestos.toFixed(2)),
        debitosDirectos: Object.entries(specificDebits)
          .filter(([_, it]) => it.total > 0)
          .map(([k, it]) => ({ concepto: it.originalDesc, monto: Number(it.total.toFixed(2)) }))
      }
    });

  } catch (err) {
    console.error('❌ Error en Upload Banco Roela Report:', err);
    res.status(500).json({ error: 'Error procesando el archivo de Banco Roela: ' + err.message });
  }
});

// =========================================================================
// CARGA MANUAL DE PAGOS DE BANCO ROELA (CON CLIENTE, FECHA Y OPERACIÓN)
// =========================================================================
router.post('/bank/roela-manual-payment', async (req, res) => {
  try {
    const { clientId, invoiceId, amountPaid, paymentDate, operationNumber } = req.body;

    const parsedAmount = parseFloat(amountPaid);
    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ error: 'El monto a abonar debe ser mayor a cero.' });
    }

    const opNumber = String(operationNumber || '').trim();
    if (!opNumber) {
      return res.status(400).json({ error: 'El número de operación es obligatorio para la trazabilidad bancaria.' });
    }

    if (!clientId && !invoiceId) {
      return res.status(400).json({ error: 'Debes indicar el cliente o la factura a imputar.' });
    }

    // 1. Validar duplicados por número de operación
    const existingOp = await prisma.payment.findFirst({
      where: {
        OR: [
          { externalTransactionId: opNumber },
          { mpPaymentId: opNumber }
        ]
      }
    });
    if (existingOp) {
      return res.status(400).json({ error: `Ya existe un pago registrado con el N° de Operación: ${opNumber}` });
    }

    // 2. Parsear fecha de pago
    let finalPaymentDate = new Date();
    if (paymentDate) {
      const parsedDate = new Date(paymentDate);
      if (!isNaN(parsedDate.getTime())) {
        finalPaymentDate = parsedDate;
      }
    }

    // 3. Obtener cliente y factura
    let targetInvoice = null;
    let client = null;

    if (invoiceId) {
      targetInvoice = await prisma.invoice.findUnique({
        where: { id: parseInt(invoiceId) },
        include: { client: true }
      });
      if (!targetInvoice) {
        return res.status(404).json({ error: 'Factura no encontrada.' });
      }
      client = targetInvoice.client;
    } else {
      client = await prisma.client.findUnique({
        where: { id: parseInt(clientId) }
      });
      if (!client) {
        return res.status(404).json({ error: 'Cliente no encontrado.' });
      }

      // Buscar factura pendiente más antigua
      targetInvoice = await prisma.invoice.findFirst({
        where: { clientId: client.id, status: 'PENDING' },
        orderBy: [{ year: 'asc' }, { month: 'asc' }]
      });
    }

    // Si el cliente no tiene facturas pendientes, acreditar como saldo a favor en wallet
    if (!targetInvoice) {
      const updatedClient = await prisma.client.update({
        where: { id: client.id },
        data: {
          walletBalance: { increment: parsedAmount },
          status: 'ACTIVE'
        }
      });

      const cashMov = await prisma.cashMovement.create({
        data: {
          type: 'IN',
          amount: parsedAmount,
          category: 'PAGO_FACTURA',
          description: `[CAJA: BANCO_ROELA] Cobro Anticipado / Saldo a Favor - ${client.name.trim()} - Op #${opNumber}`,
          operator: 'BANCO_ROELA',
          userId: parseInt(req.user?.id) || 1,
          createdAt: finalPaymentDate,
          externalTransactionId: opNumber
        }
      });

      return res.json({
        message: 'Cliente sin facturas pendientes. Se acreditó saldo a favor en su billetera.',
        client: updatedClient,
        cashMovement: cashMov
      });
    }

    // 4. Calcular mora si aplica
    const baseAmount = targetInvoice.priceV1 || targetInvoice.originalAmount;
    const lateFeeApplied = Number(Math.max(0, parsedAmount - baseAmount).toFixed(2));

    // 5. Crear el pago en Payment
    const payment = await prisma.payment.create({
      data: {
        invoiceId: targetInvoice.id,
        method: 'BANCO_ROELA',
        amountPaid: parsedAmount,
        lateFeeApplied: lateFeeApplied,
        paymentDate: finalPaymentDate,
        userId: parseInt(req.user?.id) || 1,
        mpFee: 0,
        mpTax: 0,
        mpPaymentId: null,
        operator: 'BANCO_ROELA',
        externalTransactionId: opNumber
      }
    });

    // 6. Actualizar estado de la factura a PAID
    const updatedInvoice = await prisma.invoice.update({
      where: { id: targetInvoice.id },
      data: {
        status: 'PAID',
        operator: 'BANCO_ROELA'
      }
    });

    // 7. Limpiar de listas de corte
    await prisma.cutoffList.deleteMany({
      where: {
        OR: [
          { clientId: client.id },
          { invoiceId: targetInvoice.id }
        ]
      }
    });

    // 8. Activar cliente
    await prisma.client.update({
      where: { id: client.id },
      data: { status: 'ACTIVE' }
    });

    // 9. Asentar en CashMovement (Impacta en Caja General y Caja Banco Roela)
    const cashMov = await prisma.cashMovement.create({
      data: {
        type: 'IN',
        amount: parsedAmount,
        category: 'PAGO_FACTURA',
        description: `[CAJA: BANCO_ROELA] Cobro Banco Roela - Factura #${targetInvoice.id} (${client.name.trim()}) - Op #${opNumber}`,
        operator: 'BANCO_ROELA',
        userId: parseInt(req.user?.id) || 1,
        createdAt: finalPaymentDate,
        externalTransactionId: opNumber
      }
    });

    res.json({
      message: 'Pago de Banco Roela registrado exitosamente.',
      payment,
      invoice: updatedInvoice,
      cashMovement: cashMov
    });

  } catch (err) {
    console.error('❌ Error en roela-manual-payment:', err);
    res.status(500).json({ error: 'Error procesando el pago de Banco Roela: ' + err.message });
  }
});

module.exports = router;

