import { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, CheckCircle, Clock, AlertCircle, MessageCircle, Play, Download, Trash2, Landmark, RotateCcw } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function InvoicesList() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [payModal, setPayModal] = useState({ show: false, inv: null, amount: '' });

  const fetchInvoices = async () => {
    try {
      const res = await axios.get('https://interfast-backend-95ww.onrender.com/api/invoices');
      setInvoices(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleGenerate = async () => {
    if (!window.confirm('¿Estás seguro de generar las facturas del mes actual para todos los clientes activos?')) return;
    setLoading(true);
    try {
      const res = await axios.post('https://interfast-backend-95ww.onrender.com/api/invoices/generate');
      alert(res.data.message);
      fetchInvoices();
    } catch (error) {
      console.error(error);
      alert('Error al generar facturas');
    }
    setLoading(false);
  };

  const handleDeleteInvoice = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas anular y eliminar esta factura? Si te equivocaste de monto, podrás generarla nuevamente tras corregir el Plan del cliente.')) return;
    
    setLoading(true);
    try {
      await axios.delete(`https://interfast-backend-95ww.onrender.com/api/invoices/${id}`);
      fetchInvoices();
    } catch (error) {
      console.error(error);
      alert('Error al eliminar factura: ' + (error.response?.data?.error || error.message));
    }
    setLoading(false);
  };

  const handleAfipEmit = async (id) => {
    if (!window.confirm('¿Confirmar emisión de Factura Electrónica a ARCA/AFIP? Esto generará un CAE oficial.')) return;
    setLoading(true);
    try {
      const res = await axios.post(`https://interfast-backend-95ww.onrender.com/api/invoices/${id}/afip`);
      alert(res.data.message + ' CAE: ' + res.data.cae);
      fetchInvoices();
    } catch (error) {
      console.error(error);
      alert('Error ARCA: ' + (error.response?.data?.error || error.message));
    }
    setLoading(false);
  };

  const handleMassAfip = async () => {
    const invoicesToEmit = selectedInvoices.filter(id => {
      const inv = invoices.find(i => i.id === id);
      return inv && inv.status === 'PAID' && !inv.afipCae;
    });

    if (invoicesToEmit.length === 0) {
      return alert('No hay facturas válidas seleccionadas. Tienen que estar Pagadas y sin emitir.');
    }

    if (!window.confirm(`¿Emitir ${invoicesToEmit.length} facturas a ARCA masivamente? Las que fallen revelarán el motivo pero continuará el bloque.`)) return;
    
    setLoading(true);
    try {
      const res = await axios.post(`https://interfast-backend-95ww.onrender.com/api/invoices/mass-afip`, {
        invoiceIds: invoicesToEmit
      });
      alert(res.data.message);
      setSelectedInvoices([]);
      fetchInvoices();
    } catch (error) {
      console.error(error);
      alert('Error ARCA Masivo: ' + (error.response?.data?.error || error.message));
    }
    setLoading(false);
  };

  const handlePayClick = (inv) => {
    setPayModal({ show: true, inv, amount: inv.totalAmount });
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.put(`https://interfast-backend-95ww.onrender.com/api/invoices/${payModal.inv.id}/pay`, {
        amountPaid: parseFloat(payModal.amount) || 0,
        lateFeeApplied: parseFloat(payModal.inv.calculatedLateFee) || 0,
        totalRequired: parseFloat(payModal.inv.totalAmount) || parseFloat(payModal.amount) || 0,
        method: 'CASH'
      });
      fetchInvoices();
      setSelectedInvoices(prev => prev.filter(id => id !== payModal.inv.id));
      setPayModal({ show: false, inv: null, amount: '' });
    } catch (error) {
      console.error(error);
      alert('Error al registrar pago parcial');
    }
    setLoading(false);
  };

  const startMassiveNotify = async (isSelective = false) => {
    const idsToSend = isSelective ? selectedInvoices : [];
    const count = isSelective ? idsToSend.length : invoices.filter(i => i.status === 'PENDING').length;
    
    if (count === 0) {
      alert('No hay facturas pendientes seleccionadas para notificar.');
      return;
    }

    const msg = isSelective 
      ? `¿Confirmar notificación a los ${count} clientes seleccionados mediante el Robot?`
      : `¿Confirmar notificación masiva a TODOS los deudores conectados en forma invisible?`;

    if(!window.confirm(msg)) return;
    
    setLoading(true);
    try {
      const res = await axios.post('https://interfast-backend-95ww.onrender.com/api/invoices/mass-notify', {
        invoiceIds: idsToSend
      });
      alert(res.data.message);
      setSelectedInvoices([]);
    } catch(err) {
      console.error(err);
      alert('Error en el robot: ' + (err.response?.data?.error || err.message));
    }
    setLoading(false);
  };

  const startMassiveWarning = async (isSelective = false) => {
    const idsToSend = isSelective ? selectedInvoices : [];
    const count = isSelective ? idsToSend.length : invoices.filter(i => i.status === 'PENDING').length;
    
    if (count === 0) {
      alert('No hay facturas pendientes seleccionadas para advertir.');
      return;
    }

    const msg = isSelective 
      ? `⚠️ ¿Confirmar AVISO DE CORTE a los ${count} clientes seleccionados mediante el Robot? (Se enviará con demoras de 6 segundos entre cada uno)`
      : `⚠️ ¿Confirmar AVISO DE CORTE masivo a TODOS los deudores conectados? (Esto tomará tiempo para no ser bloqueado por WhatsApp)`;

    if(!window.confirm(msg)) return;
    
    setLoading(true);
    try {
      const res = await axios.post('https://interfast-backend-95ww.onrender.com/api/invoices/mass-warning', {
        invoiceIds: idsToSend
      });
      alert(res.data.message);
      setSelectedInvoices([]);
    } catch(err) {
      console.error(err);
      alert('Error en el robot: ' + (err.response?.data?.error || err.message));
    }
    setLoading(false);
  };

  const startMassReminder = async () => {
    if (selectedInvoices.length === 0) {
      alert('No hay facturas pendientes seleccionadas.');
      return;
    }
    
    if(!window.confirm(`¿Enviar resumen de deuda y links de pago a los ${selectedInvoices.length} clientes seleccionados? (Incluye recargo 10% para MP)`)) return;
    
    setLoading(true);
    try {
      const res = await axios.post('https://interfast-backend-95ww.onrender.com/api/invoices/mass-reminder', {
        invoiceIds: selectedInvoices
      });
      alert(res.data.message);
      setSelectedInvoices([]);
    } catch(err) {
      console.error(err);
      alert('Error en el envío masivo: ' + (err.response?.data?.error || err.message));
    }
    setLoading(false);
  };

  const manualWhatsApp = (inv) => {
    if (!inv.client.phone) {
      alert('Este cliente no tiene teléfono registrado.');
      return;
    }
    const phone = inv.client.phone.replace(/\D/g, '');
    const centavos = String(((inv.clientId || (inv.client && inv.client.id) || inv.id || 1) % 99) + 1).padStart(2, '0');
    const totalEs = `${Math.floor(inv.totalAmount)},${centavos}`;
    const dueDateStr = inv.dueDate1 ? new Date(inv.dueDate1).toLocaleDateString('es-AR') : (inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('es-AR') : `10/${String(inv.month).padStart(2, '0')}/${inv.year}`);
    const pdfUrl = `https://interfast-backend-95ww.onrender.com/api/bot/factura-pdf?invoiceId=${inv.id}`;
    const message = encodeURIComponent(`Hola ${inv.client.name}! 👋🏻\n\nTe informamos que implementamos un nuevo sistema de gestión y facturación para mejorar nuestro servicio. Te acercamos el detalle de tu factura de Internet:\n📅 *Período:* ${inv.month}/${inv.year}\n⏰ *Vencimiento:* ${dueDateStr}\n💰 *Total a Abonar:* *$${totalEs}*\n\n📥 *Podés descargar tu factura con los 4 vencimientos en PDF aquí:* \n${pdfUrl}\n\n🚀 *MÉTODO RECOMENDADO (Transferencia sin recargos):*\nPodés abonar al Alias Mercado Pago: *interfastsm*\n👉 *Monto exacto para imputación automática: $${totalEs}* (es indispensable transferir con los centavos para que el sistema reconozca tu pago en segundos).\nUna vez transferido, envíanos la foto del comprobante por aquí.\n\n💡 *¿Otras opciones de pago?*\n• Si preferís abonar con tarjeta de crédito/débito, pídeme por aquí el *Link de Pago*.\n• ¡NUEVO! También podés pedirme sumarte al *Débito Automático Mensual* para despreocuparte de los vencimientos.\n\n¡Muchas gracias!`);
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const warningWhatsApp = (inv) => {
    if (!inv.client.phone) {
      alert('Este cliente no tiene teléfono registrado.');
      return;
    }
    const phone = inv.client.phone.replace(/\D/g, '');
    const centavos = String(((inv.clientId || (inv.client && inv.client.id) || inv.id || 1) % 99) + 1).padStart(2, '0');
    const totalEs = `${Math.floor(inv.totalAmount)},${centavos}`;
    const dueDateStr = inv.dueDate1 ? new Date(inv.dueDate1).toLocaleDateString('es-AR') : (inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('es-AR') : `10/${String(inv.month).padStart(2, '0')}/${inv.year}`);
    const pdfUrl = `https://interfast-backend-95ww.onrender.com/api/bot/factura-pdf?invoiceId=${inv.id}`;
    const message = encodeURIComponent(`Hola ${inv.client.name}! ⚠️\n\nTe contactamos desde administración. A la fecha no registramos el pago de tu factura de Internet:\n📅 *Período:* ${inv.month}/${inv.year}\n⏰ *Venció el:* ${dueDateStr}\n💰 *Saldo Adeudado:* *$${totalEs}*\n\nPor este motivo, te enviamos este AVISO DE CORTE.\n\n📥 *Podés descargar tu factura con los 4 vencimientos en PDF aquí:* \n${pdfUrl}\n\n🚀 *MÉTODO RECOMENDADO PARA REGULARIZAR AL INSTANTE:*\nPodés transferir al Alias Mercado Pago: *interfastsm*\n👉 *Monto exacto para imputación automática: $${totalEs}* (respeta los centavos para acreditar en segundos).\nEnvíanos la captura del comprobante por aquí para evitar la suspensión del servicio.\n\n💡 *¿Otras opciones?* Pídeme por aquí el *Link de Pago* con tarjeta o sumarte al *Débito Automático*.\n\n⚠️ *Si ya realizaste tu pago o transferencia en las últimas horas, por favor desestima este mensaje.*\n\n¡Muchas gracias!`);
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const generatePDF = (inv) => {
    const doc = new jsPDF();
    
    doc.setFont("helvetica");
    
    // Encabezado
    doc.setFontSize(24);
    doc.setTextColor(37, 99, 235); // Blue 600
    doc.text("tkip.net - Servicios de Red", 14, 24);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Gestión de Servicios de Internet", 14, 30);
    doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString('es-AR')}`, 14, 36);
    
    // Separator line
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(14, 42, 196, 42);

    // Titulo de Comprobante
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont("helvetica", "bold");
    const cbteTipoStr = inv.afipCbteTip === 1 ? 'FACTURA A' : 'FACTURA B';
    const ptoVtaStr = String(inv.afipPuntoVenta || 2).padStart(5, '0');
    const cbteNroStr = String(inv.afipCbteNro || inv.id).padStart(8, '0');
    const titleText = inv.afipCae ? `${cbteTipoStr} - COMPROBANTE OFICIAL ARCA` : "COMPROBANTE DE PAGO ELECTRÓNICO";
    doc.text(titleText, 14, 52);
    
    // Datos del Cliente
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Datos del Cliente:", 14, 62);
    
    doc.setTextColor(15, 23, 42);
    doc.text(`Nombre/Razón Social: ${inv.client?.name || 'Cliente Borrado'}`, 14, 68);
    doc.text(`Identificador: TK${String(inv.clientId).padStart(3, '0')}`, 14, 74);
    doc.text(`DNI/CUIT: ${inv.client?.dni || '---'}`, 14, 80);
    doc.text(`Dirección: ${inv.client?.address || '---'}`, 14, 86);

    // Datos de la Factura
    const facturaNroText = inv.afipCae ? `${ptoVtaStr}-${cbteNroStr}` : `F-${inv.year}-${String(inv.month).padStart(2, '0')}-${inv.id}`;
    doc.text(`Factura N°: ${facturaNroText}`, 110, 68);
    if (inv.afipCae) {
      doc.text(`Tipo / Ref: ${cbteTipoStr} (Int: F-${inv.id})`, 110, 74);
      doc.text(`Período: ${String(inv.month).padStart(2, '0')}/${inv.year}`, 110, 80);
      const paidDate = inv.payments && inv.payments.length > 0 ? new Date(inv.payments[0].paymentDate).toLocaleDateString('es-AR') : new Date().toLocaleDateString('es-AR');
      doc.text(`Fecha de Pago: ${paidDate}`, 110, 86);
      doc.text(`CAE ARCA: ${inv.afipCae}`, 110, 92);
    } else {
      doc.text(`Período de Servicio: ${String(inv.month).padStart(2, '0')}/${inv.year}`, 110, 74);
      const paidDate = inv.payments && inv.payments.length > 0 ? new Date(inv.payments[0].paymentDate).toLocaleDateString('es-AR') : new Date().toLocaleDateString('es-AR');
      doc.text(`Fecha de Pago: ${paidDate}`, 110, 80);
      doc.text(`Estado: ${inv.status === 'PAID' ? 'CANCELADA (PAGO TOTAL)' : 'PAGO PARCIAL A CUENTA'}`, 110, 86);
    }

    // Tabla de Conceptos
    const originalAmountRounded = inv.originalAmount ? inv.originalAmount.toFixed(2) : '0.00';
    const amountPaid = inv.payments && inv.payments.length > 0 ? inv.payments.reduce((acc, p) => acc + p.amountPaid, 0) : inv.totalAmount;
    
    const lateFee = amountPaid > parseFloat(originalAmountRounded) ? amountPaid - parseFloat(originalAmountRounded) : 0;
    
    const tableBody = [
      [
        `Abono de Internet (${inv.client?.plan?.name || 'Plan Base'})`,
        `${String(inv.month).padStart(2, '0')}/${inv.year}`,
        `$ ${originalAmountRounded}`,
        `$ ${parseFloat(originalAmountRounded).toFixed(2)}`
      ]
    ];

    if (lateFee > 0) {
      tableBody.push([
        `Recargo por Mora (Pago fuera de término)`,
        `---`,
        `---`,
        `$ ${lateFee.toFixed(2)}`
      ]);
      // Fila sumatoria
      tableBody.push([
        `TOTAL ABONADO`,
        ``,
        ``,
        `$ ${amountPaid.toFixed(2)}`
      ]);
    } else {
      // Si no hubo mora, simplemente dejamos explícito que el total abonado es el base
       tableBody[0][3] = `$ ${amountPaid.toFixed(2)}`;
    }
    
    try {
      autoTable(doc, {
        startY: 100,
        head: [['Descripción', 'Período', 'Precio Base', 'Importe Abonado']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 6 },
        columnStyles: {
          2: { halign: 'right' },
          3: { halign: 'right', fontStyle: 'bold' }
        }
      });
      
      const finalY = doc.lastAutoTable.finalY + 20;

      // Footer
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.setFont("helvetica", "italic");
      doc.text("Este documento es un comprobante válido de certificación de pago emitido por el sistema TKIP.", 14, finalY);
      doc.text("Cualquier duda administrativa comuníquese con nuestro soporte oficial.", 14, finalY + 6);
      
      let nextY = finalY + 16;
      if (inv.afipCae) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(`Comprobante Autorizado por ARCA (AFIP)`, 14, nextY);
        doc.setFont("helvetica", "normal");
        doc.text(`CAE: ${inv.afipCae}`, 14, nextY + 6);
        doc.text(`Vencimiento CAE: ${inv.afipVtoCae ? inv.afipVtoCae.replace(/(\d{4})(\d{2})(\d{2})/, '$3/$2/$1') : '---'}`, 14, nextY + 12);
        nextY += 22;
      }

      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("¡Gracias por confiar en TKIP ISP!", 14, nextY);
      
      // Guardar
      const safeClientName = (inv.client?.name || 'Cliente').replace(/[^a-z0-9]/gi, '_');
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      
      doc.save(`Recibo_${safeClientName}_${day}-${month}.pdf`);
    } catch(err) {
      console.error(err);
      alert('Hubo un error del sistema al generar el PDF.');
    }
  };

  const handleExportExcel = () => {
    if (filteredInvoices.length === 0) {
      alert("No hay facturas para exportar con los filtros actuales.");
      return;
    }

    const data = filteredInvoices.map(inv => {
      let estado = 'PENDIENTE';
      if (inv.status === 'PAID') estado = 'PAGADO';
      if (inv.status === 'PARTIAL') estado = 'PARCIAL';

      return {
        'Cliente': inv.client?.name || 'Cliente borrado',
        'ID Cliente': `TK${String(inv.clientId).padStart(3, '0')}`,
        'DNI/CUIT': inv.client?.dni || '',
        'Teléfono': inv.client?.phone || '',
        'Período': `${String(inv.month).padStart(2, '0')}/${inv.year}`,
        'Vencimiento': new Date(inv.dueDate).toLocaleDateString('es-AR'),
        'Original ($)': inv.originalAmount,
        'Mora ($)': inv.calculatedLateFee || 0,
        'Total a Pagar ($)': inv.totalAmount,
        'Estado': estado,
        'Monto Abonado ($)': inv.payments && inv.payments.length > 0 
          ? inv.payments.reduce((acc, p) => acc + p.amountPaid, 0) 
          : (inv.status === 'PAID' ? inv.totalAmount : 0)
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Facturas");
    
    // Auto-size columns slightly
    const colWidths = [
      { wch: 30 }, // Cliente
      { wch: 15 }, // ID
      { wch: 15 }, // DNI
      { wch: 15 }, // Tel
      { wch: 10 }, // Período
      { wch: 15 }, // Vencimiento
      { wch: 12 }, // Original
      { wch: 10 }, // Mora
      { wch: 15 }, // Total
      { wch: 15 }, // Estado
      { wch: 18 }  // Abonado
    ];
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, `Facturacion_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredInvoices = invoices.filter(inv => {
    const isSearchingDate = (startDate !== '' && endDate !== '');
    const term = searchTerm.toLowerCase();
    const clientName = (inv.client?.name || '').toLowerCase();
    const clientDni = (inv.client?.dni || '').toLowerCase();
    
    const isAnyFilterActive = isSearchingDate || term !== '' || statusFilter !== 'ALL' || paymentFilter !== 'ALL';

    // Ocultar facturas Pagadas solo en la vista por defecto sin filtros activos
    if (inv.status === 'PAID' && !isAnyFilterActive) {
      return false;
    }

    if (term && !clientName.includes(term) && !clientDni.includes(term) && !inv.id.toString().includes(term)) {
      return false;
    }

    // 1. Period Filter (Date Range Calendar)
    if (isSearchingDate) {
       const start = new Date(startDate);
       start.setHours(0, 0, 0, 0);
       const end = new Date(endDate);
       end.setHours(23, 59, 59, 999);
       
       const dueDate = new Date(inv.dueDate);
       const created = new Date(inv.createdAt);
       const updated = new Date(inv.updatedAt);
       const paymentDates = (inv.payments || []).map(p => new Date(p.paymentDate || p.createdAt || inv.updatedAt));
       
       const allDates = [dueDate, created, updated, ...paymentDates];
       const matchesDate = allDates.some(d => !isNaN(d) && d >= start && d <= end);
       
       if (!matchesDate) {
         return false;
       }
    }

    // 2. Payment Method Filter
    if (paymentFilter === 'CASH') {
      if (!inv.payments || !inv.payments.some(p => p.method === 'CASH')) return false;
    }
    if (paymentFilter === 'MERCADOPAGO') {
      if (!inv.payments || !inv.payments.some(p => p.method === 'MERCADOPAGO')) return false;
    }
    
    // 3. Status Filter
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'UNBILLED') {
        if (inv.afipCae) return false;
      } else {
        if (inv.status !== statusFilter) return false;
      }
    }

    return true;
  });

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const now = new Date();
      const allSelectableIds = filteredInvoices.filter(inv => {
        const recentlyNotified = inv.notifiedAt && (now - new Date(inv.notifiedAt)) < 24 * 60 * 60 * 1000;
        return (inv.status === 'PENDING' && !recentlyNotified) || (inv.status === 'PAID' && !inv.afipCae);
      }).map(inv => inv.id);
      setSelectedInvoices(allSelectableIds);
    } else {
      setSelectedInvoices([]);
    }
  };

  const handleSelectOne = (id) => {
    if (selectedInvoices.includes(id)) {
      setSelectedInvoices(selectedInvoices.filter(selectedId => selectedId !== id));
    } else {
      setSelectedInvoices([...selectedInvoices, id]);
    }
  };

  const selectableCount = filteredInvoices.filter(inv => inv.status === 'PENDING' || (inv.status === 'PAID' && !inv.afipCae)).length;
  const isAllSelected = selectableCount > 0 && selectedInvoices.length === selectableCount;

  return (
    <div className="space-y-6 relative">
      <header className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center gap-4 bg-white p-4 2xl:p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="w-full 2xl:w-auto">
          <h2 className="text-2xl 2xl:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <FileText className="text-blue-600" size={32} />
            Facturación Mensual
            <span className="text-sm font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded-full mt-1 ml-2">
              {filteredInvoices.length} {filteredInvoices.length === 1 ? 'Factura' : 'Facturas'}
            </span>
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="text-slate-500 text-sm">Filtros:</p>
            <input 
              type="text"
              placeholder="🔍 Buscar cliente..."
              value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
              className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none w-48 focus:ring-2 focus:ring-blue-500"
            />
            <input 
              type="date"
              value={startDate} onChange={e=>setStartDate(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none"
              title="Fecha Desde"
            />
            <span className="text-slate-400">-</span>
            <input 
              type="date"
              value={endDate} onChange={e=>setEndDate(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none"
              title="Fecha Hasta"
            />
            <select 
              value={paymentFilter} onChange={e=>setPaymentFilter(e.target.value)}
              className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none p-1"
            >
              <option value="ALL">Todas las Facturas</option>
              <option value="CASH">💰 Solo Efectivo</option>
              <option value="MERCADOPAGO">💳 Solo Web</option>
            </select>
            <select 
              value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
              className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none p-1"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="PAID">✅ Pagados</option>
              <option value="PENDING">⏳ Pendientes</option>
              <option value="PARTIAL">⚠️ Parciales</option>
              <option value="UNBILLED">🧾 Sin Facturar en ARCA</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center w-full 2xl:w-auto mt-2 2xl:mt-0">
          {selectedInvoices.length > 0 && (
            <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
              <button 
                onClick={handleMassAfip} disabled={loading}
                className="bg-sky-500 hover:bg-sky-600 text-white px-3 py-2 rounded-lg font-bold shadow-sm transition-colors flex items-center gap-1.5 text-xs"
              >
                <Landmark size={16} />
                Lote AFIP ({selectedInvoices.length})
              </button>
              <button 
                onClick={startMassReminder} disabled={loading}
                className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-lg font-bold shadow-sm transition-colors flex items-center gap-1.5 text-xs"
              >
                <MessageCircle size={16} />
                Deuda a WP ({selectedInvoices.length})
              </button>
              <button 
                onClick={() => startMassiveNotify(true)} disabled={loading}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg font-bold shadow-sm transition-colors flex items-center gap-1.5 text-xs"
              >
                <MessageCircle size={16} />
                WhatsApp ({selectedInvoices.length})
              </button>
              <button 
                onClick={() => startMassiveWarning(true)} disabled={loading}
                className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg font-bold shadow-sm transition-colors flex items-center gap-1.5 text-xs"
              >
                <AlertCircle size={16} />
                Corte ({selectedInvoices.length})
              </button>
            </div>
          )}
          <button 
            onClick={handleExportExcel} disabled={loading}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-colors flex items-center gap-2 disabled:bg-emerald-400"
          >
            <Download size={16} />
            Exportar
          </button>
          {selectedInvoices.length === 0 && (
            <>
              <button 
                onClick={() => startMassiveNotify(false)} disabled={loading}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-colors flex items-center gap-2 disabled:bg-green-400"
              >
                <MessageCircle size={16} />
                {loading ? 'Trabajando...' : 'Notificar Todos'}
              </button>
              <button 
                onClick={() => startMassiveWarning(false)} disabled={loading}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-colors flex items-center gap-2 disabled:bg-orange-400"
              >
                <AlertCircle size={16} />
                {loading ? 'Trabajando...' : 'Avisar Cortes'}
              </button>
            </>
          )}
          <button 
            onClick={handleGenerate} disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm shadow-indigo-200 transition-colors flex items-center gap-2 disabled:bg-indigo-400"
          >
            <Play size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Procesando...' : 'Generar Deuda'}
          </button>
        </div>
      </header>

      {/* Tabla de Facturas */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                <th className="px-3 py-3 font-semibold text-center w-12">
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll}
                    checked={isAllSelected}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                  />
                </th>
                <th className="px-3 py-3 font-semibold">Cliente</th>
                <th className="px-3 py-3 font-semibold text-center">Período</th>
                <th className="px-3 py-3 font-semibold text-center">Vencimiento</th>
                <th className="px-3 py-3 font-semibold text-right">Original</th>
                <th className="px-3 py-3 font-semibold text-right text-orange-500">Mora</th>
                <th className="px-3 py-3 font-semibold text-right text-blue-600">Total a Pagar</th>
                <th className="px-3 py-3 font-semibold text-center">Estado</th>
                <th className="px-3 py-3 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-16 text-center text-slate-400">
                    <FileText className="mx-auto mb-3 opacity-20" size={48} />
                    <p className="text-lg font-medium text-slate-500">Aún no hay facturas aquí.</p>
                  </td>
                </tr>
              ) : (
                [...filteredInvoices].sort((a, b) => (a.client?.name || '').localeCompare(b.client?.name || '')).map(inv => {
                  const isPaid = inv.status === 'PAID';
                  const recentlyNotified = inv.notifiedAt && (new Date() - new Date(inv.notifiedAt)) < 24 * 60 * 60 * 1000;
                  const isSelectable = (!isPaid && !recentlyNotified) || (isPaid && !inv.afipCae);
                  return (
                    <tr key={inv.id} className={`transition-colors ${isPaid ? 'bg-slate-50/50' : 'hover:bg-slate-50'}`}>
                      <td className="px-3 py-3 text-center">
                        {isSelectable && (
                          <input 
                            type="checkbox" 
                            onChange={() => handleSelectOne(inv.id)}
                            checked={selectedInvoices.includes(inv.id)}
                            className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer mt-1"
                          />
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-semibold text-slate-900">{inv.client?.name || 'Cliente borrado'}</div>
                        <div className="text-xs text-blue-600 font-bold uppercase tracking-wider">
                          TK{String(inv.clientId).padStart(3, '0')}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center font-medium text-slate-600">
                        {String(inv.month).padStart(2, '0')}/{inv.year}
                      </td>
                      <td className="px-3 py-3 text-center text-slate-600">
                        {new Date(inv.dueDate).toLocaleDateString('es-AR')}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-600">
                        ${inv.originalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {inv.calculatedLateFee > 0 ? (
                          <span className="text-orange-500 font-bold inline-flex items-center gap-1">
                            <AlertCircle size={14} /> +${inv.calculatedLateFee.toLocaleString(undefined, {minimumFractionDigits: 2})}
                          </span>
                        ) : (
                          <span className="text-slate-300">---</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className={`font-bold ${isPaid ? 'text-slate-500 line-through' : 'text-slate-900 text-base'}`}>
                          ${inv.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                            <CheckCircle size={14} /> PAGADO
                          </span>
                        ) : inv.status === 'PARTIAL' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                            <CheckCircle size={14} /> PARCIAL
                          </span>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                              <Clock size={14} /> PENDIENTE
                            </span>
                            {inv.notifiedAt && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                                <MessageCircle size={10} /> NOTIFICADO
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {inv.status !== 'PAID' && (
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => handlePayClick(inv)} 
                              className="text-emerald-600 hover:text-emerald-700 transition-colors p-2 rounded-lg hover:bg-emerald-50 font-medium text-xs border border-emerald-200 bg-white"
                              title="Recibir Dinero"
                            >
                              Cobrar
                            </button>
                            {!recentlyNotified && (
                              <button 
                                onClick={() => manualWhatsApp(inv)} 
                                className="text-green-500 hover:text-green-700 transition-colors p-2 rounded-lg hover:bg-green-50 bg-white border border-green-200" 
                                title="Mensaje Normal WhatsApp"
                              >
                                <MessageCircle size={16} />
                              </button>
                            )}
                            {inv.status === 'PENDING' && !recentlyNotified && (
                              <button 
                                onClick={() => warningWhatsApp(inv)} 
                                className="text-orange-500 hover:text-orange-700 transition-colors p-2 rounded-lg hover:bg-orange-50 bg-white border border-orange-200 flex items-center gap-1 font-bold text-xs" 
                                title="Aviso de Corte WhatsApp"
                              >
                                <AlertCircle size={16} /> Corte
                              </button>
                            )}
                            {inv.status === 'PENDING' && (
                              <button 
                                onClick={() => handleDeleteInvoice(inv.id)} 
                                className="text-red-500 hover:text-red-700 transition-colors p-2 rounded-lg hover:bg-red-50 bg-white border border-red-200" 
                                title="Anular Factura"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        )}
                        {(inv.status === 'PAID' || inv.status === 'PARTIAL') && (
                          <div className="flex flex-col gap-2 mt-2">
                            <button 
                              onClick={() => generatePDF(inv)}
                              className="bg-slate-800 hover:bg-slate-700 text-white transition-colors px-3 py-1.5 rounded-lg flex items-center justify-center gap-2 w-full text-xs font-medium shadow-sm"
                              title="Descargar Comprobante PDF"
                            >
                              <Download size={14} /> Descargar PDF
                            </button>
                            {inv.status === 'PAID' && !inv.afipCae && (
                              <button 
                                onClick={() => handleAfipEmit(inv.id)}
                                className="bg-sky-600 hover:bg-sky-700 text-white transition-colors px-3 py-1.5 rounded-lg flex items-center justify-center gap-2 w-full text-xs font-bold shadow-sm"
                                title="Declarar recibo a ARCA"
                              >
                                <Landmark size={14} /> Emitir ARCA
                              </button>
                            )}
                            {inv.afipCae && (
                              <div className="bg-emerald-50 text-emerald-800 px-3 py-2 rounded-lg flex flex-col items-center justify-center border border-emerald-200">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">CAE APROBADO</span>
                                <span className="font-mono text-xs font-bold">{inv.afipCae}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {payModal.show && payModal.inv && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-slate-50 p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">Recibir Pago</h3>
              <p className="text-sm text-slate-500 mt-1">Saldar total o recibir monto parcial.</p>
            </div>
            <form onSubmit={submitPayment} className="p-6 space-y-5">
              
              <div className="bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-100 flex justify-between items-center">
                <span className="font-semibold text-sm">Cobro Ideal:</span>
                <span className="font-black text-lg">${payModal.inv.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Monto Entregado por Cliente ($)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={payModal.amount} 
                  onChange={e => setPayModal({...payModal, amount: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xl font-bold rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-center"
                />
                {parseFloat(payModal.amount) < payModal.inv.totalAmount && (
                  <p className="text-orange-600 text-xs font-bold mt-2 flex items-center gap-1">
                    <AlertCircle size={14}/> La factura quedará en estado PARCIAL.
                  </p>
                )}
              </div>
              
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setPayModal({show:false, inv:null, amount:''})} className="flex-1 bg-white border border-slate-200 text-slate-600 px-4 py-3 rounded-xl font-bold hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-xl font-bold shadow-md shadow-emerald-200 transition-colors">
                  {loading ? 'Cobrando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
