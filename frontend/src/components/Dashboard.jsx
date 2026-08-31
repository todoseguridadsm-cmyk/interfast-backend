import { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, Users, AlertCircle, DollarSign, ServerCrash, AlertOctagon, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [data, setData] = useState({
    activeClients: 0,
    suspendedClients: 0,
    monthlyIncome: 0,
    totalDebt: 0,
    telemetryAlerts: []
  });
  const [whatsappState, setWhatsappState] = useState('DISCONNECTED');

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get('/api/dashboard', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setData(res.data))
      .catch(err => console.error(err));
      
    // Obtener estado del Robot
    axios.get('/api/whatsapp/status', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setWhatsappState(res.data.status || 'DISCONNECTED'))
      .catch(() => setWhatsappState('DISCONNECTED'));
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard 360</h2>
          <p className="text-slate-500 mt-1">Resumen financiero y operativo de la red.</p>
        </div>
        
        {/* MICRO-BADGE ESTADO ROBOT (Regla 19) */}
        <Link 
          to="/whatsapp" 
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold border shadow-sm transition-colors ${
            whatsappState === 'CONNECTED' 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${whatsappState === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
          {whatsappState === 'CONNECTED' ? 'Robot: Conectado' : 'Robot: Esperando...'}
        </Link>
      </header>

      {/* PANEL CRÍTICO: Alertas de Telemetría (Siempre Arriba) */}
      {data.telemetryAlerts && data.telemetryAlerts.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3 mb-4 text-rose-700">
            <ServerCrash size={24} className="animate-pulse" />
            <h2 className="text-lg font-bold">Alertas Críticas de Infraestructura</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.telemetryAlerts.map(alert => (
              <div key={alert.id} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-l-rose-500 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-slate-800 text-sm truncate pr-2">{alert.title}</h3>
                  <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-1 rounded">URGENTE</span>
                </div>
                <p className="text-xs text-slate-500 mt-2 line-clamp-2">{alert.description}</p>
                <div className="mt-3 flex justify-between items-center text-xs text-slate-400">
                  <span>{new Date(alert.createdAt).toLocaleString()}</span>
                  <button className="text-blue-600 font-bold hover:underline cursor-pointer">Revisar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WIDGETS FINANCIEROS Y DE CLIENTES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-medium text-slate-500">Clientes Activos</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-2">{data.activeClients}</h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
            <Users size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-medium text-slate-500">Clientes Suspendidos</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-2">{data.suspendedClients}</h3>
          </div>
          <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center">
            <AlertOctagon size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-medium text-slate-500">Ingresos del Mes</p>
            <h3 className="text-3xl font-bold text-emerald-600 mt-2">${(data.monthlyIncome || 0).toLocaleString()}</h3>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
            <DollarSign size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-medium text-slate-500">Mora (Deuda Vencida)</p>
            <h3 className="text-3xl font-bold text-rose-600 mt-2">${(data.totalDebt || 0).toLocaleString()}</h3>
          </div>
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center">
            <AlertCircle size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm opacity-80 hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-3 mb-2 text-slate-700">
            <Activity size={20} />
            <h2 className="font-bold">Conexión de Respaldo (Local)</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            El cerebro de IA (Sofi) opera en la nube 24/7. 
            Mantené esta conexión escaneada en el celular de la empresa únicamente como vía alternativa.
          </p>
          <div className="flex flex-col justify-center items-center min-h-[150px] p-4 bg-slate-50 rounded-xl border border-slate-100 border-dashed text-slate-400">
            <LinkIcon size={32} className="mb-2" />
            <span className="text-sm font-bold">Módulo QR Reubicado</span>
            <span className="text-xs mt-1">Ver Centro de Control</span>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-xl font-semibold mb-4 text-slate-800">Alertas de Suspensión</h3>
          <div className="flex items-center justify-center py-12 text-slate-400">
            <div className="text-center">
              <Activity size={48} className="mx-auto mb-3 opacity-50" />
              <p>La integración con RADIUS aún no está activa.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
