import { useState } from 'react';
import axios from 'axios';
import { Shield, Lock, User } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post('https://interfast-backend-95ww.onrender.com/api/auth/login', { username, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      window.location.href = '/';
    } catch(err) {
      setError(err.response?.data?.error || 'Error de sistema remoto en autenticación.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorators */}
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-50"></div>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl w-full max-w-md p-8 border border-white relative z-10">
        <div className="flex justify-center mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl text-white shadow-lg shadow-blue-200">
            <Shield size={48} strokeWidth={1.5} />
          </div>
        </div>
        
        <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-600 text-center mb-2 tracking-tight">tkip.net</h2>
        <p className="text-slate-500 text-center mb-8 font-medium">Panel de Gestión de Red</p>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-semibold mb-6 text-center border border-red-100 flex items-center justify-center gap-2">
            <Lock size={16} /> {error}
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Usuario</label>
            <div className="relative group">
              <User className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
              <input type="text" 
                value={username} onChange={e=>setUsername(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition-all font-medium text-slate-800 placeholder-slate-400" 
                placeholder="Nombre de usuario"
                required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Contraseña de Acceso</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
              <input type="password" 
                value={password} onChange={e=>setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition-all font-medium text-slate-800 placeholder-slate-400" 
                placeholder="••••••••"
                required />
            </div>
          </div>
          
          <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-blue-600/30 transition-all hover:-translate-y-0.5 active:translate-y-0 mt-8">
            Ingresar al Sistema
          </button>
        </form>
        
        <div className="mt-8 text-center border-t border-slate-100 pt-6">
          <p className="text-xs text-slate-400 font-medium tracking-wide">Desarrollado con seguridad militar JWT</p>
        </div>
      </div>
    </div>
  );
}
