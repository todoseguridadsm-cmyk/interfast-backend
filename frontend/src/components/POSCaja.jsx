import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Store, AlertCircle, CreditCard, User, Building, MapPin, Target, CheckCircle, Download } from 'lucide-react';
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

  // Initial Fetch to have clients & invoices array cached
  const fetchData = async () => {
    try {
      const [cliRes, invRes] = await Promise.all([
        axios.get('https://interfast-backend-95ww.onrender.com/api/clients'),
        axios.get('https://interfast-backend-95ww.onrender.com/api/invoices')
      ]);
      setClients(cliRes.data);
      setInvoices(invRes.data);
      
      // Update selected client if any
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
    // Find unpaid invoices for this client
    const pending = invoices.filter(i => i.clientId === client.id && i.status !== 'PAID');
    setClientInvoices(pending);
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
      // Payment success!
      setPayModal({ show: false, inv: null, amount: '' });
      await fetchData(); // Refresh data to clear paid invoices
      
      // Receipt Prompt
      if (window.confirm("¡Cobro en Efectivo Registrado con Éxito!\n\n¿Deseas imprimir el comprobante de pago ahora?")) {
        generatePDF(payModal.inv, parseFloat(payModal.amount), selectedClient);
      }
      
    } catch (error) {
      console.error(error);
      alert('Error registrando cobro automático.');
    }
    setLoading(false);
  };

  const generatePDF = (inv, amountPaid, activeClient) => {
    const doc = new jsPDF();
    doc.setFont("helvetica");
    
    // Header
    doc.setFontSize(24);
    doc.setTextColor(37, 99, 235); // Blue 600
    doc.text("tkip.net - Servicios de Red", 14, 24);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Gestión de Servicios de Internet", 14, 30);
    doc.text(`Fecha y Hora de Emisión: ${new Date().toLocaleString('es-AR')}`, 14, 36);
    
    // Separator line
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(14, 42, 196, 42);

    // Title
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont("helvetica", "bold");
    doc.text("COMPROBANTE DE PAGO EN CAJA", 14, 52);
    
    // Client Info
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Datos del Cliente:", 14, 62);
    
    doc.setTextColor(15, 23, 42);
    doc.text(`Identificador: TK${String(activeClient.id).padStart(3, '0')}`, 14, 68);
    doc.text(`Nombre/Razón Social: ${activeClient.name}`, 14, 74);
    doc.text(`DNI / CUIT: ${activeClient.cuit || activeClient.dni || '---'}`, 14, 80);
    doc.text(`Condición IVA: ${activeClient.taxCondition || 'Consumidor Final'}`, 14, 86);

    // Invoice Info
    doc.text(`Factura N°: F-${inv.year}-${String(inv.month).padStart(2, '0')}-${inv.id}`, 110, 68);
    doc.text(`Período de Servicio: ${String(inv.month).padStart(2, '0')}/${inv.year}`, 110, 74);
    
    const userString = localStorage.getItem('user');
    const userObj = userString ? JSON.parse(userString) : { username: 'Admin' };
    doc.text(`Operador / Cajero: ${userObj.username.toUpperCase()}`, 110, 80);
    
    const finalStatus = amountPaid >= inv.totalAmount ? 'PAGO TOTAL CONTADO' : 'PAGO PARCIAL A CUENTA';
    doc.text(`Medio de Pago: EFECTIVO (${finalStatus})`, 110, 86);

    // Items
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

      // Footer
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.setFont("helvetica", "italic");
      doc.text("Este documento certifica la recepción de dinero en nuestra sucursal comercial.", 14, finalY);
      doc.text("Para facturación AFIP, podrá descargarla en el portal.", 14, finalY + 6);
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("¡Gracias por su visita!", 14, finalY + 16);
      
      // Save
      const safeClientName = activeClient.name.replace(/[^a-z0-9]/gi, '_');
      const today = new Date();
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
               c.dni.includes(term) || 
               clientNum.includes(term);
      })
    : [];

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Store className="text-emerald-600" size={32} />
            Terminal de Cobro (Caja Física)
          </h2>
          <p className="text-slate-500 mt-1 ml-11">Busque al cliente que asiste al local para cobrar e imprimir su recibo.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Panel: Search */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <label className="block text-sm font-bold text-slate-800 mb-3 uppercase tracking-wide text-xs">Identificar Cliente</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                autoFocus
                placeholder="N°, DNI o Nombre..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-base font-medium text-slate-800"
              />
            </div>
            {searchTerm.length <= 2 && searchTerm.length > 0 && (
              <p className="text-xs text-slate-400 mt-3 text-center">Escriba al menos 3 caracteres...</p>
            )}

            {filteredClients.length > 0 && (
              <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {filteredClients.slice(0, 5).map(client => (
                  <button 
                    key={client.id}
                    onClick={() => handleSelectClient(client)}
                    className="w-full flex items-center justify-between p-4 bg-white hover:bg-emerald-50 transition-colors text-left"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{client.name}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">DNI: {client.dni} • TK{String(client.id).padStart(3, '0')}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {filteredClients.length === 0 && searchTerm.length > 2 && (
              <div className="mt-4 p-4 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                No se encontraron clientes asociados.
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Active POS */}
        <div className="lg:col-span-8">
          {!selectedClient ? (
            <div className="bg-slate-100 border-2 border-dashed border-slate-200 rounded-3xl h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <Store size={64} className="mb-4 opacity-20" />
              <h3 className="text-xl font-bold text-slate-500 mb-2">Caja Lista para Operar</h3>
              <p>Busca e identifica a una persona en el panel izquierdo para visualizar su cuenta corriente.</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
              
              {/* Header Info */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 flex justify-between items-center text-white">
                <div>
                  <h3 className="text-3xl font-black">{selectedClient.name}</h3>
                  <div className="flex gap-4 mt-3 text-slate-300 text-sm font-medium">
                    <span className="flex items-center gap-1.5"><User size={16} /> DNI: {selectedClient.dni}</span>
                    <span className="flex items-center gap-1.5"><Target size={16} /> TK{String(selectedClient.id).padStart(3, '0')}</span>
                    {selectedClient.cuit && <span className="flex items-center gap-1.5"><Building size={16} /> {selectedClient.taxCondition}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${selectedClient.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    <CheckCircle size={14} /> {selectedClient.status}
                  </span>
                </div>
              </div>

              <div className="p-8">
                <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <CreditCard size={20} className="text-emerald-600" />
                  Facturas Pendientes de Cobro
                </h4>

                {clientInvoices.length === 0 ? (
                  <div className="bg-emerald-50 text-emerald-700 p-6 rounded-2xl flex flex-col items-center justify-center border border-emerald-100">
                    <CheckCircle size={48} className="mb-3 opacity-50" />
                    <p className="text-lg font-bold">¡Cuenta al Día!</p>
                    <p className="text-sm mt-1 opacity-80">El cliente no posee deuda pendiente.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {clientInvoices.map(inv => (
                      <div key={inv.id} className="bg-white border-2 border-slate-100 rounded-2xl p-6 flex items-center shadow-sm hover:border-emerald-300 transition-colors group">
                        <div className="flex-1">
                          <div className="font-bold text-slate-900 text-lg flex items-center gap-2">
                            Abono Mensual - {String(inv.month).padStart(2,'0')}/{inv.year}
                            {inv.isLate && (
                              <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1 border border-orange-200">
                                <AlertCircle size={12}/> VENCIDA O MORA
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-slate-500 mt-1">Vencimiento: {new Date(inv.dueDate).toLocaleDateString('es-AR')}</div>
                        </div>
                        
                        <div className="text-right mr-6">
                           <div className="text-2xl font-black text-slate-900">${inv.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                           {inv.calculatedLateFee > 0 && <div className="text-xs text-orange-600 font-bold">Incluye recargo de: ${inv.calculatedLateFee.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>}
                        </div>
                        
                        <button 
                          onClick={() => handlePayClick(inv)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-4 rounded-xl shadow-lg shadow-emerald-200 transition-transform active:scale-95 flex items-center gap-2"
                        >
                          💸 Cobrar
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

      {payModal.show && payModal.inv && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 p-8 text-white relative">
              <div className="absolute top-0 right-0 p-4 opacity-20"><CreditCard size={80}/></div>
              <h3 className="text-2xl font-black">Caja - Recibir Efectivo</h3>
              <p className="text-emerald-100 mt-1 font-medium text-sm">Ingrese el importe físico entregado.</p>
            </div>
            <form onSubmit={submitPayment} className="p-8 space-y-6">
              
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex justify-between items-center">
                <span className="font-bold text-slate-600 uppercase text-xs tracking-wider">Total Requerido:</span>
                <span className="font-black text-2xl text-slate-900">${payModal.inv.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tight text-center">BILLETES RECIBIDOS AL MOSTRADOR</label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400">$</span>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    autoFocus
                    value={payModal.amount} 
                    onChange={e => setPayModal({...payModal, amount: e.target.value})}
                    className="w-full bg-white border-2 border-slate-200 text-slate-900 text-4xl font-black rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all text-center"
                  />
                </div>
                {parseFloat(payModal.amount) < payModal.inv.totalAmount && (
                  <p className="text-orange-600 text-sm font-bold mt-4 flex items-center justify-center gap-1 bg-orange-50 border border-orange-200 py-3 rounded-xl">
                    <AlertCircle size={18}/> Saldo a Favor. La factura será PARCIAL.
                  </p>
                )}
                {parseFloat(payModal.amount) > payModal.inv.totalAmount && (
                  <p className="text-blue-600 text-sm font-bold mt-4 flex items-center justify-center gap-1 bg-blue-50 border border-blue-200 py-3 rounded-xl">
                    <CheckCircle size={18}/> Dar vuelto de: ${(parseFloat(payModal.amount) - payModal.inv.totalAmount).toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </p>
                )}
              </div>
              
              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setPayModal({show:false, inv:null, amount:''})} className="flex-1 bg-slate-100 border-2 border-transparent text-slate-500 px-4 py-4 rounded-2xl font-black hover:bg-slate-200 transition-colors uppercase text-sm">
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-500 border-2 border-emerald-600 text-white px-4 py-4 rounded-2xl font-black shadow-xl shadow-emerald-600/20 transition-all uppercase text-sm disabled:opacity-70 active:scale-95">
                  {loading ? 'Impactando...' : 'Confirmar Cobro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
