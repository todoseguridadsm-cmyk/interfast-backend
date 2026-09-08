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
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: 'El archivo Excel está vacío.' });
    }

    // 1. Detectar período del extracto en las primeras filas
    let period = '';
    let extractedEndDate = null;
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      const firstCell = String(rows[i]?.[0] || rows[i]?.[1] || '');
      if (firstCell.toLowerCase().includes('extracto de cuenta')) {
        period = firstCell.trim();
        // Intentar parsear fecha final: "Extracto de Cuenta entre el 1/8/2026 y el 31/8/2026"
        const match = firstCell.match(/y el\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
        if (match) {
          const day = parseInt(match[1]);
          const month = parseInt(match[2]);
          const year = parseInt(match[3]);
          extractedEndDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
        }
        break;
      }
    }

    // 2. Localizar cabecera (Descripción e Importe)
    let headerRowIdx = -1;
    let descColIdx = -1;
    let importeColIdx = -1;

    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const row = rows[i] || [];
      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || '').trim().toLowerCase();
        if (cell === 'descripción' || cell === 'descripcion') descColIdx = j;
        if (cell === 'importe') importeColIdx = j;
      }
      if (descColIdx !== -1 && importeColIdx !== -1) {
        headerRowIdx = i;
        break;
      }
    }

    if (headerRowIdx === -1 || descColIdx === -1 || importeColIdx === -1) {
      return res.status(400).json({ error: 'No se encontraron las columnas de Descripción e Importe en el extracto.' });
    }

    let totalComisionesImpuestos = 0;
    const specificDebits = {};

    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const desc = String(row[descColIdx] || '').trim();
      let val = row[importeColIdx];
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

module.exports = router;
