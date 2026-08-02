const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const PDFDocument = require('pdfkit');

async function emitAfipInvoiceHelper(invoiceId, afipInstance) {
  if (!afipInstance) return { success: false, error: 'Módulo ARCA/AFIP no configurado.' };
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: parseInt(invoiceId) },
      include: { client: true, payments: true }
    });
    if (!invoice) return { success: false, error: 'Factura no encontrada' };
    if (invoice.status !== 'PAID') return { success: false, error: 'La factura debe estar PAGADA para emitirse en ARCA.' };
    if (invoice.afipCae) return { success: true, cae: invoice.afipCae, alreadyEmitted: true };

    let cbteTipo = 6;
    let docTipo = 99;
    let docNro = 0;

    if (invoice.client && invoice.client.taxCondition === 'RESPONSABLE_INSCRIPTO' && invoice.client.cuit) {
      cbteTipo = 1;
      docTipo = 80;
      docNro = invoice.client.cuit.replace(/\D/g, '');
    } else if (invoice.client && (invoice.client.dni || invoice.client.cuit)) {
      const rawId = (invoice.client.cuit || invoice.client.dni).replace(/\D/g, '');
      if (rawId.length === 11) {
        docTipo = 80;
        docNro = rawId;
      } else if (rawId.length >= 7) {
        docTipo = 96;
        docNro = rawId;
      }
    }

    const puntoVenta = 2;
    const lastVoucher = await afipInstance.ElectronicBilling.getLastVoucher(puntoVenta, cbteTipo);
    const cbteNro = lastVoucher + 1;

    const totalAmount = invoice.payments.reduce((acc, p) => acc + p.amountPaid, 0) || invoice.originalAmount;
    const netAmount = totalAmount / 1.21;
    const ivaAmount = totalAmount - netAmount;

    const todayDateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const firstDayMonth = new Date(invoice.year, invoice.month - 1, 1).toISOString().slice(0, 10).replace(/-/g, '');
    const lastDayMonth = new Date(invoice.year, invoice.month, 0).toISOString().slice(0, 10).replace(/-/g, '');

    const data = {
      'CantReg': 1,
      'PtoVta': puntoVenta,
      'CbteTipo': cbteTipo,
      'Concepto': 2,
      'DocTipo': docTipo,
      'DocNro': docNro,
      'CbteDesde': cbteNro,
      'CbteHasta': cbteNro,
      'CbteFch': parseInt(todayDateStr),
      'ImpTotal': parseFloat(totalAmount.toFixed(2)),
      'ImpTotConc': 0,
      'ImpNeto': parseFloat(netAmount.toFixed(2)),
      'ImpOpEx': 0,
      'ImpIVA': parseFloat(ivaAmount.toFixed(2)),
      'ImpTrib': 0,
      'FchServDesde': parseInt(firstDayMonth),
      'FchServHasta': parseInt(lastDayMonth),
      'FchVtoPago': parseInt(todayDateStr),
      'MonId': 'PES',
      'MonCotiz': 1,
      'Iva': [
        {
          'Id': 5,
          'BaseImp': parseFloat(netAmount.toFixed(2)),
          'Importe': parseFloat(ivaAmount.toFixed(2))
        }
      ]
    };

    const resAfip = await afipInstance.ElectronicBilling.createVoucher(data);

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        afipCae: resAfip.CAE,
        afipVtoCae: resAfip.CAEFchVto,
        afipPuntoVenta: puntoVenta,
        afipCbteTip: cbteTipo,
        afipCbteNro: cbteNro
      }
    });

    console.log(`✅ [ARCA Automático] Factura N°${invoice.id} emitida con éxito. CAE: ${resAfip.CAE}`);
    return { success: true, cae: resAfip.CAE };
  } catch (err) {
    console.error(`⚠️ [ARCA Automático] Falló emisión para factura ID ${invoiceId}:`, err.message || err);
    return { success: false, error: err.message || 'Error ARCA' };
  }
}

