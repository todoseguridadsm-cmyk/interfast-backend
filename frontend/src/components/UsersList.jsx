import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  UserPlus, 
  Edit3, 
  Trash2, 
  KeyRound, 
  UserCheck, 
  Lock, 
  Radio, 
  Sparkles, 
  CheckCircle2, 
  X, 
  Cpu, 
  Terminal,
  Activity,
  User
} from 'lucide-react';

const AVATAR_MAP = {
  victor: { src: '/avatars/victor.jpg', label: 'Victor' },
  humberto: { src: '/avatars/humberto.jpg', label: 'Humberto' },
  matias: { src: '/avatars/matias.jpg', label: 'Matias Brandi' },
  tkip: { src: '/avatars/matias.jpg', label: 'Matias Brandi (tkip)' },
  admin: { src: '/avatars/matias.jpg', label: 'Matias Brandi' },
};

const getAvatar = (username) => {
  if (!username) return null;
  const u = username.toLowerCase().trim();
  if (AVATAR_MAP[u]) return AVATAR_MAP[u];
  if (u.includes('victor')) return AVATAR_MAP.victor;
  if (u.includes('humberto')) return AVATAR_MAP.humberto;
  if (u.includes('matias') || u.includes('tkip') || u.includes('brandi')) return AVATAR_MAP.matias;
  return null;
};

const AVAILABLE_PERMS = [
  { key: 'CLIENTES', label: 'Clientes & Altas', desc: 'Acceso a padrón de clientes y altas web' },
  { key: 'FACTURACION', label: 'Facturación', desc: 'Gestión de facturas y cobranzas' },
  { key: 'CAJA', label: 'Caja & Arqueo', desc: 'Punto de venta y cierre diario' },
  { key: 'SOPORTE', label: 'Soporte Técnico', desc: 'Tickets y reclamos de clientes' },
  { key: 'CORTES', label: 'Cortes & Reconexiones', desc: 'Gestión de cortes masivos en Mikrotik' },
  { key: 'BAJAS', label: 'Bajas & Retiros', desc: 'Solicitudes y retiros de antena' },
  { key: 'INFRAESTRUCTURA', label: 'Nodos & Red', desc: 'Acceso a nodos y routers' },
  { key: 'REPORTES', label: 'Reportes & Pagos', desc: 'Pagos no reconocidos y auditoría' }
];

