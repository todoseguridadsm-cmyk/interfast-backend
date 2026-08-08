import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, CheckCircle, AlertTriangle, User, FileText } from 'lucide-react';

export default function UnidentifiedPaymentsList() {
  const [payments, setPayments] = useState([]);
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [assignModal, setAssignModal] = useState({ show: false, payment: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');

  const fetchData = async () => {
    try {
      const [payRes, cliRes, invRes] = await Promise.all([
        axios.get('https://interfast-backend-95ww.onrender.com/api/unidentified-payments'),
        axios.get('https://interfast-backend-95ww.onrender.com/api/clients'),
        axios.get('https://interfast-backend-95ww.onrender.com/api/invoices')
      ]);
      setPayments(payRes.data);
      setClients(cliRes.data);
      setInvoices(invRes.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchPayments = async () => {
    try {
      const res = await axios.get('https://interfast-backend-95ww.onrender.com/api/unidentified-payments');
      setPayments(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedInvoiceId) return alert('Debes seleccionar una factura');
    setLoading(true);
    try {
      await axios.post(`https://interfast-backend-95ww.onrender.com/api/unidentified-payments/${assignModal.payment.id}/assign`, {
        invoiceId: parseInt(selectedInvoiceId)
      });
      alert('Pago asignado exitosamente.');
      setAssignModal({ show: false, payment: null });
      setSearchTerm('');
      setSelectedClient(null);
      setSelectedInvoiceId('');
      fetchPayments();
    } catch (error) {
      console.error(error);
      alert('Error al asignar el pago: ' + (error.response?.data?.error || error.message));
    }
    setLoading(false);
  };

  const openModal = (payment) => {
    setAssignModal({ show: true, payment });
    setSearchTerm(payment.payerName || '');
    setSelectedClient(null);
    setSelectedInvoiceId('');
  };

  const closeModal = () => {
    setAssignModal({ show: false, payment: null });
    setSearchTerm('');
    setSelectedClient(null);
    setSelectedInvoiceId('');
  };

  const filteredClients = searchTerm.length > 2 
    ? clients.filter(c => {
        const term = searchTerm.toLowerCase();
        return c.name.toLowerCase().includes(term) || c.dni.includes(term);
      })
    : [];

  const clientInvoices = selectedClient 
    ? invoices.filter(i => i.clientId === selectedClient.id && i.status !== 'PAID')
    : [];

  return (
    <div className="space-y-6 relative">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <AlertTriangle className="text-orange-500" size={32} />
            Pagos No Identificados
          </h2>
          <p className="text-sm text-slate-500 mt-1">Estos pagos ingresaron por MercadoPago pero el sistema no pudo asociarlos automáticamente a un cliente.</p>
        </div>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                <th className="px-6 py-4 font-semibold text-center">Fecha</th>
                <th className="px-6 py-4 font-semibold">Pagador MP (Nombre / DNI / Email)</th>
                <th className="px-6 py-4 font-semibold text-right">Monto</th>
                <th className="px-6 py-4 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-16 text-center text-slate-400">
                    <CheckCircle className="mx-auto mb-3 opacity-20" size={48} />
                    <p className="text-lg font-medium text-slate-500">Todo en orden. No hay pagos huérfanos.</p>
                  </td>
                </tr>
              ) : (
                payments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-center text-slate-600">
                      {new Date(p.date).toLocaleString('es-AR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{p.payerName || 'Desconocido'}</div>
                      <div className="text-xs text-slate-500">DNI: {p.payerDni || '---'} | Email: {p.payerEmail || '---'}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-600">
                      ${p.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => openModal(p)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-colors"
                      >
                        Asignar a Cliente
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {assignModal.show && assignModal.payment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-slate-50 p-6 border-b border-slate-100 shrink-0">
              <h3 className="text-xl font-bold text-slate-800">Asignar Pago Manualmente</h3>
              <p className="text-sm text-slate-500 mt-1">
                Pago de <b>${assignModal.payment.amount}</b> a nombre de <b>{assignModal.payment.payerName || 'Desconocido'}</b>.
              </p>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              {!selectedClient ? (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">1. Buscar Cliente</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                      type="text" 
                      autoFocus
                      placeholder="Buscar por Nombre o DNI..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800"
                    />
                  </div>
                  
                  {filteredClients.length > 0 && (
                    <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                      {filteredClients.slice(0, 5).map(client => (
                        <button 
                          key={client.id}
                          onClick={() => setSelectedClient(client)}
                          className="w-full flex items-center justify-between p-4 bg-white hover:bg-indigo-50 transition-colors text-left"
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
                      No se encontraron clientes que coincidan.
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                    <div>
                      <div className="font-bold text-indigo-900 flex items-center gap-2">
                        <User size={18} /> {selectedClient.name}
                      </div>
                      <div className="text-sm text-indigo-700 mt-1">DNI: {selectedClient.dni}</div>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedClient(null);
                        setSelectedInvoiceId('');
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline"
                    >
                      Cambiar
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">2. Seleccionar Factura</label>
                    {clientInvoices.length === 0 ? (
                      <div className="p-4 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                        El cliente no tiene facturas pendientes.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {clientInvoices.map(inv => (
                          <label 
                            key={inv.id}
                            className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                              selectedInvoiceId === inv.id 
                                ? 'border-indigo-600 bg-indigo-50/50' 
                                : 'border-slate-200 hover:border-indigo-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input 
                                type="radio" 
                                name="invoice" 
                                value={inv.id}
                                checked={selectedInvoiceId === inv.id}
                                onChange={() => setSelectedInvoiceId(inv.id)}
                                className="w-5 h-5 text-indigo-600"
                              />
                              <div>
                                <div className="font-bold text-slate-900 flex items-center gap-2">
                                  <FileText size={16} className="text-slate-400" />
                                  Abono Mensual {String(inv.month).padStart(2,'0')}/{inv.year}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5">Vto: {new Date(inv.dueDate).toLocaleDateString('es-AR')}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-black text-slate-900">${inv.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
              <button type="button" onClick={closeModal} className="flex-1 bg-white border border-slate-200 text-slate-600 px-4 py-3 rounded-xl font-bold hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={handleAssign}
                disabled={loading || !selectedInvoiceId} 
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-xl font-bold shadow-md shadow-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Asignando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