function drawInvoicePDF(doc, invoice) {
  const clientName = invoice.client ? invoice.client.name : 'Consumidor Final';
  const clientDni = invoice.client ? (invoice.client.cuit || invoice.client.dni || '00000000') : '00000000';
  const clientAddr = invoice.client ? (invoice.client.address || 'Mendoza, Argentina') : 'Mendoza, Argentina';
  // Calcular el monto total a mostrar de forma dinámica según la fecha y centavos
  let finalAmount = invoice.originalAmount || 0;
  let currentV = 1;

  if (invoice.status === 'PENDING') {
    const today = new Date();
    let currentAmount = invoice.priceV1 || invoice.originalAmount || 0;
    if (invoice.dueDate1) {
      const d1 = new Date(invoice.dueDate1); d1.setHours(23, 59, 59, 999);
      const d2 = new Date(invoice.dueDate2 || invoice.dueDate1); d2.setHours(23, 59, 59, 999);
      const d3 = new Date(invoice.dueDate3 || invoice.dueDate1); d3.setHours(23, 59, 59, 999);
      const d4 = new Date(invoice.dueDate4 || invoice.dueDate1); d4.setHours(23, 59, 59, 999);

      if (today > d3 && invoice.priceV4) {
        currentAmount = invoice.priceV4;
        currentV = 4;
      } else if (today > d2 && invoice.priceV3) {
        currentAmount = invoice.priceV3;
        currentV = 3;
      } else if (today > d1 && invoice.priceV2) {
        currentAmount = invoice.priceV2;
        currentV = 2;
      }
    }
    const valCents = ((invoice.clientId || invoice.id || 1) % 1000);
    const centsOffset = valCents / 100;
    finalAmount = currentAmount + centsOffset;
  } else {
    const paymentsSum = invoice.payments && invoice.payments.length > 0
      ? invoice.payments.reduce((acc, p) => acc + p.amountPaid, 0)
      : 0;
    if (paymentsSum > 0) {
      finalAmount = paymentsSum;
    } else {
      const valCents = ((invoice.clientId || invoice.id || 1) % 1000);
      const centsOffset = valCents / 100;
      finalAmount = (invoice.originalAmount || 0) + centsOffset;
    }
  }

  const netAmount = (finalAmount / 1.21).toFixed(2);
  const ivaAmount = (finalAmount - netAmount).toFixed(2);
  const cbteTipoStr = invoice.status === 'PAID' ? (invoice.afipCbteTip === 1 ? 'A' : 'B') : 'X';
  const docTitleStr = invoice.status === 'PAID' ? `FACTURA ${cbteTipoStr}` : 'PRESUPUESTO / DEUDA';
  const ptoVtaStr = String(invoice.afipPuntoVenta || 2).padStart(5, '0');
  const cbteNroStr = String(invoice.afipCbteNro || invoice.id).padStart(8, '0');

  // Cabecera superior izquierda
  doc.fillColor('#1e293b').fontSize(14).font('Helvetica-Bold').text('INTERFAST', 50, 45, { width: 185 });
  doc.fontSize(10).text('TodoSeguridadSM', { width: 185 });
  doc.moveDown(0.2);
  doc.fontSize(8).font('Helvetica').fillColor('#64748b').text('Proveedor de Servicios de Internet WISP | Mendoza, Argentina', { width: 185 });
  doc.text('CUIT: 30-71701055-4\nIVA Responsable Inscripto\nInicio de Actividades: 2021', { width: 185 });

  // Cuadro Central Tipo Comprobante
  doc.rect(245, 40, 45, 45).fillAndStroke('#f1f5f9', '#94a3b8');
  doc.fillColor('#0f172a').fontSize(24).font('Helvetica-Bold').text(cbteTipoStr, 258, 48);
  doc.fontSize(7).text(`COD. 00${invoice.afipCbteTip || 0}`, 248, 73);

  // Datos Fiscales Comprobante
  doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text(docTitleStr, 305, 45);
  doc.fontSize(10).font('Helvetica-Bold').text(`Punto de Venta: ${ptoVtaStr}   Comp. N°: ${cbteNroStr}`, 305, 65);
  doc.fontSize(9).font('Helvetica').text(`Fecha de Emisión: ${new Date(invoice.createdAt).toLocaleDateString('es-AR')}`, 305, 85);

  doc.moveTo(50, 125).lineTo(550, 125).strokeColor('#cbd5e1').stroke();

  // Cuadro Cliente
  doc.rect(50, 135, 500, 65).fillAndStroke('#f8fafc', '#e2e8f0');
  doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text('DATOS DEL RECEPTOR / CLIENTE:', 60, 145);
  doc.fontSize(9).font('Helvetica').text(`Señor(es): ${clientName}`, 60, 160, { width: 230 });
  doc.text(`CUIT / DNI: ${clientDni} | IVA: Consumidor Final`, 60, 175, { width: 230 });
  doc.text(`Domicilio: ${clientAddr}`, 300, 160, { width: 240 });

  // Tabla Detalle
  let y = 215;
  doc.rect(50, y, 500, 25).fill('#1e293b');
  doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');
  doc.text('DESCRIPCIÓN / SERVICIO', 60, y + 8);
  doc.text('CANT.', 350, y + 8);
  doc.text('PRECIO UNIT.', 400, y + 8);
  doc.text('SUBTOTAL', 480, y + 8);

  y += 25;
  doc.rect(50, y, 500, 40).fillAndStroke('#ffffff', '#cbd5e1');
  doc.fillColor('#1e293b').fontSize(10).font('Helvetica');
  doc.text(`Servicio de Internet Banda Ancha WISP - Período ${invoice.month}/${invoice.year}`, 60, y + 15);
  doc.text('1.00', 355, y + 15);
  doc.text(`$${netAmount}`, 405, y + 15);
  doc.text(`$${netAmount}`, 485, y + 15);

  // Totales & Cuadro de Vencimientos Escalonados
  y += 60;
  
  // Box Vencimientos (Izquierda)
  doc.rect(50, y, 270, 90).fillAndStroke('#f8fafc', '#cbd5e1');
  doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text('VENCIMIENTOS Y TARIFAS VIGENTES:', 60, y + 12);
  doc.fontSize(8).font('Helvetica').fillColor('#334155');
  const d1 = invoice.dueDate1 ? new Date(invoice.dueDate1).toLocaleDateString('es-AR') : '10/07/2026';
  const d2 = invoice.dueDate2 ? new Date(invoice.dueDate2).toLocaleDateString('es-AR') : '15/07/2026';
  const d3 = invoice.dueDate3 ? new Date(invoice.dueDate3).toLocaleDateString('es-AR') : '20/07/2026';
  const d4 = invoice.dueDate4 ? new Date(invoice.dueDate4).toLocaleDateString('es-AR') : '22/07/2026';
  
  let listY = y + 28;
  if (currentV <= 1) { doc.text(`• Vencimiento 1 (Hasta ${d1}): $${(invoice.priceV1 || invoice.originalAmount || 0).toFixed(2)}`, 60, listY); listY += 13; }
  if (currentV <= 2) { doc.text(`• Vencimiento 2 (Hasta ${d2}): $${(invoice.priceV2 || invoice.originalAmount || 0).toFixed(2)}`, 60, listY); listY += 13; }
  if (currentV <= 3) { doc.text(`• Vencimiento 3 (Hasta ${d3}): $${(invoice.priceV3 || invoice.originalAmount || 0).toFixed(2)}`, 60, listY); listY += 13; }
  doc.text(`• Vencimiento 4 (Desde ${d4} / Corte): $${(invoice.priceV4 || invoice.originalAmount || 0).toFixed(2)}`, 60, listY);

  // Box Totales (Derecha)
  doc.rect(330, y, 220, 90).fillAndStroke('#f8fafc', '#cbd5e1');
  doc.fillColor('#475569').fontSize(10).font('Helvetica');
  doc.text('Subtotal Neto:', 345, y + 15);
  doc.text(`$${netAmount}`, 470, y + 15, { align: 'right', width: 65 });

  doc.text('IVA 21%:', 345, y + 35);
  doc.text(`$${ivaAmount}`, 470, y + 35, { align: 'right', width: 65 });

  doc.moveTo(345, y + 55).lineTo(535, y + 55).strokeColor('#cbd5e1').stroke();
  doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold');
  doc.text('IMPORTE TOTAL:', 345, y + 65);
  doc.text(`$${finalAmount.toFixed(2)}`, 460, y + 65, { align: 'right', width: 75 });

  // Pie Fiscal ARCA / CAE
  y += 120;
  doc.rect(50, y, 500, 75).fillAndStroke('#eff6ff', '#bfdbfe');
  doc.fillColor('#1d4ed8').fontSize(12).font('Helvetica-Bold').text('COMPROBANTE AUTORIZADO POR ARCA (ex-AFIP)', 60, y + 12);
  doc.fillColor('#1e3a8a').fontSize(11).font('Helvetica');
  doc.text(`CAE (Código de Autorización Electrónico): ${invoice.afipCae || 'TRAMITE EN PROCESO / SIMULACION'}`, 60, y + 32);
  doc.text(`Fecha de Vencimiento de CAE: ${invoice.afipVtoCae || '18/07/2026'}`, 60, y + 50);

  doc.fontSize(8).fillColor('#64748b').text('Este documento es una representación impresa de un comprobante fiscal electrónico emitido según las normativas vigentes de ARCA.', 50, y + 90, { align: 'center', width: 500 });
}

function generateInvoicePDFStream(invoice, res) {
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);
  drawInvoicePDF(doc, invoice);
  doc.end();
}

function generateInvoicePDFBuffer(invoice) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));
      drawInvoicePDF(doc, invoice);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  emitAfipInvoiceHelper,
  generateInvoicePDFStream,
  generateInvoicePDFBuffer
};
