import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Dashboard from './components/Dashboard';
import ClientsList from './components/ClientsList';
import InvoicesList from './components/InvoicesList';
import PlansList from './components/PlansList';
import Login from './components/Login';
import UsersList from './components/UsersList';
import DailyCash from './components/DailyCash';
import TicketsList from './components/TicketsList';
import POSCaja from './components/POSCaja';
import WhatsAppStatus from './components/WhatsAppStatus';
import CutoffList from './components/CutoffList';
import BajasList from './components/BajasList';
import RetirosList from './components/RetirosList';
import NodesList from './components/NodesList';
import AltasWebList from './components/AltasWebList';
import ContentApproval from './components/ContentApproval';
import UnidentifiedPaymentsList from './components/UnidentifiedPaymentsList';
import BroadcastList from './components/BroadcastList';
import ChatCRM from './components/ChatCRM';
import { LayoutDashboard, Users, CreditCard, Wifi, Server, ShieldAlert, LogOut, BarChart3, Wallet, Ticket, Store, MessageSquare, Menu, X, Scissors, UserPlus, UserMinus, ShoppingBag, Radio, Globe, FileText, AlertTriangle, RefreshCw, Megaphone, MessageCircle } from 'lucide-react';

// Setup JWT Interceptor
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
axios.interceptors.response.use(
  res => res,
  err => {
    if (err.response && err.response.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

function AppContent() {
  const token = localStorage.getItem('token');
  const location = useLocation();
  
  if (!token) {
    return <Login />;
  }

  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : { role: 'STAFF', permissions: [], username: 'Usuario' };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const handleLinkClick = () => setIsMobileMenuOpen(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  useEffect(() => {
    if (!token) return;
    
    let inactivityTimer;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      // 10 minutes = 600,000 milisegundos
      inactivityTimer = setTimeout(() => {
        alert('Sesión expirada por inactividad. Por favor, vuelva a iniciar sesión por seguridad.');
        handleLogout();
      }, 600000);
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('scroll', resetTimer);
    window.addEventListener('click', resetTimer);

    resetTimer();

    return () => {
      clearTimeout(inactivityTimer);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('scroll', resetTimer);
      window.removeEventListener('click', resetTimer);
    };
  }, [token]);

  const isAllowed = (menuKey) => {
    if (user.role === 'ADMIN') return true;
    if (!user.permissions || !Array.isArray(user.permissions)) return false;
    return user.permissions.includes('ALL') || user.permissions.includes(menuKey);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 font-sans">
      
      {/* Mobile Top Bar */}
      <div className="md:hidden bg-[#060c18] border-b border-cyan-500/20 text-white p-4 flex items-center justify-between shadow-lg z-30">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f0ff]" />
          <h1 className="text-xl font-black tracking-wider text-white">tkip<span className="text-cyan-400">.net</span></h1>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-1.5 rounded-lg bg-slate-800/80 border border-cyan-500/30 text-cyan-400 hover:text-white transition-colors">
          {isMobileMenuOpen ? <X size={22}/> : <Menu size={22}/>}
        </button>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/80 z-40 backdrop-blur-md transition-opacity" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* Futuristic Sidebar */}
      <aside className={`fixed md:static top-0 bottom-0 left-0 z-50 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-out w-64 bg-gradient-to-b from-[#050b18] via-[#081226] to-[#040812] border-r border-cyan-500/20 text-slate-300 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.6)] relative overflow-hidden select-none`}>
        {/* Subtle Cyber Glow Orbs */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-20 left-0 w-40 h-40 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none"></div>

        {/* Brand Header */}
        <div className="p-5 pb-3 hidden md:block border-b border-slate-800/60 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black shadow-[0_0_12px_rgba(6,182,212,0.4)] text-sm">
                TK
              </div>
              <div>
                <h1 className="text-xl font-black text-white tracking-wider leading-none">tkip<span className="text-cyan-400">.net</span></h1>
                <p className="text-[10px] text-cyan-400/70 font-semibold tracking-widest uppercase mt-1">ISP Management</p>
              </div>
            </div>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-400">v2.6</span>
          </div>
        </div>
        
        {/* User Session Badge */}
        <div className="px-4 py-3 mx-3 my-2 rounded-xl bg-slate-900/60 border border-slate-800/80 relative z-10 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-cyan-500/40 flex items-center justify-center text-cyan-400 text-xs font-bold uppercase">
                {user.username ? user.username.charAt(0) : 'U'}
              </div>
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-slate-900 shadow-[0_0_6px_#10b981]"></span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-slate-400 font-medium leading-none">Sesión Activa</div>
              <div className="text-xs font-bold text-slate-100 truncate capitalize mt-0.5">{user.username}</div>
            </div>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 uppercase font-semibold">
              {user.role}
            </span>
          </div>
        </div>

        {/* Nav Links List with completely hidden scrollbar */}
        <nav className="flex-1 px-3 space-y-1 mt-1 overflow-y-auto no-scrollbar pb-6 relative z-10">
          
          {/* Section: Principal */}
          <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Gestión
          </div>

          {/* 1. Dashboard */}
          <Link onClick={handleLinkClick} to="/" className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${location.pathname==='/' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)] font-semibold' : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] border border-transparent'}`}>
            <LayoutDashboard size={18} className={location.pathname==='/' ? 'text-cyan-400 drop-shadow-[0_0_6px_#00f0ff]' : 'text-slate-400 group-hover:text-cyan-400 transition-colors'} />
            <span className="flex-1 truncate">Dashboard</span>
          </Link>

          {/* 2. Clientes */}
          {isAllowed('CLIENTES') && (
            <Link onClick={handleLinkClick} to="/clients" className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${location.pathname==='/clients' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)] font-semibold' : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] border border-transparent'}`}>
              <Users size={18} className={location.pathname==='/clients' ? 'text-cyan-400 drop-shadow-[0_0_6px_#00f0ff]' : 'text-slate-400 group-hover:text-cyan-400 transition-colors'} />
              <span className="flex-1 truncate">Clientes</span>
            </Link>
          )}

          {/* 3. Facturación */}
          {isAllowed('FACTURACION') && (
            <Link onClick={handleLinkClick} to="/invoices" className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${location.pathname==='/invoices' ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.15)] font-semibold' : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] border border-transparent'}`}>
              <CreditCard size={18} className={location.pathname==='/invoices' ? 'text-blue-400 drop-shadow-[0_0_6px_#3b82f6]' : 'text-slate-400 group-hover:text-blue-400 transition-colors'} />
              <span className="flex-1 truncate">Facturación</span>
            </Link>
          )}

          {/* Section: Comunicación */}
          <div className="px-3 pt-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Comunicación
          </div>

          {/* Difusión */}
          <Link onClick={handleLinkClick} to="/broadcast" className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${location.pathname==='/broadcast' ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.2)] font-semibold' : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] border border-transparent'}`}>
            <Radio size={18} className={location.pathname==='/broadcast' ? 'text-indigo-400 drop-shadow-[0_0_6px_#818cf8]' : 'text-slate-400 group-hover:text-indigo-400 transition-colors'} />
            <span className="flex-1 truncate">Difusión</span>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_5px_#818cf8]"></span>
          </Link>

          {/* Chat CRM */}
          <Link onClick={handleLinkClick} to="/chat" className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${location.pathname==='/chat' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)] font-semibold' : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] border border-transparent'}`}>
            <MessageCircle size={18} className={location.pathname==='/chat' ? 'text-emerald-400 drop-shadow-[0_0_6px_#10b981]' : 'text-slate-400 group-hover:text-emerald-400 transition-colors'} />
            <span className="flex-1 truncate">Chat WhatsApp</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_#10b981] animate-pulse"></span>
          </Link>

          {/* Section: Operaciones */}
          <div className="px-3 pt-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Operaciones
          </div>

          {/* 5. Cortes de Servicio */}
          {isAllowed('CORTES') && (
            <Link onClick={handleLinkClick} to="/cutoff" className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${location.pathname==='/cutoff' ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.2)] font-semibold' : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] border border-transparent'}`}>
              <Scissors size={18} className={location.pathname==='/cutoff' ? 'text-rose-400 drop-shadow-[0_0_6px_#f43f5e]' : 'text-slate-400 group-hover:text-rose-400 transition-colors'} />
              <span className="flex-1 truncate">Cortes de Servicio</span>
            </Link>
          )}

          {/* 7. Cierre y Arqueo Diario + 8. POS/Caja */}
          {isAllowed('CAJA') && (
            <>
              <Link onClick={handleLinkClick} to="/cash" className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${location.pathname==='/cash' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)] font-semibold' : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] border border-transparent'}`}>
                <Wallet size={18} className={location.pathname==='/cash' ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-400 transition-colors'} />
                <span className="flex-1 truncate">Cierre y Arqueo Diario</span>
              </Link>
              <Link onClick={handleLinkClick} to="/pos" className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${location.pathname==='/pos' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)] font-semibold' : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] border border-transparent'}`}>
                <Store size={18} className={location.pathname==='/pos' ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-400 transition-colors'} />
                <span className="flex-1 truncate">Punto de Venta / Caja</span>
              </Link>
            </>
          )}

          {/* 9. Reportes */}
          {isAllowed('REPORTES') && (
            <Link onClick={handleLinkClick} to="/unidentified" className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${location.pathname==='/unidentified' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)] font-semibold' : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] border border-transparent'}`}>
              <AlertTriangle size={18} className={location.pathname==='/unidentified' ? 'text-amber-400 drop-shadow-[0_0_6px_#f59e0b]' : 'text-slate-400 group-hover:text-amber-400 transition-colors'} />
              <span className="flex-1 truncate">Pagos No Reconocidos</span>
            </Link>
          )}

          {/* 10. Soporte Técnico */}
          {isAllowed('SOPORTE') && (
            <Link onClick={handleLinkClick} to="/tickets" className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${location.pathname==='/tickets' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)] font-semibold' : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] border border-transparent'}`}>
              <Ticket size={18} className={location.pathname==='/tickets' ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-400 transition-colors'} />
              <span className="flex-1 truncate">Soporte Técnico</span>
            </Link>
          )}

          {/* 11. Altas Web/Agente */}
          {isAllowed('CLIENTES') && (
            <Link onClick={handleLinkClick} to="/altas-web" className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${location.pathname==='/altas-web' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)] font-semibold' : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] border border-transparent'}`}>
              <Globe size={18} className={location.pathname==='/altas-web' ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-400 transition-colors'} />
              <span className="flex-1 truncate">Altas Web / Agente</span>
            </Link>
          )}

          {/* 13. Contenido */}
          {isAllowed('CLIENTES') && (
            <Link onClick={handleLinkClick} to="/content-approval" className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${location.pathname==='/content-approval' ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.2)] font-semibold' : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] border border-transparent'}`}>
              <FileText size={18} className={location.pathname==='/content-approval' ? 'text-indigo-400' : 'text-slate-400 group-hover:text-indigo-400 transition-colors'} />
              <span className="flex-1 truncate">Contenido</span>
            </Link>
          )}

          {/* 15. Solicitudes de Baja */}
          {isAllowed('BAJAS') && (
            <Link onClick={handleLinkClick} to="/bajas" className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${location.pathname==='/bajas' ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.2)] font-semibold' : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] border border-transparent'}`}>
              <UserMinus size={18} className={location.pathname==='/bajas' ? 'text-rose-400' : 'text-slate-400 group-hover:text-rose-400 transition-colors'} />
              <span className="flex-1 truncate">Solicitudes de Baja</span>
            </Link>
          )}

          {/* 16. Bajas / Retiros (Clientes inactivos) */}
          {isAllowed('BAJAS') && (
            <Link onClick={handleLinkClick} to="/retiros" className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${location.pathname==='/retiros' ? 'bg-orange-500/15 text-orange-300 border border-orange-500/30 shadow-[0_0_12px_rgba(249,115,22,0.2)] font-semibold' : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] border border-transparent'}`}>
              <UserMinus size={18} className={location.pathname==='/retiros' ? 'text-orange-400' : 'text-slate-400 group-hover:text-orange-400 transition-colors'} />
              <span className="flex-1 truncate">Bajas / Retiros Antena</span>
            </Link>
          )}

          {/* Section: Administración */}
          {(isAllowed('PLANES') || user.role === 'ADMIN') && (
            <div className="px-3 pt-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Administración
            </div>
          )}

          {/* Planes (Admin) */}
          {isAllowed('PLANES') && (
            <Link onClick={handleLinkClick} to="/plans" className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${location.pathname==='/plans' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)] font-semibold' : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] border border-transparent'}`}>
              <Wifi size={18} className={location.pathname==='/plans' ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-400 transition-colors'} />
              <span className="flex-1 truncate">Planes</span>
            </Link>
          )}

          {/* Admin: Empleados, WhatsApp, Nodos */}
          {user.role === 'ADMIN' && (
            <>
              <Link onClick={handleLinkClick} to="/users" className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${location.pathname==='/users' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)] font-semibold' : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] border border-transparent'}`}>
                <ShieldAlert size={18} className={location.pathname==='/users' ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-400 transition-colors'} />
                <span className="flex-1 truncate">Empleados</span>
              </Link>
              <Link onClick={handleLinkClick} to="/whatsapp" className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${location.pathname==='/whatsapp' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)] font-semibold' : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] border border-transparent'}`}>
                <MessageSquare size={18} className={location.pathname==='/whatsapp' ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-400 transition-colors'} />
                <span className="flex-1 truncate">Servidor WhatsApp</span>
              </Link>
              <Link onClick={handleLinkClick} to="/nodes" className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${location.pathname==='/nodes' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)] font-semibold' : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] border border-transparent'}`}>
                <Server size={18} className={location.pathname==='/nodes' ? 'text-cyan-400 drop-shadow-[0_0_6px_#00f0ff]' : 'text-slate-400 group-hover:text-cyan-400 transition-colors'} />
                <span className="flex-1 truncate">Nodos Mikrotik</span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_5px_#00f0ff]"></span>
              </Link>
            </>
          )}
        </nav>

        {/* Bottom Session Action */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 relative z-10">
          <button onClick={handleLogout} className="flex items-center gap-2.5 justify-center w-full py-2.5 bg-slate-900/80 hover:bg-rose-500/15 hover:text-rose-300 text-slate-400 border border-slate-800 hover:border-rose-500/30 rounded-xl transition-all duration-200 text-xs font-semibold shadow-inner">
            <LogOut size={15} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-slate-50/50 md:mt-0 relative">
        <div className="p-4 md:p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clients" element={isAllowed('CLIENTES') ? <ClientsList /> : <div className="p-8 text-center text-slate-400">Acceso Denegado</div>} />
            <Route path="/altas-web" element={isAllowed('CLIENTES') ? <AltasWebList /> : <div className="p-8 text-center text-slate-400">Acceso Denegado</div>} />
            <Route path="/content-approval" element={isAllowed('CLIENTES') ? <ContentApproval /> : <div className="p-8 text-center text-slate-400">Acceso Denegado</div>} />
            <Route path="/broadcast" element={<BroadcastList />} />
            <Route path="/chat" element={<ChatCRM />} />
            <Route path="/plans" element={isAllowed('PLANES') ? <PlansList /> : <div className="p-8 text-center text-slate-400">Acceso Denegado</div>} />
            <Route path="/invoices" element={isAllowed('FACTURACION') ? <InvoicesList /> : <div className="p-8 text-center text-slate-400">Acceso Denegado</div>} />
            <Route path="/cutoff" element={isAllowed('CORTES') ? <CutoffList /> : <div className="p-8 text-center text-slate-400">Acceso Denegado</div>} />
            <Route path="/bajas" element={isAllowed('BAJAS') ? <BajasList /> : <div className="p-8 text-center text-slate-400">Acceso Denegado</div>} />
            <Route path="/retiros" element={isAllowed('BAJAS') ? <RetirosList /> : <div className="p-8 text-center text-slate-400">Acceso Denegado</div>} />
            <Route path="/pos" element={isAllowed('CAJA') ? <POSCaja /> : <div className="p-8 text-center text-slate-400">Acceso Denegado</div>} />
            <Route path="/unidentified" element={isAllowed('REPORTES') ? <UnidentifiedPaymentsList /> : <div className="p-8 text-center text-slate-400">Acceso Denegado</div>} />
            <Route path="/cash" element={isAllowed('CAJA') ? <DailyCash /> : <div className="p-8 text-center text-slate-400">Acceso Denegado</div>} />
            <Route path="/tickets" element={isAllowed('SOPORTE') ? <TicketsList /> : <div className="p-8 text-center text-slate-400">Acceso Denegado</div>} />
            <Route path="/whatsapp" element={user.role === 'ADMIN' ? <WhatsAppStatus /> : <div className="p-8 text-center text-slate-400">Acceso Denegado</div>} />
            <Route path="/users" element={user.role === 'ADMIN' ? <UsersList /> : <div className="p-8 text-center text-slate-400">Acceso Denegado</div>} />
            <Route path="/nodes" element={user.role === 'ADMIN' ? <NodesList /> : <div className="p-8 text-center text-slate-400">Acceso Denegado</div>} />
            <Route path="/login" element={<Dashboard />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
