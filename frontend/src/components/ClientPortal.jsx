import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Wifi, 
  Shield, 
  Zap, 
  CreditCard, 
  ChevronRight, 
  LogOut, 
  CheckCircle2, 
  Copy, 
  AlertCircle, 
  Play, 
  X, 
  Activity, 
  AlertTriangle, 
  User, 
  KeyRound, 
  Smartphone, 
  LogIn, 
  CheckSquare, 
  MessageSquare, 
  Plus, 
  Check, 
  Clock, 
  Phone, 
  FileText, 
  Lock, 
  ShieldCheck, 
  Mail, 
  Server, 
  WifiOff,
  Download,
  HelpCircle,
  DownloadCloud,
  Send,
  Sparkles,
  ExternalLink,
  PhoneCall
} from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://interfast-backend-95ww.onrender.com';

export default function ClientPortal() {
  const [token, setToken] = useState(localStorage.getItem('portal_token') || '');
  const [clientData, setClientData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loginDni, setLoginDni] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Tabs: 'overview' | 'invoices' | 'tickets'
  const [activeTab, setActiveTab] = useState('overview');
  
  // Múltiples cuentas por DNI
  const [multipleAccounts, setMultipleAccounts] = useState(() => {
    if (window.location.hash === '#select') {
      const stored = localStorage.getItem('portal_multiple_accounts');
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  }); // array de cuentas
  const [pendingDni, setPendingDni] = useState(() => localStorage.getItem('portal_pending_dni') || ''); // DNI guardado para el select
  const [pendingPhone, setPendingPhone] = useState(() => localStorage.getItem('portal_pending_phone') || ''); // Teléfono guardado para el select
  
  // Reclamo Modal
  const [ticketModal, setTicketModal] = useState(false);
  const [ticketCategory, setTicketCategory] = useState('Sin Señal');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketStatus, setTicketStatus] = useState('idle'); // idle, loading, success, error

  // ==========================================
  // ESTADOS PRUEBA DE CONEXIÓN
  // ==========================================
  const [connectionTestModal, setConnectionTestModal] = useState(false);
  const [connectionTestStatus, setConnectionTestStatus] = useState('idle'); // idle, testing_antenna, testing_router, testing_signal, success, error, support_ticket_created, offline
  const [connectionTestResult, setConnectionTestResult] = useState(null);

  // ==========================================
  // OBTENER HISTORIAL DE FACTURAS
  // ==========================================
  
  // Copy Feedback
  const [copiedAlias, setCopiedAlias] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);

  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    });
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert('Para instalar la app:\n\n• En Android (Chrome): Toca los 3 puntos arriba a la derecha y selecciona "Instalar aplicación" o "Agregar a la pantalla principal".\n\n• En iPhone (Safari): Toca el botón Compartir (cuadrado con flecha) y selecciona "Agregar a pantalla de inicio".');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  const fetchClientData = async (authToken = token) => {
    if (!authToken) return;
    setLoading(true);
    try {
      const ts = new Date().getTime();
      const res = await axios.get(`${BACKEND_URL}/api/portal/me?_cb=${ts}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setClientData(res.data);
    } catch (err) {
      console.error('Error fetching portal data:', err);
      if (err.response && err.response.status === 401) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRunConnectionTest = async () => {
    const sanitizedDocument = client?.dni || loginDni;
    setConnectionTestStatus('testing_antenna');
    setConnectionTestResult(null);
    try {
      const response = await axios.post(`${BACKEND_URL}/api/portal/connection-test`, {
        documentId: sanitizedDocument
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 8000 // 8 segundos de límite
      });

      const data = response.data;
      setConnectionTestResult(data);
      if (data.ticketCreated) {
        setConnectionTestStatus('support_ticket_created');
      } else if (data.status === 'ok') {
        setConnectionTestStatus('success');
      } else {
        setConnectionTestStatus('error');
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'ECONNABORTED' || err.message === 'Network Error' || !err.response) {
        setConnectionTestStatus('offline');
        setConnectionTestResult({ 
          clientName: client?.name || loginDni
        });
      } else {
        setConnectionTestResult({ error: err.response?.data?.error || err.message, status: 'error' });
        setConnectionTestStatus('error');
      }
    }
  };

  useEffect(() => {
    if (token && window.location.hash !== '#portal') {
      // Usar pushState para garantizar que el historial tenga al menos 2 entradas
      // Esto evita que el botón físico "Atrás" cierre la PWA instantáneamente
      window.history.pushState(null, '', '#portal');
    }
    if (token) {
      fetchClientData(token);
    }
  }, [token]);

  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash;
      if (hash === '#select') {
        const storedAccounts = localStorage.getItem('portal_multiple_accounts');
        if (storedAccounts) {
          setMultipleAccounts(JSON.parse(storedAccounts));
          setToken(''); // Ocultar el portal para mostrar la vista de selección
        } else {
          setToken('');
          setMultipleAccounts(null);
          window.history.replaceState(null, '', ' ');
        }
      } else if (hash === '' || hash === '#login') {
        setMultipleAccounts(null);
        setToken('');
      } else if (hash === '#portal' && localStorage.getItem('portal_token')) {
        setToken(localStorage.getItem('portal_token'));
        setMultipleAccounts(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (!loginDni.trim()) {
      setLoginError('Por favor ingresa tu DNI.');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/portal/auth`, {
        dni: loginDni.trim(),
        phone: loginPhone.trim()
      });
      // Múltiples cuentas: mostrar selector
      if (res.data.multipleAccounts) {
        setPendingDni(loginDni.trim());
        setPendingPhone(loginPhone.trim());
        setMultipleAccounts(res.data.accounts);
        localStorage.setItem('portal_multiple_accounts', JSON.stringify(res.data.accounts));
        localStorage.setItem('portal_pending_dni', loginDni.trim());
        localStorage.setItem('portal_pending_phone', loginPhone.trim());
        window.history.pushState(null, '', '#select');
        return;
      }
      // Cuenta única: loguear directamente
      if (res.data.token) {
        localStorage.setItem('portal_token', res.data.token);
        setToken(res.data.token);
      }
    } catch (err) {
      setLoginError(err.response?.data?.error || 'No pudimos verificar tus datos. Verifica tu DNI o contáctanos.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAccount = async (clientId) => {
    setLoading(true);
    setLoginError('');
    try {
      const res = await axios.post(`${BACKEND_URL}/api/portal/auth/select`, {
        clientId,
        dni: pendingDni,
        phone: pendingPhone
      });
      if (res.data.token) {
        localStorage.setItem('portal_token', res.data.token);
        setMultipleAccounts(null);
        setToken(res.data.token);
        window.history.pushState(null, '', '#portal');
      }
    } catch (err) {
      setLoginError(err.response?.data?.error || 'Error al seleccionar la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('portal_token');
    localStorage.removeItem('portal_multiple_accounts');
    localStorage.removeItem('portal_pending_dni');
    localStorage.removeItem('portal_pending_phone');
    setToken('');
    setClientData(null);
    setMultipleAccounts(null);
    window.history.pushState(null, '', ' ');
  };

  const getMercadoPagoHref = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) return "mercadopago://";
    // Intent explícito de Launcher para Android (equivale a tocar el ícono de la app en el inicio)
    // No requiere que la app declare un scheme, simplemente fuerza abrir el package.
    return "intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.mercadopago.wallet;end";
  };

  const handleCopyAlias = () => {
    navigator.clipboard.writeText('INTERFASTSM');
    setCopiedAlias(true);
    setTimeout(() => setCopiedAlias(false), 2000);
  };

  const handlePayTransfer = (amount) => {
    navigator.clipboard.writeText('INTERFASTSM');
    alert(`Alias INTERFASTSM copiado.\nAbre Mercado Pago o tu banco y transfiere el monto exacto: $${amount}.`);
  };

  const handleCopyAmount = (amount) => {
    navigator.clipboard.writeText(amount.toString());
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2500);
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!ticketDescription.trim()) return;
    setTicketStatus('loading');
    try {
      await axios.post(`${BACKEND_URL}/api/portal/tickets`, {
        category: ticketCategory,
        title: `Reclamo App: ${ticketCategory}`,
        description: ticketDescription.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('¡Reclamo técnico registrado con éxito! Nuestro equipo técnico se pondrá en contacto a la brevedad.');
      setTicketModal(false);
      setTicketDescription('');
      setTicketStatus('success');
      fetchClientData(token);
    } catch (err) {
      setTicketStatus('error');
      alert(err.response?.data?.error || 'Error al registrar el reclamo.');
    }
  };

  // -------------------------------------------------------------
  // VISTA 0.5: SELECTOR DE CUENTA (cuando hay múltiples por DNI)
  // -------------------------------------------------------------
  if (multipleAccounts) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center p-4 sm:p-6 font-sans relative overflow-hidden">
        <div className="absolute top-[-150px] left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-md w-full mx-auto z-10">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mb-3">
                <Wifi size={28} />
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">Elegí tu Servicio</h2>
              <p className="text-xs text-slate-400 mt-1">
                Tu DNI tiene {multipleAccounts.length} servicios registrados. ¿Cuál querés ver?
              </p>
            </div>

            {loginError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                {loginError}
              </div>
            )}

            <div className="space-y-3">
              {multipleAccounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => handleSelectAccount(acc.id)}
                  disabled={loading}
                  className="w-full text-left p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:border-cyan-500/50 hover:bg-slate-800 transition-all group relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white text-sm truncate">{acc.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5 truncate">{acc.address}{acc.city ? ` – ${acc.city}` : ''}</div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
                          {acc.planName}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          acc.status === 'ACTIVE' 
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                        }`}>
                          {acc.status === 'ACTIVE' ? '● Activo' : '● Suspendido'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-500 group-hover:text-cyan-400 transition-colors shrink-0 ml-2" />
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => { 
                setMultipleAccounts(null); 
                setLoginError(''); 
                window.history.pushState(null, '', ' ');
              }}
              className="mt-4 w-full py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              ← Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VISTA 1: LOGIN DEL CLIENTE
  // -------------------------------------------------------------
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 font-sans relative overflow-hidden">
        {/* Background ambient glow */}
        <div className="absolute top-[-150px] left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-150px] right-[-100px] w-[400px] h-[400px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

        {/* Top brand */}
        <header className="flex justify-between items-center max-w-md mx-auto w-full pt-4 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-0.5 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Wifi size={20} className="text-cyan-400 animate-pulse" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-black tracking-wider bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                INTERFAST
              </h1>
              <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">Portal del Abonado</p>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-semibold hover:bg-cyan-500/25 transition-all shadow-sm"
          >
            <Smartphone size={14} /> Instalar App
          </button>
        </header>

        {/* Login Form Container */}
        <main className="max-w-md w-full mx-auto my-auto py-4 sm:py-8 z-10">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mb-4 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                <ShieldCheck size={32} />
              </div>
              <h2 className="text-3xl font-black text-white mb-2">Bienvenido</h2>
              <p className="text-sm text-slate-400">Consulta tu estado de cuenta, abona en 1 clic y gestiona tu servicio de internet.</p>
            </div>

            {loginError && (
              <div className="mb-6 p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Número de DNI o CUIT
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  placeholder="Ej: 30884836"
                  value={loginDni}
                  onChange={(e) => setLoginDni(e.target.value)}
                  className="w-full px-5 py-4 rounded-xl bg-slate-950 border border-slate-700/80 text-white placeholder-slate-500 font-mono text-lg focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Teléfono registrado (Últimos 4 o completo)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  placeholder="Ej: 3456"
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                  className="w-full px-5 py-4 rounded-xl bg-slate-950 border border-slate-700/80 text-white placeholder-slate-500 font-mono text-lg focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-base uppercase tracking-wider shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:shadow-[0_0_35px_rgba(6,182,212,0.6)] transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Ingresar a Mi Cuenta</span>
                    <ChevronRight size={20} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-800 text-center">
              <p className="text-[11px] text-slate-400">
                ¿Problemas para ingresar? Escríbenos a soporte:{' '}
                <a
                  href="https://wa.me/5492634513933?text=Hola%20Interfast,%20necesito%20ayuda%20para%20ingresar%20a%20mi%20portal"
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 font-bold hover:underline"
                >
                  WhatsApp de Soporte
                </a>
              </p>
            </div>
          </div>
        </main>

        <footer className="text-center text-[10px] text-slate-400 py-2 z-10">
          © 2026 Interfast Internet. Todos los derechos reservados.
        </footer>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VISTA 2: PORTAL DEL CLIENTE LOGUEADO
  // -------------------------------------------------------------
  const { client, activeBill, invoicesHistory, tickets, recentPayments } = clientData || {};

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24 sm:pb-12 relative overflow-x-hidden">
      {/* Glow ambient background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-96 bg-gradient-to-b from-cyan-500/10 via-emerald-500/5 to-transparent blur-[100px] pointer-events-none" />

      {/* Header Móvil */}
      <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-4 py-3.5 sm:px-6">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-0.5 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Wifi size={17} className="text-cyan-400" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent leading-none">
                INTERFAST
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {localStorage.getItem('portal_multiple_accounts') && (
              <button
                onClick={() => {
                  setToken('');
                  setMultipleAccounts(JSON.parse(localStorage.getItem('portal_multiple_accounts')));
                  window.history.pushState(null, '', '#select');
                }}
                title="Mis otros servicios"
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 transition-all text-[10px] sm:text-xs font-medium flex items-center gap-1.5"
              >
                Cuentas
              </button>
            )}
            <button
              onClick={handleInstallClick}
              title="Instalar App en Celular"
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 hover:bg-cyan-500/15 transition-all text-xs font-medium flex items-center gap-1.5"
            >
              <Smartphone size={16} />
              <span className="hidden sm:inline">Instalar App</span>
            </button>
            <button
              onClick={handleLogout}
              title="Cerrar Sesión"
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-rose-400 hover:bg-rose-500/15 transition-all"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-xl mx-auto px-4 sm:px-6 pt-3 space-y-3">
        
        {/* Card 1: Tarjeta de Servicio del Cliente */}
        <section className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800/90 rounded-3xl p-4 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Servicio Activo
            </span>
            <span className="text-xs font-mono text-cyan-400 font-bold">
              {client?.plan?.megas || 30} MEGAS
            </span>
          </div>

          <h2 className="text-lg font-black text-white leading-snug">{client?.name}</h2>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">DNI: {client?.dni} • {client?.city || 'San Martín, Mendoza'}</p>
          
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex justify-between items-center text-sm">
            <span className="text-slate-400">Plan Contratado:</span>
            <span className="font-bold text-slate-200">{client?.plan?.name || 'PLAN HOGAR'}</span>
          </div>
        </section>

        {/* Card 2: HERO CARD - Estado de Facturación y Pagos */}
        <section className="relative">
          {activeBill ? (
            <div className="bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-900/90 border-2 border-cyan-500/30 rounded-3xl p-4 sm:p-5 shadow-[0_0_30px_rgba(6,182,212,0.15)] relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] sm:text-sm font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Clock size={14} /> 
                  {activeBill.multiplePending ? 'Múltiples Facturas' : `Factura Período ${activeBill.invoices[0].period}`}
                </span>
                <span className="px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] sm:text-xs font-bold">
                  Pendiente
                </span>
              </div>

              <div className="mb-3">
                <div className="text-xs sm:text-sm font-medium text-slate-400 uppercase tracking-wider mb-1">
                  Total adeudado hoy:
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 font-mono tracking-tight">
                    ${activeBill.totalAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                  <button
                    onClick={() => handleCopyAmount(activeBill.totalAmount)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all text-xs flex items-center gap-1"
                    title="Copiar monto exacto"
                  >
                    {copiedAmount ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Copy size={16} />}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {activeBill.multiplePending ? (
                    <span className="text-amber-400 font-semibold">
                      ⚠️ Registras {activeBill.invoices.length} facturas impagas. Este es el total acumulado.
                    </span>
                  ) : (
                    activeBill.invoices[0].activeTier === 'V1' ? (
                      <span className="text-emerald-400 font-semibold">
                        ✓ Tarifa Base Vencimiento 1 (Hasta el día 10 inclusive)
                      </span>
                    ) : (
                      <span className="text-amber-400 font-semibold">
                        ⚠️ Tarifa actualizada con recargo por vencimiento ({activeBill.invoices[0].activeTier})
                      </span>
                    )
                  )}
                </p>
              </div>

              {/* Botones de Acción Inmediata */}
              <div className="space-y-2.5">
                {/* Aviso Múltiple (Si aplica) */}
                {activeBill.multiplePending && (
                  <div className="w-full py-4 px-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold text-sm text-center">
                    <p className="mb-1 uppercase tracking-wider font-bold">Múltiples Facturas</p>
                    <p className="text-slate-400 text-xs">Realizá una transferencia por el total, o abona cada mes desde el listado de abajo.</p>
                  </div>
                )}

                {/* 2. Botón Transferencia / Alias */}
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                  <div className="text-left">
                    <span className="text-xs uppercase font-bold text-slate-400 block tracking-wider">
                      Alias Transferencia (Sin Comisión)
                    </span>
                    <span className="text-base font-black font-mono text-cyan-300">INTERFASTSM</span>
                  </div>
                  <a
                    href={getMercadoPagoHref()}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      navigator.clipboard.writeText('INTERFASTSM');
                      setCopiedAlias(true);
                      setTimeout(() => setCopiedAlias(false), 2000);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-bold text-xs hover:bg-cyan-500/25 transition-all flex items-center gap-1.5"
                  >
                    {copiedAlias ? (
                      <>
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        <span>¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copiar Alias</span>
                      </>
                    )}
                  </a>
                </div>

                {/* 3. Botón Informar Transferencia / Descargar PDF */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setTicketCategory('Aviso de Pago');
                      setTicketDescription(`Informo pago de $${activeBill.totalAmount} mediante transferencia.`);
                      setTicketModal(true);
                    }}
                    className="w-full py-2.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Send size={14} />
                    <span>Informar Pago</span>
                  </button>
                  {activeBill.singlePdfUrl && (
                    <a
                      href={activeBill.singlePdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
                    >
                      <Download size={14} />
                      <span>Descargar PDF</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-emerald-950/30 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 text-center shadow-lg">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 mb-3 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
                <CheckCircle2 size={30} />
              </div>
              <h3 className="text-2xl font-black text-white">¡Estás al día!</h3>
              <p className="text-sm text-slate-400 mt-2">
                No registras facturas pendientes de pago en este momento. ¡Muchas gracias por tu puntualidad!
              </p>
            </div>
          )}
        </section>

        {/* Card 3: Accesos Rápidos (Soporte Técnico / Reclamos) */}
        <section className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setConnectionTestModal(true);
              handleRunConnectionTest();
            }}
            className="p-3 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/30 hover:border-indigo-400/50 transition-all text-left group shadow-sm flex flex-col justify-between"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Activity size={16} />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Reclamo Técnico</span>
              <span className="text-[10px] text-slate-400 leading-tight">Diagnóstico Automático</span>
            </div>
          </button>

          <a
            href="whatsapp://send?phone=5492634513933"
            className="p-3 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/30 hover:border-emerald-400/50 transition-all text-left group shadow-sm flex flex-col justify-between"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <PhoneCall size={16} />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">WhatsApp Directo</span>
              <span className="text-[10px] text-slate-400 leading-tight">Atención personalizada</span>
            </div>
          </a>
        </section>

        {/* Card 4: Historial de Facturación */}
        <section className="bg-slate-900/50 rounded-3xl p-4 border border-slate-800 mb-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
            <FileText size={18} className="text-cyan-400" />
            Historial de Facturación
          </h3>

          <div className="space-y-2.5">
            {invoicesHistory && invoicesHistory.length > 0 ? (
              invoicesHistory.map((inv) => (
                <div
                  key={inv.id}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-200 block">Período {inv.period}</span>
                    <span className="text-[11px] font-mono text-slate-400">
                      ${(inv.totalAmount || inv.amount)?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        inv.status === 'PAID'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {inv.status === 'PAID' ? 'PAGADA' : 'PENDIENTE'}
                    </span>
                    {inv.status === 'PENDING' && (
                      <a
                        href={getMercadoPagoHref()}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handlePayTransfer(inv.totalAmount || inv.amount)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 transition-all font-bold text-xs inline-block text-center cursor-pointer"
                      >
                        Pagar
                      </a>
                    )}
                    <a
                      href={inv.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg bg-slate-900 text-cyan-400 hover:bg-slate-800 border border-slate-800 transition-all"
                      title="Descargar PDF"
                    >
                      <Download size={16} />
                    </a>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">No hay facturas registradas aún.</p>
            )}
          </div>
        </section>

        {/* Card 5: Mis Reclamos / Tickets Registrados */}
        {tickets && tickets.length > 0 && (
          <section className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <MessageSquare size={16} className="text-indigo-400" />
              Mis Reclamos Recientes
            </h3>

            <div className="space-y-2.5">
              {tickets.map((t) => (
                <div key={t.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-200 truncate max-w-[200px]">{t.title}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        t.status === 'CLOSED' || t.status === 'RESOLVED'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-indigo-500/15 text-indigo-400'
                      }`}
                    >
                      {t.status === 'CLOSED' || t.status === 'RESOLVED' ? 'SOLUCIONADO' : 'EN REVISIÓN'}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] line-clamp-2">{t.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>

      {/* MODAL: Nuevo Reclamo Técnico */}
      {ticketModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-slideUp">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <MessageSquare className="text-indigo-400" size={20} />
                Nuevo Reclamo Técnico
              </h3>
              <button
                onClick={() => setTicketModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Tipo de Inconveniente
                </label>
                <select
                  value={ticketCategory}
                  onChange={(e) => setTicketCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-400 focus:outline-none"
                >
                  <option value="Sin Señal">🔴 Sin Conexión a Internet</option>
                  <option value="Lentitud">🟡 Internet Lento / Microcortes</option>
                  <option value="Aviso de Pago">💸 Informar Pago / Transferencia</option>
                  <option value="Facturación">💳 Consulta de Facturación</option>
                  <option value="Cambio de Domicilio">🏠 Solicitud de Traslado</option>
                  <option value="Otro">💬 Otra Consulta</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Detalle del Problema
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Por favor, describe qué luces tiene el módem o qué sucede con tu conexión..."
                  value={ticketDescription}
                  onChange={(e) => setTicketDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:border-indigo-400 focus:outline-none resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTicketModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={ticketStatus === 'loading'}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white text-xs font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all flex items-center justify-center gap-2"
                >
                  {ticketStatus === 'loading' ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Enviar Reclamo</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PRUEBA DE CONEXIÓN */}
      {connectionTestModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-700">
            <div className="bg-slate-800/50 px-5 py-4 border-b border-slate-700 flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Activity className="text-emerald-400" size={20} />
                Prueba de Conexión
              </h3>
              <button
                onClick={() => {
                  setConnectionTestModal(false);
                  setConnectionTestStatus('idle');
                }}
                className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-700 transition-colors"
                disabled={connectionTestStatus.startsWith('testing_')}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5">
              {connectionTestStatus === 'idle' && (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200 text-sm flex gap-3">
                    <AlertTriangle size={24} className="shrink-0 text-amber-400" />
                    <p>Asegúrate de estar <strong>conectado a la red WiFi de tu casa</strong> (y no usar datos móviles) antes de ejecutar esta prueba.</p>
                  </div>
                  <button
                    onClick={handleRunConnectionTest}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    <Play size={18} />
                    Iniciar Diagnóstico
                  </button>
                </div>
              )}

              {connectionTestStatus.startsWith('testing_') && (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Wifi size={24} className="text-emerald-500 animate-pulse" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-lg mb-1">Comprobando sistema</h4>
                    <p className="text-slate-400 text-sm">
                      {connectionTestStatus === 'testing_antenna' && 'Conectando con antena exterior...'}
                      {connectionTestStatus === 'testing_router' && 'Verificando router interno...'}
                      {connectionTestStatus === 'testing_signal' && 'Midiendo niveles de señal...'}
                      {connectionTestStatus.startsWith('testing_') && 'Esto puede tomar hasta 15 segundos'}
                    </p>
                  </div>
                </div>
              )}

              {connectionTestStatus === 'success' && connectionTestResult && (
                <div className="py-4 space-y-4">
                  <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 size={32} className="text-emerald-400" />
                  </div>
                  <h4 className="text-white font-bold text-center text-lg">Conexión Excelente</h4>
                  <p className="text-slate-300 text-sm text-center">Tus equipos están operando de forma óptima.</p>
                  <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/50 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-400">Antena:</span><span className="text-emerald-400 font-mono">EN LÍNEA</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Router WiFi:</span><span className="text-emerald-400 font-mono">CONECTADO</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Señal TX/RX:</span><span className="text-cyan-400 font-mono">{connectionTestResult.signal || 'N/A'}</span></div>
                  </div>
                  <button
                    onClick={() => {
                      setConnectionTestModal(false);
                      setTicketModal(true);
                    }}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all text-sm mt-2"
                  >
                    Tengo otra consulta (Abrir Ticket)
                  </button>
                </div>
              )}

              {connectionTestStatus === 'error' && connectionTestResult && (
                <div className="py-4 space-y-4">
                  <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <AlertTriangle size={32} className="text-rose-400" />
                  </div>
                  <h4 className="text-white font-bold text-center text-lg">Problema Detectado</h4>
                  <p className="text-slate-300 text-sm text-center">{connectionTestResult.error || 'No pudimos completar el diagnóstico.'}</p>
                  {connectionTestResult.troubleshooting && (
                    <div className="bg-rose-900/30 p-3 rounded-xl border border-rose-500/30">
                      <h5 className="text-rose-300 font-bold text-xs mb-1 uppercase tracking-wider">¿Qué puedo hacer?</h5>
                      <p className="text-rose-200 text-sm">{connectionTestResult.troubleshooting}</p>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setConnectionTestModal(false);
                      setTicketModal(true);
                      setTicketCategory('Problema Tecnico');
                    }}
                    className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all text-sm mt-2"
                  >
                    Abrir Ticket Manualmente
                  </button>
                </div>
              )}

              {connectionTestStatus === 'offline' && (
                <div className="py-4 space-y-4">
                  <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <WifiOff size={32} className="text-rose-400" />
                  </div>
                  <h4 className="text-white font-bold text-center text-lg">Sin Conexión a Internet</h4>
                  
                  <div className="bg-rose-900/30 p-3 rounded-xl border border-rose-500/30">
                    <p className="text-rose-200 text-sm leading-relaxed">
                      ⚠️ No detectamos salida a internet en tu red Wi-Fi. <strong>Desactiva el Wi-Fi de tu teléfono para usar tus datos móviles</strong> y presiona el botón de abajo para enviar el reporte técnico.
                    </p>
                  </div>
                  
                  <button
                    onClick={handleRunConnectionTest}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm mt-2"
                  >
                    <Activity size={18} />
                    Reintentar Diagnóstico con Datos Móviles
                  </button>

                  <a
                    href={`https://wa.me/5492634513933?text=${encodeURIComponent(`Hola soporte, me quedé sin conexión en mi domicilio. Cliente: ${connectionTestResult?.clientName || ''}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all text-sm mt-2 flex items-center justify-center gap-2"
                  >
                    Reportar por WhatsApp
                  </a>
                </div>
              )}

              {connectionTestStatus === 'support_ticket_created' && connectionTestResult && (
                <div className="py-4 space-y-4">
                  <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <AlertTriangle size={32} className="text-amber-400" />
                  </div>
                  <h4 className="text-white font-bold text-center text-lg">Ticket Generado Automáticamente</h4>
                  <p className="text-slate-300 text-sm text-center">Hemos detectado una anomalía que requiere intervención técnica. Un ticket de soporte ha sido abierto a tu nombre.</p>
                  
                  <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/50 space-y-2 text-sm mt-4">
                    <div className="flex justify-between"><span className="text-slate-400">Falla detectada:</span><span className="text-amber-400 font-mono text-right">{connectionTestResult.error}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Nº Ticket:</span><span className="text-white font-bold">#{connectionTestResult.ticketId || 'N/A'}</span></div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setConnectionTestModal(false);
                      setConnectionTestStatus('idle');
                    }}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all mt-4"
                  >
                    Entendido
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
