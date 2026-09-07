import { useState } from 'react';
import axios from 'axios';
import { 
  Shield, 
  Lock, 
  Unlock, 
  User, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Cpu, 
  Zap, 
  AlertCircle, 
  Loader2, 
  Sparkles,
  CheckCircle2
} from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null); // 'user' | 'pass' | null

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post('https://interfast-backend-95ww.onrender.com/api/auth/login', { username, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      // Breve animación de éxito
      setTimeout(() => {
        window.location.href = '/';
      }, 400);
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.error || 'Error de autenticación: Credenciales no válidas.');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden bg-[#030712] select-none font-sans">
      
      {/* Background Cyber Wallpaper */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-105"
        style={{ backgroundImage: 'url("/login-bg.jpg")' }}
      />

      {/* Cyber Dark Glass & Scanline Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-[#030712]/70 to-[#030712]/50 backdrop-blur-[2px]" />
      <div className="absolute inset-0 bg-[radial-gradient(#00f0ff_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.06] pointer-events-none" />

      {/* Ambient Pulsing Glow Orbs */}
      <div className="absolute top-1/4 left-10 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />

      {/* Main Glassmorphic Cyber Login Card */}
      <div className="relative z-10 w-full max-w-md bg-[#050d1d]/85 backdrop-blur-2xl border border-cyan-500/40 rounded-3xl p-7 md:p-9 shadow-[0_0_60px_rgba(6,182,212,0.25)] transition-all duration-300 hover:shadow-[0_0_80px_rgba(6,182,212,0.35)]">
        
        {/* Animated Cyber Lock Top Badge */}
        <div className="flex justify-center mb-6 relative">
          <div className="relative">
            {/* Glowing Rings */}
            <div className={`absolute -inset-2 rounded-2xl blur-md opacity-75 transition-all duration-500 ${
              focusedField === 'user'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 opacity-90'
                : focusedField === 'pass'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 opacity-90'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600'
            }`} />

            <div className="relative p-4 bg-[#071329] border border-cyan-400/60 rounded-2xl shadow-xl flex items-center justify-center">
              {loading ? (
                <Loader2 size={36} className="text-cyan-400 animate-spin" />
              ) : focusedField === 'pass' ? (
                <KeyRound size={36} className="text-cyan-400 animate-bounce" />
              ) : focusedField === 'user' ? (
                <User size={36} className="text-amber-400 animate-pulse" />
              ) : (
                <Lock size={36} className="text-cyan-400" />
              )}
            </div>
          </div>
        </div>

        {/* Branding & Titles */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 mb-2">
            <Cpu size={12} className="text-cyan-400" />
            <span className="text-[10px] uppercase font-black tracking-widest text-cyan-300">
              INTERFASTSM • NETWORK ACCESS
            </span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">
            Acceso al Sistema
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Portal Seguro de Gestión & Telecomunicaciones
          </p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="bg-red-950/80 border border-red-500/60 text-red-200 px-4 py-3 rounded-2xl text-xs font-semibold mb-6 text-center flex items-center justify-center gap-2 animate-in fade-in zoom-in duration-200 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
          
          {/* Campo Usuario */}
          <div>
            <label className="block text-xs font-bold text-cyan-200 uppercase tracking-wider mb-1.5 ml-1 flex items-center gap-1.5">
              <User size={12} className={focusedField === 'user' ? 'text-amber-400' : 'text-slate-400'} />
              <span>Usuario</span>
            </label>
            <div className="relative group">
              <User className={`absolute left-4 top-3.5 transition-colors duration-300 ${
                focusedField === 'user' ? 'text-amber-400' : 'text-slate-500'
              }`} size={18} />
              <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)}
                onFocus={() => setFocusedField('user')}
                onBlur={() => setFocusedField(null)}
                className={`w-full pl-11 pr-4 py-3 bg-[#030816] border rounded-2xl outline-none transition-all duration-300 text-sm font-medium text-white placeholder-slate-600 ${
                  focusedField === 'user'
                    ? 'border-amber-400/80 ring-2 ring-amber-400/20 shadow-[0_0_20px_rgba(245,158,11,0.2)] bg-[#050e24]'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
                placeholder="Ingresa tu usuario..."
                autoComplete="off"
                data-lpignore="true"
                spellCheck="false"
                required 
              />
            </div>
          </div>

          {/* Campo Contraseña */}
          <div>
            <label className="block text-xs font-bold text-cyan-200 uppercase tracking-wider mb-1.5 ml-1 flex items-center gap-1.5">
              <Lock size={12} className={focusedField === 'pass' ? 'text-cyan-400' : 'text-slate-400'} />
              <span>Contraseña de Acceso</span>
            </label>
            <div className="relative group">
              <Lock className={`absolute left-4 top-3.5 transition-colors duration-300 ${
                focusedField === 'pass' ? 'text-cyan-400' : 'text-slate-500'
              }`} size={18} />
              <input 
                type={showPassword ? 'text' : 'password'}
                value={password} 
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocusedField('pass')}
                onBlur={() => setFocusedField(null)}
                className={`w-full pl-11 pr-12 py-3 bg-[#030816] border rounded-2xl outline-none transition-all duration-300 text-sm font-medium text-white placeholder-slate-600 ${
                  focusedField === 'pass'
                    ? 'border-cyan-400/80 ring-2 ring-cyan-400/20 shadow-[0_0_20px_rgba(6,182,212,0.2)] bg-[#050e24]'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
                placeholder="••••••••••••"
                autoComplete="new-password"
                data-lpignore="true"
                required 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3.5 text-slate-500 hover:text-cyan-300 transition-colors cursor-pointer"
                title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Botón de Ingreso con Brillo y Efecto Neon */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-6 py-3.5 px-6 bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-2xl text-sm uppercase tracking-wider transition-all duration-300 shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:shadow-[0_0_40px_rgba(6,182,212,0.9)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin text-slate-950" />
                <span>Verificando Credenciales...</span>
              </>
            ) : (
              <>
                <Zap size={18} className="text-slate-950" />
                <span>Ingresar al Sistema</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Seguridad */}
        <div className="mt-8 pt-5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
            <Shield size={13} /> Encriptación JWT 256-bit
          </span>
          <span className="text-slate-500">v2.5 Interfast</span>
        </div>
      </div>
    </div>
  );
}
