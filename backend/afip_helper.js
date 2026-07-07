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

function generateInvoicePDFStream(invoice, res) {
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  const clientName = invoice.client ? invoice.client.name : 'Consumidor Final';
  const clientDni = invoice.client ? (invoice.client.cuit || invoice.client.dni || '00000000') : '00000000';
  const clientAddr = invoice.client ? (invoice.client.address || 'Mendoza, Argentina') : 'Mendoza, Argentina';
  const amount = invoice.originalAmount || 0;
  const netAmount = (amount / 1.21).toFixed(2);
  const ivaAmount = (amount - netAmount).toFixed(2);
  const cbteTipoStr = invoice.afipCbteTip === 1 ? 'A' : 'B';
  const ptoVtaStr = String(invoice.afipPuntoVenta || 2).padStart(5, '0');
  const cbteNroStr = String(invoice.afipCbteNro || invoice.id).padStart(8, '0');

  // Cabecera superior
  doc.fillColor('#1e293b').fontSize(20).font('Helvetica-Bold').text('INTERFAST - TodoSeguridadSM', { align: 'left' });
  doc.fontSize(10).font('Helvetica').fillColor('#64748b').text('Proveedor de Servicios de Internet WISP | Mendoza, Argentina');
  doc.text('CUIT: 30-71701055-4 | IVA Responsable Inscripto | Inicio de Actividades: 2021');
  doc.moveDown(1);

  // Cuadro Central Tipo Comprobante
  doc.rect(250, 40, 50, 50).fillAndStroke('#f1f5f9', '#94a3b8');
  doc.fillColor('#0f172a').fontSize(26).font('Helvetica-Bold').text(cbteTipoStr, 265, 50);
  doc.fontSize(8).text(`COD. 00${invoice.afipCbteTip || 6}`, 260, 78);

  // Datos Fiscales Comprobante (Derecha)
  doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text(`FACTURA ${cbteTipoStr}`, 320, 45);
  doc.fontSize(11).text(`Punto de Venta: ${ptoVtaStr}   Comp. N°: ${cbteNroStr}`, 320, 65);
  doc.fontSize(10).font('Helvetica').text(`Fecha de Emisión: ${new Date(invoice.createdAt).toLocaleDateString('es-AR')}`, 320, 85);

  doc.moveTo(50, 115).lineTo(550, 115).strokeColor('#cbd5e1').stroke();
  doc.moveDown(2);

  // Cuadro Cliente
  doc.rect(50, 130, 500, 70).fillAndStroke('#f8fafc', '#e2e8f0');
  doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text('DATOS DEL RECEPTOR / CLIENTE:', 60, 140);
  doc.fontSize(10).font('Helvetica').text(`Señor(es): ${clientName}`, 60, 158);
  doc.text(`CUIT / DNI: ${clientDni}     |     Condición frente al IVA: Consumidor Final / Reg. Gen.`, 60, 175);
  doc.text(`Domicilio: ${clientAddr}`, 300, 158);

  // Tabla Detalle
  let y = 220;
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

  // Totales
  y += 60;
  doc.rect(330, y, 220, 90).fillAndStroke('#f8fafc', '#cbd5e1');
  doc.fillColor('#475569').fontSize(10).font('Helvetica');
  doc.text('Subtotal Neto:', 345, y + 15);
  doc.text(`$${netAmount}`, 470, y + 15, { align: 'right', width: 65 });

  doc.text('IVA 21%:', 345, y + 35);
  doc.text(`$${ivaAmount}`, 470, y + 35, { align: 'right', width: 65 });

  doc.moveTo(345, y + 55).lineTo(535, y + 55).strokeColor('#cbd5e1').stroke();
  doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold');
  doc.text('IMPORTE TOTAL:', 345, y + 65);
  doc.text(`$${amount.toFixed(2)}`, 460, y + 65, { align: 'right', width: 75 });

  // Pie Fiscal ARCA / CAE
  y += 120;
  doc.rect(50, y, 500, 75).fillAndStroke('#eff6ff', '#bfdbfe');
  doc.fillColor('#1d4ed8').fontSize(12).font('Helvetica-Bold').text('COMPROBANTE AUTORIZADO POR ARCA (ex-AFIP)', 60, y + 12);
  doc.fillColor('#1e3a8a').fontSize(11).font('Helvetica');
  doc.text(`CAE (Código de Autorización Electrónico): ${invoice.afipCae || 'TRAMITE EN PROCESO / SIMULACION'}`, 60, y + 32);
  doc.text(`Fecha de Vencimiento de CAE: ${invoice.afipVtoCae || '18/07/2026'}`, 60, y + 50);

  doc.fontSize(8).fillColor('#64748b').text('Este documento es una representación impresa de un comprobante fiscal electrónico emitido según las normativas vigentes de ARCA.', 50, y + 90, { align: 'center', width: 500 });

  doc.end();
}

module.exports = {
  emitAfipInvoiceHelper,
  generateInvoicePDFStream
};
