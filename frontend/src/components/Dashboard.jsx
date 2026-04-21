import { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, Users, AlertCircle, DollarSign } from 'lucide-react';
import WhatsAppStatus from './WhatsAppStatus';

export default function Dashboard() {
  const [data, setData] = useState({
    activeClients: 0,
    pendingTotal: 0,
    pendingInvoicesCount: 0
  });

  useEffect(() => {
    // In a real scenario, handle errors and loading state.
    axios.get('https://interfast-backend-95ww.onrender.com/api/dashboard')
      .then(res => setData(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard 360</h2>
        <p className="text-slate-500 mt-1">Resumen financiero y operativo de la red.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-medium text-slate-500">Clientes Activos</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-2">{data.activeClients}</h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
            <Users size={24} />
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-medium text-slate-500">Deuda Pendiente (Mes actual)</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-2">${data.pendingTotal.toLocaleString()}</h3>
          </div>
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
            <DollarSign size={24} />
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-medium text-slate-500">Facturas Vencidas</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-2">{data.pendingInvoicesCount}</h3>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center">
            <AlertCircle size={24} />
          </div>
        </div>
      </div>
      
      {/* WhatsApp Robot Dashboard */}
      <div className="mt-8">
        <WhatsAppStatus />
      </div>

      {/* Próximos Vencimientos Section */}
      <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-xl font-semibold mb-4 text-slate-800">Alertas de Suspensión</h3>
        <div className="flex items-center justify-center py-12 text-slate-400">
          <div className="text-center">
            <Activity size={48} className="mx-auto mb-3 opacity-50" />
            <p>La integración con RADIUS aún no está activa.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
