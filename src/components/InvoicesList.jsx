import { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, CheckCircle, Clock, AlertCircle, MessageCircle, Play, Download, Trash2, Landmark } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function InvoicesList() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [periodFilter, setPeriodFilter] = useState('RECENT');
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
        amountPaid: parseFloat(payModal.amount),
        lateFeeApplied: payModal.inv.calculatedLateFee,
        totalRequired: payModal.inv.totalAmount,
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

  const manualWhatsApp = (inv) => {
    if (!inv.client.phone) {
      alert('Este cliente no tiene teléfono registrado.');
      return;
    }
    const phone = inv.client.phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Hola ${inv.client.name}! \n\nTe recordamos que tienes una factura pendiente por tu servicio de internet (Factura ${inv.month}/${inv.year}).`);
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
    doc.text("COMPROBANTE DE PAGO ELECTRÓNICO", 14, 52);
    
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
    doc.text(`Factura N°: F-${inv.year}-${String(inv.month).padStart(2, '0')}-${inv.id}`, 110, 68);
    doc.text(`Período de Servicio: ${String(inv.month).padStart(2, '0')}/${inv.year}`, 110, 74);
    const paidDate = inv.payments && inv.payments.length > 0 ? new Date(inv.payments[0].paymentDate).toLocaleDateString('es-AR') : new Date().toLocaleDateString('es-AR');
    doc.text(`Fecha de Pago: ${paidDate}`, 110, 80);
    doc.text(`Estado: ${inv.status === 'PAID' ? 'CANCELADA (PAGO TOTAL)' : 'PAGO PARCIAL A CUENTA'}`, 110, 86);

    // Tabla de Conceptos
    const originalAmountRounded = inv.originalAmount ? inv.originalAmount.toFixed(2) : '0.00';
    const amountPaid = inv.payments && inv.payments.length > 0 ? inv.payments.reduce((acc, p) => acc + p.amountPaid, 0) : inv.totalAmount;
    
    try {
      autoTable(doc, {
        startY: 100,
        head: [['Descripción', 'Período', 'Importe Original', 'Total Abonado']],
        body: [
          [
            `Abono de Internet (${inv.client?.plan?.name || 'Plan Base'})`,
            `${String(inv.month).padStart(2, '0')}/${inv.year}`,
            `$ ${originalAmountRounded}`,
            `$ ${amountPaid.toFixed(2)}`
          ]
        ],
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
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("¡Gracias por confiar en TKIP ISP!", 14, finalY + 16);
      
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

  const filteredInvoices = invoices.filter(inv => {
    // 1. Period Filter (hide paid invoices older than previous month)
    if (periodFilter === 'RECENT' && inv.status === 'PAID') {
       const today = new Date();
       const m1 = today.getMonth() + 1;
       const y1 = today.getFullYear();
       
       const prevDate = new Date(y1, m1 - 2, 1);
       const m2 = prevDate.getMonth() + 1;
       const y2 = prevDate.getFullYear();

       const isCurrent = inv.month === m1 && inv.year === y1;
       const isPrevious = inv.month === m2 && inv.year === y2;
       
       if (!isCurrent && !isPrevious) return false;
    }

    // 2. Payment Method Filter
    if (paymentFilter === 'ALL') return true;
    if (paymentFilter === 'CASH') return inv.payments && inv.payments.some(p => p.method === 'CASH');
    if (paymentFilter === 'MERCADOPAGO') return inv.payments && inv.payments.some(p => p.method === 'MERCADOPAGO');
    return true;
  });

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allSelectableIds = filteredInvoices.filter(inv => inv.status === 'PENDING' || (inv.status === 'PAID' && !inv.afipCae)).map(inv => inv.id);
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
      <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <FileText className="text-blue-600" size={32} />
            Facturación Mensual
          </h2>
          <div className="mt-2 flex items-center gap-3">
            <p className="text-slate-500 text-sm">Filtros:</p>
            <select 
              value={periodFilter} onChange={e=>setPeriodFilter(e.target.value)}
              className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none p-1"
            >
              <option value="RECENT">📅 Mes Actual y Anterior</option>
              <option value="ALL">📅 Historial Completo</option>
            </select>
            <select 
              value={paymentFilter} onChange={e=>setPaymentFilter(e.target.value)}
              className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none p-1"
            >
              <option value="ALL">Todas las Facturas</option>
              <option value="CASH">💰 Solo Punto de Venta (Efectivo)</option>
              <option value="MERCADOPAGO">💳 Solo MercadoPago / Web</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          {selectedInvoices.length > 0 && (
            <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
              <button 
                onClick={handleMassAfip} disabled={loading}
                className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2.5 rounded-lg font-bold shadow-sm transition-colors flex items-center gap-2 text-sm"
              >
                <Landmark size={18} />
                Lote AFIP ({selectedInvoices.length})
              </button>
              <button 
                onClick={() => startMassiveNotify(true)} disabled={loading}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg font-bold shadow-sm transition-colors flex items-center gap-2 text-sm"
              >
                <MessageCircle size={18} />
                WhatsApp ({selectedInvoices.length})
              </button>
            </div>
          )}
          <button 
            onClick={() => startMassiveNotify(false)} disabled={loading}
            className="bg-green-500 hover:bg-green-600 text-white px-5 py-3 rounded-xl font-medium shadow-sm transition-colors flex items-center gap-2 disabled:bg-green-400"
          >
            <MessageCircle size={18} />
            {loading ? 'Trabajando...' : 'Notificar Todos'}
          </button>
          <button 
            onClick={handleGenerate} disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-medium shadow-sm shadow-indigo-200 transition-colors flex items-center gap-2 disabled:bg-indigo-400 ml-4"
          >
            <Play size={18} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Procesando...' : 'Generar Facturación'}
          </button>
        </div>
      </header>

      {/* Tabla de Facturas */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                <th className="px-6 py-4 font-semibold text-center w-12">
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll}
                    checked={isAllSelected}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4 font-semibold">Cliente</th>
                <th className="px-6 py-4 font-semibold text-center">Período</th>
                <th className="px-6 py-4 font-semibold text-center">Vencimiento</th>
                <th className="px-6 py-4 font-semibold text-right">Original</th>
                <th className="px-6 py-4 font-semibold text-right text-orange-500">Mora</th>
                <th className="px-6 py-4 font-semibold text-right text-blue-600">Total a Pagar</th>
                <th className="px-6 py-4 font-semibold text-center">Estado</th>
                <th className="px-6 py-4 font-semibold text-center">Acciones</th>
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
                filteredInvoices.map(inv => {
                  const isPaid = inv.status === 'PAID';
                  const isSelectable = !isPaid || (isPaid && !inv.afipCae);
                  return (
                    <tr key={inv.id} className={`transition-colors ${isPaid ? 'bg-slate-50/50' : 'hover:bg-slate-50'}`}>
                      <td className="px-6 py-4 text-center">
                        {isSelectable && (
                          <input 
                            type="checkbox" 
                            onChange={() => handleSelectOne(inv.id)}
                            checked={selectedInvoices.includes(inv.id)}
                            className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer mt-1"
                          />
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{inv.client?.name || 'Cliente borrado'}</div>
                        <div className="text-xs text-blue-600 font-bold uppercase tracking-wider">
                          TK{String(inv.clientId).padStart(3, '0')}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-medium text-slate-600">
                        {String(inv.month).padStart(2, '0')}/{inv.year}
                      </td>
                      <td className="px-6 py-4 text-center text-slate-600">
                        {new Date(inv.dueDate).toLocaleDateString('es-AR')}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-600">
                        ${inv.originalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {inv.calculatedLateFee > 0 ? (
                          <span className="text-orange-500 font-bold inline-flex items-center gap-1">
                            <AlertCircle size={14} /> +${inv.calculatedLateFee.toLocaleString(undefined, {minimumFractionDigits: 2})}
                          </span>
                        ) : (
                          <span className="text-slate-300">---</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-bold ${isPaid ? 'text-slate-500 line-through' : 'text-slate-900 text-base'}`}>
                          ${inv.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                            <CheckCircle size={14} /> PAGADO
                          </span>
                        ) : inv.status === 'PARTIAL' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                            <CheckCircle size={14} /> PARCIAL
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                            <Clock size={14} /> PENDIENTE
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {inv.status !== 'PAID' && (
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => handlePayClick(inv)} 
                              className="text-emerald-600 hover:text-emerald-700 transition-colors p-2 rounded-lg hover:bg-emerald-50 font-medium text-xs border border-emerald-200 bg-white"
                              title="Recibir Dinero"
                            >
                              Cobrar
                            </button>
                            <button 
                              onClick={() => manualWhatsApp(inv)} 
                              className="text-green-500 hover:text-green-700 transition-colors p-2 rounded-lg hover:bg-green-50 bg-white border border-green-200" 
                              title="Mensaje Normal WhatsApp"
                            >
                              <MessageCircle size={16} />
                            </button>
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
