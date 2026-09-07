import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Activity, 
  Users, 
  AlertCircle, 
  DollarSign, 
  ServerCrash, 
  AlertOctagon, 
  Link as LinkIcon,
  ShieldCheck,
  TrendingUp,
  Cpu,
  Radio,
  Zap,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
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
  const [loading, setLoading] = useState(false);

  const fetchDashboard = () => {
    const token = localStorage.getItem('token');
    setLoading(true);
    axios.get('/api/dashboard', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
      
    // Obtener estado del Robot
    axios.get('/api/whatsapp/status', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setWhatsappState(res.data.status || 'DISCONNECTED'))
      .catch(() => setWhatsappState('DISCONNECTED'));
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      
      {/* Futuristic Cyber Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#050b18] via-[#08152e] to-[#040814] border border-cyan-500/30 p-6 md:p-8 shadow-[0_0_35px_rgba(6,182,212,0.15)]">
        {/* Glow accents */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="relative p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              <Cpu size={36} className="drop-shadow-[0_0_8px_#00f0ff]" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-semibold tracking-wider uppercase">
                  ISP NETWORK MATRIX // 360 CORE
                </span>
                <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                  <Activity size={12} className="text-emerald-400 animate-pulse" /> TELEMETRÍA EN VIVO
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-wide mt-1">
                Dashboard <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">360 Operational</span>
              </h1>
              <p className="text-slate-400 text-xs md:text-sm mt-1 max-w-xl">
                Resumen financiero, monitoreo de conexiones activas y estado de la red en tiempo real.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={fetchDashboard}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/40 transition-all text-xs font-semibold flex items-center gap-1.5 shadow-inner"
              title="Actualizar Datos"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin text-cyan-400' : ''} />
              <span className="hidden sm:inline">Refrescar</span>
            </button>

            {/* Robot WhatsApp Status Badge */}
            <Link 
              to="/whatsapp" 
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold border shadow-[0_0_15px_rgba(0,0,0,0.4)] transition-all ${
                whatsappState === 'CONNECTED' 
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                  : 'bg-amber-950/60 text-amber-300 border-amber-500/40 hover:bg-amber-900/60 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${whatsappState === 'CONNECTED' ? 'bg-emerald-400 animate-pulse shadow-[0_0_6px_#10b981]' : 'bg-amber-400'}`}></span>
              <span>Robot WA: {whatsappState === 'CONNECTED' ? 'ONLINE' : 'ESPERANDO'}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Critical Telemetry Alerts */}
      {data.telemetryAlerts && data.telemetryAlerts.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-950/40 via-red-900/20 to-slate-900 border border-rose-500/40 p-5 shadow-[0_0_25px_rgba(244,63,94,0.2)] animate-fadeIn">
          <div className="flex items-center gap-3 mb-4 text-rose-400">
            <ServerCrash size={24} className="animate-pulse drop-shadow-[0_0_8px_#f43f5e]" />
            <h2 className="text-base font-black tracking-wide text-white uppercase font-mono">
              Alertas Críticas de Infraestructura ({data.telemetryAlerts.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.telemetryAlerts.map(alert => (
              <div key={alert.id} className="bg-slate-900/90 p-4 rounded-xl border border-rose-500/30 hover:border-rose-400 transition-all shadow-md">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-white text-sm truncate pr-2">{alert.title}</h3>
                  <span className="bg-rose-500/20 text-rose-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-rose-500/30">
                    URGENTE
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2 line-clamp-2">{alert.description}</p>
                <div className="mt-3 flex justify-between items-center text-xs text-slate-500 font-mono">
                  <span>{new Date(alert.createdAt).toLocaleString()}</span>
                  <button className="text-cyan-400 font-bold hover:underline cursor-pointer">Revisar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cyber Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Active Clients */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#070e1e] to-[#040812] p-6 border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:border-cyan-400 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-slate-400">Clientes Activos</p>
              <h3 className="text-3xl font-black text-cyan-300 mt-2 tracking-tight drop-shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                {data.activeClients}
              </h3>
              <p className="text-[10px] font-mono text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle2 size={11} /> Conectados a la Red
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.3)]">
              <Users size={22} />
            </div>
          </div>
        </div>

        {/* Suspended Clients */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#070e1e] to-[#040812] p-6 border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:border-amber-400 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-slate-400">Clientes Suspendidos</p>
              <h3 className="text-3xl font-black text-amber-300 mt-2 tracking-tight drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                {data.suspendedClients}
              </h3>
              <p className="text-[10px] font-mono text-amber-400 mt-1 flex items-center gap-1">
                <AlertOctagon size={11} /> Pendientes de Pago
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.3)]">
              <AlertOctagon size={22} />
            </div>
          </div>
        </div>

        {/* Monthly Income */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#070e1e] to-[#040812] p-6 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:border-emerald-400 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-slate-400">Ingresos del Mes</p>
              <h3 className="text-3xl font-black text-emerald-300 mt-2 tracking-tight drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                ${(data.monthlyIncome || 0).toLocaleString()}
              </h3>
              <p className="text-[10px] font-mono text-emerald-400 mt-1 flex items-center gap-1">
                <TrendingUp size={11} /> Cobranza Registrada
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.3)]">
              <DollarSign size={22} />
            </div>
          </div>
        </div>

        {/* Total Debt / Mora */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#070e1e] to-[#040812] p-6 border border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.15)] hover:border-rose-400 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-slate-400">Mora (Deuda Vencida)</p>
              <h3 className="text-3xl font-black text-rose-300 mt-2 tracking-tight drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]">
                ${(data.totalDebt || 0).toLocaleString()}
              </h3>
              <p className="text-[10px] font-mono text-rose-400 mt-1 flex items-center gap-1">
                <AlertCircle size={11} /> Por Recaudar
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shadow-[0_0_12px_rgba(244,63,94,0.3)]">
              <AlertCircle size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* Cyber Operations Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* IA Sofi Agent & Cloud Matrix */}
        <div className="lg:col-span-1 rounded-2xl bg-gradient-to-b from-[#070e1e] to-[#040812] border border-cyan-500/20 p-6 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3 text-cyan-400">
              <Activity size={22} className="text-cyan-400 animate-pulse" />
              <h2 className="font-bold text-white text-base">Conexión IA & Respaldo</h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              El cerebro de IA (Sofi) opera en la nube 24/7 procesando altas y cobranzas. Mantené la sesión local vinculada para difusión masiva.
            </p>
          </div>
          
          <div className="mt-6 flex flex-col justify-center items-center p-6 bg-slate-900/60 rounded-xl border border-cyan-500/20 text-slate-400 backdrop-blur-sm">
            <LinkIcon size={32} className="text-cyan-400 mb-2 drop-shadow-[0_0_8px_#00f0ff]" />
            <span className="text-sm font-bold text-white">Centro de Control WhatsApp</span>
            <Link to="/whatsapp" className="text-xs text-cyan-400 font-mono mt-2 hover:underline">
              Abrir Motor de Enlace →
            </Link>
          </div>
        </div>

        {/* Network Suspension Protocol */}
        <div className="lg:col-span-2 rounded-2xl bg-gradient-to-b from-[#070e1e] to-[#040812] border border-slate-800 p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Radio size={18} className="text-indigo-400" />
              Telemetría Mikrotik & Suspensiones Automáticas
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-500/30 text-indigo-300">
              PROT-V2
            </span>
          </div>

          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Activity size={44} className="text-slate-600 mb-3 animate-pulse" />
            <p className="text-sm font-semibold text-slate-300">Monitoreo de Nodos Mikrotik Activo</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm text-center font-mono">
              Los cortes y reconexiones automáticas son sincronizados periódicamente mediante el motor n8n y API RouterOS.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}