export default function UsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [selectedUserForPassword, setSelectedUserForPassword] = useState(null);
  
  const [form, setForm] = useState({ username: '', password: '', role: 'STAFF', permissions: [] });

  const fetchUsers = async () => {
    try {
      const res = await axios.get('https://interfast-backend-95ww.onrender.com/api/users', { 
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}`} 
      });
      setUsers(res.data);
    } catch(err) {
      console.error(err);
      alert('Error cargando usuarios o acceso denegado');
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const togglePermission = (perm) => {
    if (form.permissions.includes(perm)) {
      setForm({ ...form, permissions: form.permissions.filter(p => p !== perm) });
    } else {
      setForm({ ...form, permissions: [...form.permissions, perm] });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { 
        ...form, 
        permissions: form.role === 'ADMIN' ? ['ALL'] : form.permissions 
      };
      
      if (editingId) {
        await axios.put(`https://interfast-backend-95ww.onrender.com/api/users/${editingId}`, payload, { 
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}`} 
        });
      } else {
        await axios.post('https://interfast-backend-95ww.onrender.com/api/users', payload, { 
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}`} 
        });
      }
      
      setShowModal(false);
      setEditingId(null);
      fetchUsers();
    } catch(err) {
      alert(err.response?.data?.error || 'Error al guardar');
    }
    setLoading(false);
  };

  const handleDelete = async (id, username) => {
    if (username === 'tkip') {
      alert('¡Acción Bloqueada! No puedes eliminar la cuenta raíz maestra.');
      return;
    }
    if(window.confirm(`¿Estás 100% seguro de dar de baja al operador "${username.toUpperCase()}"?\nPerderá el acceso de inmediato a la red Interfast.`)) {
      try {
         await axios.delete(`https://interfast-backend-95ww.onrender.com/api/users/${id}`, { 
           headers: { Authorization: `Bearer ${localStorage.getItem('token')}`} 
         });
         fetchUsers();
      } catch(err) {
         alert(err.response?.data?.error || 'Error al eliminar');
      }
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if(newPassword.length < 4) return alert('La contraseña debe tener al menos 4 caracteres');
    setLoading(true);
    try {
      await axios.put(`https://interfast-backend-95ww.onrender.com/api/users/${selectedUserForPassword.id}/password`, { 
        password: newPassword 
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}`} });
      alert('¡Contraseña de seguridad actualizada exitosamente!');
      setShowPasswordModal(false);
      setSelectedUserForPassword(null);
      setNewPassword('');
    } catch(err) {
      alert(err.response?.data?.error || 'Error al cambiar contraseña');
    }
    setLoading(false);
  };

  const adminsCount = users.filter(u => u.role === 'ADMIN').length;
  const staffCount = users.filter(u => u.role === 'STAFF').length;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* Futuristic Cyber Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#050b18] via-[#08152e] to-[#040814] border border-cyan-500/30 p-6 md:p-8 shadow-[0_0_35px_rgba(6,182,212,0.15)]">
        {/* Glow accents */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="relative p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              <ShieldCheck size={36} className="drop-shadow-[0_0_8px_#00f0ff]" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-semibold tracking-wider uppercase">
                  SECURITY OPS // IAM
                </span>
                <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                  <Activity size={12} className="text-emerald-400 animate-pulse" /> SISTEMA ACTIVO
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-wide mt-1">
                Control de <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Empleados & Accesos</span>
              </h1>
              <p className="text-slate-400 text-xs md:text-sm mt-1 max-w-xl">
                Gestión centralizada de credenciales, roles jerárquicos y permisos granulares de operadores en la red Interfast.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => { 
                setEditingId(null);
                setForm({ username: '', password: '', role: 'STAFF', permissions: [] }); 
                setShowModal(true); 
              }}
              className="group relative px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all duration-200 flex items-center gap-2 hover:scale-[1.02] active:scale-95"
            >
              <UserPlus size={18} className="group-hover:rotate-12 transition-transform" />
              <span>Nuevo Operador</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 backdrop-blur-sm">
            <div className="text-[10px] font-mono uppercase text-slate-400">Total Operadores</div>
            <div className="text-xl font-black text-white mt-0.5">{users.length}</div>
          </div>
          <div className="bg-slate-900/60 border border-cyan-500/20 rounded-xl p-3 backdrop-blur-sm">
            <div className="text-[10px] font-mono uppercase text-cyan-400">Administradores</div>
            <div className="text-xl font-black text-cyan-300 mt-0.5">{adminsCount}</div>
          </div>
          <div className="bg-slate-900/60 border border-indigo-500/20 rounded-xl p-3 backdrop-blur-sm">
            <div className="text-[10px] font-mono uppercase text-indigo-400">Operadores Staff</div>
            <div className="text-xl font-black text-indigo-300 mt-0.5">{staffCount}</div>
          </div>
          <div className="bg-slate-900/60 border border-emerald-500/20 rounded-xl p-3 backdrop-blur-sm">
            <div className="text-[10px] font-mono uppercase text-emerald-400">Protocolo Cripto</div>
            <div className="text-xs font-mono font-bold text-emerald-300 mt-1 flex items-center gap-1.5">
              <Lock size={12} /> BCRYPT / JWT
            </div>
          </div>
        </div>
      </div>

      {/* Cyber Employee Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map(u => {
          let perms = [];
          try { 
            perms = typeof u.permissions === 'string' ? JSON.parse(u.permissions) : (u.permissions || []);
          } catch(e){}

          const avatarInfo = getAvatar(u.username);
          const isAdmin = u.role === 'ADMIN';

          return (
            <div 
              key={u.id}
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#070e1e] to-[#040812] border transition-all duration-300 hover:translate-y-[-2px] shadow-lg flex flex-col justify-between ${
                isAdmin 
                  ? 'border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:border-cyan-400' 
                  : 'border-slate-800/80 hover:border-indigo-500/40 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]'
              }`}
            >
              {/* Background ambient lighting */}
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none ${
                isAdmin ? 'bg-cyan-500/10' : 'bg-indigo-500/10'
              }`} />

              <div className="p-6 relative z-10">
                {/* Header Card: Avatar + Name + Role */}
                <div className="flex items-start gap-4">
                  {/* Avatar Frame with Cyber Hex / Round Glow */}
                  <div className="relative group">
                    <div className={`w-20 h-20 rounded-2xl p-1 bg-gradient-to-br transition-all duration-300 ${
                      isAdmin 
                        ? 'from-cyan-400 via-blue-500 to-indigo-600 shadow-[0_0_15px_rgba(6,182,212,0.4)]' 
                        : 'from-indigo-500 via-purple-500 to-slate-700 shadow-[0_0_12px_rgba(99,102,241,0.3)]'
                    }`}>
                      {avatarInfo ? (
                        <img 
                          src={avatarInfo.src} 
                          alt={u.username} 
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        <div className="w-full h-full rounded-xl bg-slate-900 flex items-center justify-center text-slate-300 font-black text-2xl uppercase">
                          {u.username.charAt(0)}
                        </div>
                      )}
                    </div>
                    {/* Live indicator dot */}
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#070e1e] shadow-[0_0_8px_#10b981] flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                    </span>
                  </div>

                  {/* Identity text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${
                        isAdmin 
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.3)]' 
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      }`}>
                        {isAdmin ? 'ADMINISTRADOR' : 'OPERADOR STAFF'}
                      </span>
                    </div>

                    <h3 className="text-lg font-black text-white capitalize truncate mt-1">
                      {avatarInfo ? avatarInfo.label : u.username}
                    </h3>

                    <p className="text-xs font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <Terminal size={12} className="text-cyan-400" /> @{u.username}
                    </p>

                    <p className="text-[10px] text-slate-500 font-mono mt-1">
                      Alta: {new Date(u.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Permissions matrix section */}
                <div className="mt-5 pt-4 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2.5">
                    <span>Módulos de Acceso</span>
                    {isAdmin && <span className="text-cyan-400 font-bold">TOTAL ROOT</span>}
                  </div>

                  {isAdmin ? (
                    <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center gap-2 text-xs font-semibold text-cyan-300">
                      <ShieldCheck size={16} className="text-cyan-400" />
                      <span>Control Total sobre toda la Red e Infraestructura</span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 min-h-[52px]">
                      {perms && perms.length > 0 ? (
                        perms.map(p => (
                          <span 
                            key={p} 
                            className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700/60 flex items-center gap-1"
                          >
                            <CheckCircle2 size={10} className="text-emerald-400" />
                            {p}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 italic py-1">
                          Solo acceso básico a Dashboard
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="p-3 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between gap-2 relative z-10">
                <button 
                  onClick={() => {
                    setSelectedUserForPassword(u);
                    setNewPassword('');
                    setShowPasswordModal(true);
                  }}
                  className="flex-1 py-2 px-2.5 rounded-xl bg-slate-900/90 hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 transition-all text-xs font-semibold flex items-center justify-center gap-1.5"
                  title="Cambiar Contraseña"
                >
                  <KeyRound size={14} className="text-amber-400" />
                  <span>Clave</span>
                </button>

                <button 
                  onClick={() => {
                    setEditingId(u.id);
                    setForm({ 
                      username: u.username, 
                      password: '', 
                      role: u.role, 
                      permissions: perms 
                    });
                    setShowModal(true);
                  }}
                  className="flex-1 py-2 px-2.5 rounded-xl bg-slate-900/90 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/40 transition-all text-xs font-semibold flex items-center justify-center gap-1.5"
                  title="Modificar Permisos"
                >
                  <Edit3 size={14} className="text-cyan-400" />
                  <span>Permisos</span>
                </button>

                <button 
                  onClick={() => handleDelete(u.id, u.username)}
                  className={`py-2 px-3 rounded-xl border transition-all text-xs font-semibold flex items-center justify-center ${
                    u.username === 'tkip' 
                      ? 'bg-slate-900/40 text-slate-700 border-slate-900 cursor-not-allowed' 
                      : 'bg-slate-900/90 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border-slate-800 hover:border-rose-500/40'
                  }`}
                  title={u.username === 'tkip' ? 'Cuenta Raíz Protegida' : 'Dar de Baja'}
                  disabled={u.username === 'tkip'}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cyber Modal: Crear / Editar Usuario */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-gradient-to-b from-[#081226] via-[#050b18] to-[#040814] border border-cyan-500/30 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full max-w-lg max-h-[90vh] overflow-y-auto no-scrollbar relative">
            
            {/* Modal Header */}
            <div className="p-6 pb-4 border-b border-slate-800/80 flex justify-between items-center sticky top-0 bg-[#081226]/90 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="font-black text-lg text-white">
                    {editingId ? 'Modificar Credencial & Permisos' : 'Registrar Nuevo Operador'}
                  </h3>
                  <p className="text-xs text-slate-400">Control de Acceso e Identidad IAM</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)} 
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-5">
              
              {/* Username Input */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-2">
                  Usuario / Login ID
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    required 
                    value={form.username} 
                    disabled={!!editingId} 
                    onChange={e=>setForm({...form, username: e.target.value.toLowerCase().replace(/\s+/g, '')})} 
                    className={`w-full px-4 py-3 rounded-xl bg-slate-900/90 border text-slate-100 placeholder-slate-500 outline-none text-sm transition-all ${
                      editingId 
                        ? 'border-slate-800 bg-slate-950 text-slate-500 cursor-not-allowed' 
                        : 'border-slate-700 focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                    }`}
                    placeholder="ej: victor / humberto / matias" 
                  />
                  {getAvatar(form.username) && (
                    <div className="absolute right-3 top-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-[10px] font-mono text-cyan-300">
                      <Sparkles size={10} className="text-cyan-400" />
                      Avatar detectado: {getAvatar(form.username).label}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Initial Password (only for new users) */}
              {!editingId && (
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-2">
                    Contraseña Inicial de Acceso
                  </label>
                  <input 
                    type="text" 
                    required 
                    value={form.password} 
                    onChange={e=>setForm({...form, password: e.target.value})} 
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(6,182,212,0.2)] text-slate-100 placeholder-slate-500 outline-none text-sm" 
                    placeholder="Contraseña segura"
                  />
                </div>
              )}

              {/* Role Selector */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-2">
                  Nivel de Privilegio (Rol)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({...form, role: 'STAFF'})}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      form.role === 'STAFF'
                        ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <User size={14} /> OPERADOR STAFF
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">Permisos restringidos y granulares</div>
                  </button>

                  <button
                    type="button"
                    disabled={editingId && form.username === 'tkip'}
                    onClick={() => setForm({...form, role: 'ADMIN'})}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      form.role === 'ADMIN'
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <ShieldCheck size={14} /> ADMINISTRADOR
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">Control total e irrestricto</div>
                  </button>
                </div>
              </div>

              {/* Granular Permissions (Only for STAFF) */}
              {form.role === 'STAFF' && (
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono uppercase tracking-wider text-slate-300">
                      Módulos Permitidos (Permisos)
                    </label>
                    <span className="text-[10px] text-cyan-400 font-mono">
                      {form.permissions.length} seleccionados
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {AVAILABLE_PERMS.map(p => {
                      const isChecked = form.permissions.includes(p.key);
                      return (
                        <label 
                          key={p.key} 
                          onClick={() => togglePermission(p.key)}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all select-none ${
                            isChecked 
                              ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300' 
                              : 'bg-slate-900/40 border-slate-800/60 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <input 
                            type="checkbox" 
                            checked={isChecked} 
                            onChange={() => {}} 
                            className="mt-0.5 rounded text-cyan-500 focus:ring-cyan-500" 
                          />
                          <div>
                            <div className="text-xs font-bold">{p.label}</div>
                            <div className="text-[10px] text-slate-500 leading-tight">{p.desc}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-800/80">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white bg-slate-900/80 border border-slate-800 text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all flex items-center gap-2"
                >
                  <ShieldCheck size={16} />
                  <span>{editingId ? 'Actualizar Credencial' : 'Crear Operador'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cyber Modal: Restablecer Contraseña */}
      {showPasswordModal && selectedUserForPassword && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-gradient-to-b from-[#081226] via-[#050b18] to-[#040814] border border-amber-500/30 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full max-w-sm overflow-hidden">
            
            <div className="p-6 pb-4 border-b border-slate-800/80 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <KeyRound size={20} />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">Restablecer Clave</h3>
                  <p className="text-xs text-amber-400 font-mono">@{selectedUserForPassword.username}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPasswordModal(false)} 
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-2">
                  Nueva Contraseña
                </label>
                <input 
                  type="text" 
                  required 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-amber-400 focus:shadow-[0_0_15px_rgba(245,158,11,0.2)] text-slate-100 placeholder-slate-500 outline-none text-sm" 
                  placeholder="ej: Interfast2026*" 
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800/80">
                <button 
                  type="button" 
                  onClick={() => setShowPasswordModal(false)} 
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-900/80 border border-slate-800 text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xs font-bold shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all flex items-center gap-1.5"
                >
                  <KeyRound size={14} />
                  <span>Actualizar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

