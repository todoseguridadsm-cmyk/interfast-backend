import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, CheckCircle, AlertTriangle } from 'lucide-react';

export default function UnidentifiedPaymentsList() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assignModal, setAssignModal] = useState({ show: false, payment: null, invoiceId: '' });

  const fetchPayments = async () => {
    try {
      const res = await axios.get('https://interfast-backend-95ww.onrender.com/api/unidentified-payments');
      setPayments(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!assignModal.invoiceId) return alert('Debes ingresar el ID de la factura (solo el número, ej: 1234)');
    setLoading(true);
    try {
      await axios.post(`https://interfast-backend-95ww.onrender.com/api/unidentified-payments/${assignModal.payment.id}/assign`, {
        invoiceId: parseInt(assignModal.invoiceId)
      });
      alert('Pago asignado exitosamente.');
      setAssignModal({ show: false, payment: null, invoiceId: '' });
      fetchPayments();
    } catch (error) {
      console.error(error);
      alert('Error al asignar el pago: ' + (error.response?.data?.error || error.message));
    }
    setLoading(false);
  };

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
                        onClick={() => setAssignModal({ show: true, payment: p, invoiceId: '' })}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-colors"
                      >
                        Asignar a Factura
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
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-slate-50 p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">Asignar Pago Manualmente</h3>
              <p className="text-sm text-slate-500 mt-1">Ingresa el ID de la factura (Nro) a la que corresponde este pago de <b>${assignModal.payment.amount}</b>.</p>
            </div>
            <form onSubmit={handleAssign} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">ID de Factura</label>
                <input 
                  type="number" 
                  required
                  value={assignModal.invoiceId} 
                  onChange={e => setAssignModal({...assignModal, invoiceId: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xl font-bold rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-center"
                  placeholder="Ej: 4521"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setAssignModal({show:false, payment:null, invoiceId:''})} className="flex-1 bg-white border border-slate-200 text-slate-600 px-4 py-3 rounded-xl font-bold hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-xl font-bold shadow-md shadow-indigo-200 transition-colors">
                  {loading ? 'Asignando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
