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

    let comisiones = 0;
    let impuestos = 0;
    let totalNeto = 0;
    let itemsCount = 0;

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
        // En extracto bancario: importe negativo es débito/costo; positivo es devolución/crédito
        const costo = -importe;
        totalNeto += costo;
        if (isImpuesto) impuestos += costo;
        if (isComision) comisiones += costo;
        itemsCount++;
      }
    }

    if (totalNeto <= 0) {
      return res.status(400).json({ error: 'No se detectaron gastos ni comisiones en el archivo subido.' });
    }

    const description = `[CAJA: BANCO_ROELA] Gastos y Comisiones Banco Roela - ${period || req.file.originalname}`;
    const targetDate = extractedEndDate || new Date();

    const movement = await prisma.cashMovement.create({
      data: {
        type: 'OUT',
        amount: Number(totalNeto.toFixed(2)),
        category: 'GASTOS_VARIOS',
        description,
        operator: 'BANCO_ROELA',
        createdAt: targetDate,
        userId: parseInt(req.user?.id) || 1
      },
      include: { user: { select: { username: true } } }
    });

    console.log(`✅ Upload Roela Report: Conciliado por $${totalNeto.toFixed(2)} (${period || req.file.originalname})`);
    res.json({
      message: 'Extracto de Banco Roela procesado con éxito',
      movement,
      breakdown: {
        period: period || 'No especificado',
        comisiones: Number(comisiones.toFixed(2)),
        impuestos: Number(impuestos.toFixed(2)),
        totalNeto: Number(totalNeto.toFixed(2)),
        itemsCount
      }
    });

  } catch (err) {
    console.error('❌ Error en Upload Banco Roela Report:', err);
    res.status(500).json({ error: 'Error procesando el archivo de Banco Roela: ' + err.message });
  }
});

module.exports = router;
