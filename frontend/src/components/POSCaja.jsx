import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Store, AlertCircle, CreditCard, User, Building, MapPin, Target, CheckCircle, Download, DollarSign, Wallet, ShieldCheck, Sparkles, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function POSCaja() {
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientInvoices, setClientInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [payModal, setPayModal] = useState({ show: false, inv: null, amount: '' });

  const getLoggedInOperator = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        const un = (user.username || '').toUpperCase();
        if (un === 'TKIP' || un.includes('MATIAS') || un.includes('MATÍAS')) return 'MATIAS';
        if (un.includes('VICTOR') || un.includes('VÍCTOR')) return 'VICTOR';
        if (un.includes('HUMBERTO')) return 'HUMBERTO';
      } catch (e) {}
    }
    return 'HUMBERTO';
  };

  const [operator, setOperator] = useState(getLoggedInOperator);

  const fetchData = async () => {
    try {
      const [cliRes, invRes] = await Promise.all([
        axios.get('https://interfast-backend-95ww.onrender.com/api/clients'),
        axios.get('https://interfast-backend-95ww.onrender.com/api/invoices')
      ]);
      setClients(cliRes.data);
      setInvoices(invRes.data);
      
      if (selectedClient) {
        const matchingClient = cliRes.data.find(c => c.id === selectedClient.id);
        const matchingInvoices = invRes.data.filter(i => i.clientId === selectedClient.id && i.status !== 'PAID');
        if (matchingClient) setSelectedClient(matchingClient);
        setClientInvoices(matchingInvoices);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    const pending = invoices.filter(i => i.clientId === client.id && i.status !== 'PAID');
    setClientInvoices(pending);
  };

  const [paymentChannel, setPaymentChannel] = useState('EFECTIVO');

  const handlePayClick = (inv) => {
    setOperator(getLoggedInOperator());
    setPaymentChannel('EFECTIVO');
    setPayModal({ show: true, inv, amount: inv.totalAmount });
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const methodStr = paymentChannel === 'BANCO_ROELA' 
        ? 'BANCO_ROELA' 
        : paymentChannel === 'MERCADOPAGO' 
        ? 'MERCADOPAGO' 
        : 'CASH_' + operator;

      await axios.put(`https://interfast-backend-95ww.onrender.com/api/invoices/${payModal.inv.id}/pay`, {
        amountPaid: parseFloat(payModal.amount) || 0,
        lateFeeApplied: parseFloat(payModal.inv.calculatedLateFee) || 0,
        totalRequired: parseFloat(payModal.inv.totalAmount) || parseFloat(payModal.amount) || 0,
        method: methodStr
      });

      setPayModal({ show: false, inv: null, amount: '' });
      await fetchData();
      
      const channelLabel = paymentChannel === 'MERCADOPAGO' ? 'MercadoPago' : paymentChannel === 'BANCO_ROELA' ? 'Banco Roela' : 'Efectivo';
      if (window.confirm(`¡Cobro por ${channelLabel} Registrado con Éxito!\n\n¿Deseas imprimir el comprobante de pago ahora?`)) {
        generatePDF(payModal.inv, parseFloat(payModal.amount), selectedClient, paymentChannel);
      }
      
    } catch (error) {
      console.error(error);
      alert('Error registrando cobro.');
    }
    setLoading(false);
  };

  const generatePDF = (inv, amountPaid, activeClient, channel = 'EFECTIVO') => {
    const doc = new jsPDF();
    doc.setFont("helvetica");
    
    doc.setFontSize(24);
    doc.setTextColor(37, 99, 235);
    doc.text("tkip.net - Servicios de Red", 14, 24);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Gestión de Servicios de Internet", 14, 30);
    doc.text(`Fecha y Hora de Emisión: ${new Date().toLocaleString('es-AR')}`, 14, 36);
    
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 42, 196, 42);

    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text("COMPROBANTE DE PAGO EN CAJA", 14, 52);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Datos del Cliente:", 14, 62);
    
    doc.setTextColor(15, 23, 42);
    doc.text(`Identificador: TK${String(activeClient.id).padStart(3, '0')}`, 14, 68);
    doc.text(`Nombre/Razón Social: ${activeClient.name}`, 14, 74);
    doc.text(`DNI / CUIT: ${activeClient.cuit || activeClient.dni || '---'}`, 14, 80);
    doc.text(`Condición IVA: ${activeClient.taxCondition || 'Consumidor Final'}`, 14, 86);

    doc.text(`Factura N°: F-${inv.year}-${String(inv.month).padStart(2, '0')}-${inv.id}`, 110, 68);
    doc.text(`Período de Servicio: ${String(inv.month).padStart(2, '0')}/${inv.year}`, 110, 74);
    
    const userString = localStorage.getItem('user');
    const userObj = userString ? JSON.parse(userString) : { username: 'Admin' };
    doc.text(`Operador / Cajero: ${userObj.username.toUpperCase()}`, 110, 80);
    
    const channelLabel = channel === 'MERCADOPAGO' ? 'MERCADOPAGO' : channel === 'BANCO_ROELA' ? 'BANCO ROELA' : 'EFECTIVO';
    const finalStatus = amountPaid >= inv.totalAmount ? 'PAGO TOTAL CONTADO' : 'PAGO PARCIAL A CUENTA';
    doc.text(`Medio de Pago: ${channelLabel} (${finalStatus})`, 110, 86);

    const originalAmountRounded = inv.originalAmount ? inv.originalAmount.toFixed(2) : '0.00';
    try {
      autoTable(doc, {
        startY: 100,
        head: [['Concepto', 'Período', 'Importe Original', 'Total Pagado']],
        body: [
          [
            `Abono Mensual. Plan: ${activeClient.plan?.name || ''}`,
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

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.setFont("helvetica", "italic");
      doc.text("Este documento certifica la recepción de dinero en nuestra sucursal comercial.", 14, finalY);
      doc.text("Para facturación AFIP, podrá descargarla en el portal.", 14, finalY + 6);
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("¡Gracias por su visita!", 14, finalY + 16);
      
      const safeClientName = activeClient.name.replace(/[^a-z0-9]/gi, '_');
      doc.save(`Ticket_Caja_${safeClientName}_F${inv.id}.pdf`);
    } catch(err) {
      console.error(err);
      alert('Error interno generando el PDF.');
    }
  };

  const filteredClients = searchTerm.length > 2 
    ? clients.filter(c => {
        const term = searchTerm.toLowerCase();
        const clientNum = `tk${String(c.id).padStart(3, '0')}`;
        return c.name.toLowerCase().includes(term) || 
               (c.dni && c.dni.includes(term)) || 
               clientNum.includes(term);
      })
    : [];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* Cyber Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#050b18] via-[#091e1d] to-[#040814] border border-emerald-500/30 p-6 md:p-8 shadow-[0_0_35px_rgba(16,185,129,0.15)]">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="relative p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <Store size={36} className="drop-shadow-[0_0_8px_#10b981]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-semibold tracking-wider uppercase">
                  POS TERMINAL // CASH OPS
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-wide mt-1">
                Terminal de <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Cobro (Caja Física)</span>
              </h1>
              <p className="text-slate-400 text-xs md:text-sm mt-1 max-w-xl">
                Busque al cliente que asiste al local para cobrar, emitir recibo e impactar en tiempo real.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2.5 rounded-xl bg-slate-900/80 border border-emerald-500/30 text-right font-mono">
              <div className="text-[10px] text-slate-400 uppercase">Operador Activo</div>
              <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 justify-end">
                <ShieldCheck size={12} className="text-emerald-400" />
                {operator}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Panel: Search */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl bg-gradient-to-b from-[#070e1e] to-[#040812] border border-slate-800 p-6 shadow-xl">
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-3 font-bold">
              Identificar Cliente en Mostrador
            </label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                autoFocus
                placeholder="N°, DNI o Nombre..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all"
              />
            </div>
            {searchTerm.length <= 2 && searchTerm.length > 0 && (
              <p className="text-[11px] font-mono text-slate-500 mt-2 text-center">Escriba al menos 3 caracteres...</p>
            )}

            {filteredClients.length > 0 && (
              <div className="mt-4 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/80 max-h-80 overflow-y-auto no-scrollbar">
                {filteredClients.slice(0, 6).map(client => (
                  <button 
                    key={client.id}
                    onClick={() => handleSelectClient(client)}
                    className="w-full flex items-center justify-between p-3.5 bg-slate-950/40 hover:bg-emerald-950/40 transition-colors text-left group"
                  >
                    <div>
                      <div className="font-bold text-slate-200 group-hover:text-emerald-300 transition-colors text-sm">{client.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">DNI: {client.dni} • TK{String(client.id).padStart(3, '0')}</div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 group-hover:text-emerald-400 group-hover:border-emerald-500/40">
                      Seleccionar →
                    </span>
                  </button>
                ))}
              </div>
            )}
            {filteredClients.length === 0 && searchTerm.length > 2 && (
              <div className="mt-4 p-4 text-center text-slate-500 text-xs font-mono border border-dashed border-slate-800 rounded-xl">
                No se encontraron clientes asociados.
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Active POS */}
        <div className="lg:col-span-8">
          {!selectedClient ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-800 bg-[#070e1e]/40 h-full min-h-[400px] flex flex-col items-center justify-center text-slate-500 p-8 text-center">
              <Store size={56} className="mb-3 opacity-20 text-emerald-400" />
              <h3 className="text-lg font-bold text-slate-300 mb-1">Terminal Lista para Operar</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Busca e identifica al cliente en el panel izquierdo para visualizar sus facturas pendientes y cobrar.
              </p>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-800 bg-gradient-to-b from-[#070e1e] to-[#040812] shadow-2xl overflow-hidden animate-fadeIn">
              
              {/* Header Info */}
              <div className="bg-gradient-to-r from-slate-950 via-[#0a1829] to-slate-950 p-6 border-b border-slate-800 flex justify-between items-center text-white">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-bold">
                      TK{String(selectedClient.id).padStart(3, '0')}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-white mt-1">{selectedClient.name}</h3>
                  <div className="flex flex-wrap gap-4 mt-2 text-slate-400 text-xs font-mono">
                    <span className="flex items-center gap-1"><User size={13} /> DNI: {selectedClient.dni}</span>
                    {selectedClient.cuit && <span className="flex items-center gap-1"><Building size={13} /> {selectedClient.taxCondition}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
                    selectedClient.status === 'ACTIVE' 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}>
                    <CheckCircle size={12} /> {selectedClient.status}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <h4 className="text-sm font-mono uppercase tracking-wider font-bold text-slate-300 mb-4 flex items-center gap-2">
                  <CreditCard size={18} className="text-emerald-400" />
                  Facturas Pendientes de Cobro
                </h4>

                {clientInvoices.length === 0 ? (
                  <div className="bg-emerald-950/20 text-emerald-300 p-8 rounded-2xl flex flex-col items-center justify-center border border-emerald-500/30 text-center">
                    <CheckCircle size={44} className="mb-2 text-emerald-400 drop-shadow-[0_0_8px_#10b981]" />
                    <p className="text-base font-bold text-white">¡Cuenta al Día!</p>
                    <p className="text-xs text-slate-400 mt-1">El cliente no posee deuda pendiente de pago.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {clientInvoices.map(inv => (
                      <div key={inv.id} className="bg-slate-950/60 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-md group">
                        <div className="flex-1">
                          <div className="font-bold text-white text-base flex items-center gap-2">
                            Abono Mensual - {String(inv.month).padStart(2,'0')}/{inv.year}
                            {inv.isLate && (
                              <span className="bg-amber-500/20 text-amber-300 text-[10px] font-mono px-2 py-0.5 rounded border border-amber-500/30 font-bold inline-flex items-center gap-1">
                                <AlertCircle size={10}/> VENCIDA / MORA
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-mono text-slate-400 mt-1">
                            Vencimiento: {new Date(inv.dueDate).toLocaleDateString('es-AR')}
                          </div>
                        </div>
                        
                        <div className="sm:text-right">
                           <div className="text-2xl font-black text-emerald-300 font-mono">
                             ${inv.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                           </div>
                           {inv.calculatedLateFee > 0 && (
                             <div className="text-[11px] font-mono text-amber-400">
                               Incluye recargo: ${inv.calculatedLateFee.toLocaleString(undefined, {minimumFractionDigits: 2})}
                             </div>
                           )}
                        </div>
                        
                        <button 
                          onClick={() => handlePayClick(inv)}
                          className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold px-6 py-3 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2 text-sm hover:scale-105"
                        >
                          <DollarSign size={16} /> Cobrar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {payModal.show && payModal.inv && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-gradient-to-b from-[#081226] via-[#050b18] to-[#040814] border border-emerald-500/30 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full max-w-md overflow-hidden">
            
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <CreditCard size={22} />
                </div>
                <div>
                  <h3 className="font-black text-lg text-white">
                    {paymentChannel === 'MERCADOPAGO' ? 'Cobro MercadoPago' : paymentChannel === 'BANCO_ROELA' ? 'Cobro Banco Roela' : 'Recibir Efectivo'}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">Terminal POS Interfast</p>
                </div>
              </div>
              <button 
                onClick={() => setPayModal({show:false, inv:null, amount:''})} 
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitPayment} className="p-6 space-y-5">
              
              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 flex justify-between items-center">
                <span className="font-mono text-xs text-slate-400 uppercase">Total Requerido:</span>
                <span className="font-black text-2xl text-emerald-300 font-mono">
                  ${payModal.inv.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                </span>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-2">
                  Canal de Cobro
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    type="button" 
                    onClick={() => setPaymentChannel('EFECTIVO')}
                    className={`py-2.5 px-2 rounded-xl font-bold text-[11px] uppercase border transition-all ${
                      paymentChannel === 'EFECTIVO' 
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]' 
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    💵 Efectivo
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setPaymentChannel('MERCADOPAGO')}
                    className={`py-2.5 px-2 rounded-xl font-bold text-[11px] uppercase border transition-all ${
                      paymentChannel === 'MERCADOPAGO' 
                        ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.2)]' 
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    📱 MP
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setPaymentChannel('BANCO_ROELA')}
                    className={`py-2.5 px-2 rounded-xl font-bold text-[11px] uppercase border transition-all ${
                      paymentChannel === 'BANCO_ROELA' 
                        ? 'border-blue-500 bg-blue-500/20 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.2)]' 
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    🏦 Roela
                  </button>
                </div>
              </div>

              {paymentChannel === 'EFECTIVO' && (
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-2">
                    Operador que Cobra
                  </label>
                  <select 
                    value={operator}
                    onChange={(e) => setOperator(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white text-xs font-bold rounded-xl px-4 py-3 outline-none focus:border-emerald-400 cursor-pointer"
                  >
                    <option value="HUMBERTO">Humberto</option>
                    <option value="VICTOR">Víctor</option>
                    <option value="MATIAS">Matías</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-2 text-center">
                  {paymentChannel === 'EFECTIVO' ? 'Billetes Recibidos al Mostrador' : 'Monto Ingresado'}
                </label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-500">$</span>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    autoFocus
                    value={payModal.amount} 
                    onChange={e => setPayModal({...payModal, amount: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-700 text-emerald-300 text-3xl font-mono font-black rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:border-emerald-400 focus:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all text-center"
                  />
                </div>
                {parseFloat(payModal.amount) < payModal.inv.totalAmount && (
                  <p className="text-amber-300 text-xs font-mono mt-3 flex items-center justify-center gap-1 bg-amber-950/30 border border-amber-500/30 py-2 rounded-xl">
                    <AlertCircle size={14}/> Pago parcial a cuenta.
                  </p>
                )}
                {parseFloat(payModal.amount) > payModal.inv.totalAmount && paymentChannel === 'EFECTIVO' && (
                  <p className="text-cyan-300 text-xs font-mono mt-3 flex items-center justify-center gap-1 bg-cyan-950/30 border border-cyan-500/30 py-2 rounded-xl">
                    <CheckCircle size={14}/> Vuelto: ${(parseFloat(payModal.amount) - payModal.inv.totalAmount).toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </p>
                )}
              </div>
              
              <div className="pt-3 flex gap-3 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setPayModal({show:false, inv:null, amount:''})} 
                  className="flex-1 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white px-4 py-3 rounded-xl font-bold text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white px-4 py-3 rounded-xl font-bold text-xs shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-1.5"
                >
                  <CheckCircle size={15} />
                  <span>{loading ? 'Impactando...' : 'Confirmar Cobro'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}


