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

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rawRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

    if (!rawRows || rawRows.length === 0) {
      return res.status(400).json({ error: 'El archivo Excel está vacío.' });
    }

    // 1. Detectar período del extracto y localizar la fila de cabecera en las primeras filas
    let period = '';
    let extractedEndDate = null;
    let headerRowIdx = 0;

    for (let i = 0; i < Math.min(rawRows.length, 20); i++) {
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
          extractedEndDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
        }
      }

      const trimmedCells = row.map(c => String(c || '').trim().toLowerCase());
      const foundDesc = trimmedCells.includes('descripción') || trimmedCells.includes('descripcion');
      const foundAmount = trimmedCells.includes('monto') || trimmedCells.includes('importe');
      if (foundDesc && foundAmount) {
        headerRowIdx = i;
        break;
      }
    }

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
        if (lowerKey === 'descripción' || lowerKey === 'descripcion') {
          cleanRow['Descripción'] = rawRow[key];
        } else if (lowerKey === 'monto') {
          cleanRow['Monto'] = rawRow[key];
        } else if (lowerKey === 'importe') {
          cleanRow['Importe'] = rawRow[key];
        }
      });
      return cleanRow;
    });

    // 3. Validar que exista "Descripción" y ("Monto" o "Importe")
    const headerKeys = rows.length > 0 ? Object.keys(rows[0]) : [];
    const hasDescripcion = headerKeys.includes('Descripción');
    const hasMontoOrImporte = headerKeys.includes('Monto') || headerKeys.includes('Importe');

    if (!hasDescripcion || !hasMontoOrImporte) {
      return res.status(400).json({ error: 'No se encontraron las columnas de Descripción y Monto/Importe en el extracto.' });
    }

    let totalComisionesImpuestos = 0;
    const specificDebits = {};

    for (const row of rows) {
      const desc = String(row['Descripción'] || '').trim();
      let val = row['Monto'] || row['Importe'];
      if (val === undefined || val === null || val === '') continue;

      if (typeof val === 'string') {
        val = val.replace(/[^\d.,-]/g, '');
        if (val.includes(',') && val.includes('.')) val = val.replace(/\./g, '');
        val = val.replace(',', '.');
      }
      const importe = parseFloat(val);
      if (isNaN(importe)) continue;

      if (desc.toLowerCase().includes('saldo al inicio')) continue;

      const dLower = desc.toLowerCase();
      const isImpuesto = dLower.includes('impuesto') || dLower.includes('i.v.a.') || dLower.includes('iva');
      const isComision = dLower.includes('com.') || dLower.includes('comision') || dLower.includes('mantenimiento') || dLower.includes('siro');

      if (isImpuesto || isComision) {
        totalComisionesImpuestos += (-importe);
      } else {
        // Débitos directos, transferencias salientes o pagos de servicios
        if (dLower.includes('debito directo') || dLower.includes('rechazos de debito') || (importe < 0 && !dLower.includes('transf.inter') && !dLower.includes('credin'))) {
          const groupKey = desc.replace(/^RECHAZOS DE\s+/i, '').trim();
          if (!specificDebits[groupKey]) {
            specificDebits[groupKey] = { originalDesc: groupKey, total: 0, count: 0 };
          }
          specificDebits[groupKey].total += (-importe);
          specificDebits[groupKey].count++;
        }
      }
    }

    const operadorName = req.user?.username || 'tkip';
    const userId = parseInt(req.user?.id) || 1;
    const createdMovements = [];

    // 1. Registrar Comisiones e Impuestos de Roela si existen
    if (totalComisionesImpuestos > 0) {
      const mComisiones = await prisma.cashMovement.create({
        data: {
          type: 'OUT',
          amount: Number(totalComisionesImpuestos.toFixed(2)),
          category: 'GASTOS_VARIOS',
          description: `[CAJA: BANCO_ROELA] Costos Banco Roela - ${req.file.originalname} (Por: ${operadorName})`,
          operator: 'BANCO_ROELA',
          createdAt: new Date(),
          userId
        },
        include: { user: { select: { username: true } } }
      });
      createdMovements.push(mComisiones);
    }

    // 2. Registrar cada Débito Directo / Servicio discriminado
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
            createdAt: new Date(),
            userId
          },
          include: { user: { select: { username: true } } }
        });
        createdMovements.push(mDebito);
      }
    }

    if (createdMovements.length === 0) {
      return res.status(400).json({ error: 'No se detectaron egresos ni débitos en el archivo subido.' });
    }

    const totalGeneralNeto = createdMovements.reduce((acc, m) => acc + m.amount, 0);

    console.log(`✅ Upload Roela Report: Creados ${createdMovements.length} movimientos por un total de $${totalGeneralNeto.toFixed(2)}`);
    res.json({
      message: 'Extracto de Banco Roela procesado y discriminado con éxito',
      movements: createdMovements,
      movement: createdMovements[0],
      totalEgresos: Number(totalGeneralNeto.toFixed(2)),
      breakdown: {
        period: period || 'No especificado',
        filename: req.file.originalname,
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

