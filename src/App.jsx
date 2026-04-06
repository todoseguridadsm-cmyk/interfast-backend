import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import Dashboard from './components/Dashboard';
import ClientsList from './components/ClientsList';
import InvoicesList from './components/InvoicesList';
import PlansList from './components/PlansList';
import Login from './components/Login';
import UsersList from './components/UsersList';
import Reports from './components/Reports';
import DailyCash from './components/DailyCash';
import TicketsList from './components/TicketsList';
import POSCaja from './components/POSCaja';
import { LayoutDashboard, Users, CreditCard, Wifi, ShieldAlert, LogOut, BarChart3, Wallet, Ticket, Store } from 'lucide-react';

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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const isAllowed = (menuKey) => {
    if (user.role === 'ADMIN') return true;
    if (!user.permissions || !Array.isArray(user.permissions)) return false;
    return user.permissions.includes('ALL') || user.permissions.includes(menuKey);
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-white tracking-tight">tkip<span className="text-blue-500">.net</span></h1>
          <p className="text-xs text-slate-500 uppercase mt-1 tracking-wider font-semibold">ISP Management</p>
        </div>
        
        <div className="px-6 py-2">
          <div className="text-xs text-slate-500 font-medium">Sesión iniciada como:</div>
          <div className="text-sm font-bold text-blue-400 capitalize">{user.username}</div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto custom-scrollbar">
          <Link to="/" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${location.pathname==='/' ? 'bg-blue-600/20 text-blue-500 font-medium' : 'hover:bg-slate-800 hover:text-white'}`}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </Link>
          
          {isAllowed('CLIENTES') && (
            <Link to="/clients" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${location.pathname==='/clients' ? 'bg-blue-600/20 text-blue-500 font-medium' : 'hover:bg-slate-800 hover:text-white'}`}>
              <Users size={20} />
              <span>Clientes</span>
            </Link>
          )}

          {isAllowed('FACTURACION') && (
            <Link to="/invoices" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${location.pathname==='/invoices' ? 'bg-blue-600/20 text-blue-500 font-medium' : 'hover:bg-slate-800 hover:text-white'}`}>
              <CreditCard size={20} />
              <span>Facturación</span>
            </Link>
          )}

          {isAllowed('PLANES') && (
            <Link to="/plans" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${location.pathname==='/plans' ? 'bg-blue-600/20 text-blue-500 font-medium' : 'hover:bg-slate-800 hover:text-white'}`}>
              <Wifi size={20} />
              <span>Planes</span>
            </Link>
          )}

          {isAllowed('REPORTES') && (
            <Link to="/reports" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${location.pathname==='/reports' ? 'bg-blue-600/20 text-blue-500 font-medium' : 'hover:bg-slate-800 hover:text-white'}`}>
              <BarChart3 size={20} />
              <span>Reportes y Ventas</span>
            </Link>
          )}

          {isAllowed('CAJA') && (
            <>
              <Link to="/pos" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${location.pathname==='/pos' ? 'bg-blue-600/20 text-blue-500 font-medium' : 'hover:bg-slate-800 hover:text-white'}`}>
                <Store size={20} />
                <span>Punto de Venta / Caja</span>
              </Link>
              <Link to="/cash" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${location.pathname==='/cash' ? 'bg-blue-600/20 text-blue-500 font-medium' : 'hover:bg-slate-800 hover:text-white'}`}>
                <Wallet size={20} />
                <span>Cierre y Arqueo Diario</span>
              </Link>
            </>
          )}

          {isAllowed('SOPORTE') && (
            <Link to="/tickets" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${location.pathname==='/tickets' ? 'bg-blue-600/20 text-blue-500 font-medium' : 'hover:bg-slate-800 hover:text-white'}`}>
              <Ticket size={20} />
              <span>Soporte Técnico</span>
            </Link>
          )}

          {user.role === 'ADMIN' && (
            <Link to="/users" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${location.pathname==='/users' ? 'bg-blue-600/20 text-blue-500 font-medium' : 'hover:bg-slate-800 hover:text-white'}`}>
              <ShieldAlert size={20} />
              <span>Empleados</span>
            </Link>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button onClick={handleLogout} className="flex items-center gap-2 justify-center w-full py-2 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400 rounded-lg transition-colors text-sm font-medium">
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-slate-50/50">
        <div className="p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clients" element={isAllowed('CLIENTES') ? <ClientsList /> : <div className="p-8 text-center text-slate-400">Acceso Denegado</div>} />
            <Route path="/plans" element={isAllowed('PLANES') ? <PlansList /> : <div className="p-8 text-center text-slate-400">Acceso Denegado</div>} />
            <Route path="/invoices" element={isAllowed('FACTURACION') ? <InvoicesList /> : <div className="p-8 text-center text-slate-400">Acceso Denegado</div>} />
            <Route path="/pos" element={isAllowed('CAJA') ? <POSCaja /> : <div className="p-8 text-center text-slate-400">Acceso Denegado</div>} />
            <Route path="/reports" element={isAllowed('REPORTES') ? <Reports /> : <div className="p-8 text-center text-slate-400">Acceso Denegado</div>} />
            <Route path="/cash" element={isAllowed('CAJA') ? <DailyCash /> : <div className="p-8 text-center text-slate-400">Acceso Denegado</div>} />
            <Route path="/tickets" element={isAllowed('SOPORTE') ? <TicketsList /> : <div className="p-8 text-center text-slate-400">Acceso Denegado</div>} />
            <Route path="/users" element={user.role === 'ADMIN' ? <UsersList /> : <div className="p-8 text-center text-slate-400">Acceso Denegado</div>} />
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
