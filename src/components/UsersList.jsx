import { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, ShieldAlert, UserPlus } from 'lucide-react';

export default function UsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  const [form, setForm] = useState({ username: '', password: '', role: 'STAFF', permissions: [] });

  const fetchUsers = async () => {
    try {
      const res = await axios.get('https://interfast-backend-95ww.onrender.com/api/users');
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
      await axios.post('https://interfast-backend-95ww.onrender.com/api/users', { 
        ...form, 
        permissions: form.role === 'ADMIN' ? ['ALL'] : form.permissions 
      });
      setShowModal(false);
      fetchUsers();
    } catch(err) {
      alert(err.response?.data?.error || 'Error al guardar');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <ShieldAlert className="text-blue-600" size={32} />
            Control de Empleados
          </h2>
          <p className="text-slate-500 mt-1 ml-11">Gestión de roles y permisos de acceso para cajeros o técnicos.</p>
        </div>
        <button 
          onClick={() => { setForm({ username: '', password: '', role: 'STAFF', permissions: [] }); setShowModal(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-medium shadow-sm transition-colors flex items-center gap-2"
        >
          <UserPlus size={18} /> Nuevo Usuario
        </button>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">Usuario</th>
              <th className="px-6 py-4 font-semibold">Rol</th>
              <th className="px-6 py-4 font-semibold">Módulos Extra Permitidos</th>
              <th className="px-6 py-4 font-semibold text-center">Alta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {users.map(u => {
              let perms = [];
              try { perms = JSON.parse(u.permissions); } catch(e){}
              return (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-bold text-slate-800 capitalize">{u.username}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${u.role==='ADMIN' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>{u.role}</span>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-500">
                    {u.role === 'ADMIN' ? 'Control Total de la App' : perms.join(', ') || 'Sin permisos extendidos'}
                  </td>
                  <td className="px-6 py-4 text-center text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><Shield size={18} className="text-blue-600" /> Crear Cuenta</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre de Usuario (Login ID)</label>
                <input type="text" required value={form.username} onChange={e=>setForm({...form, username: e.target.value.toLowerCase()})} className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="ej: luis" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Contraseña</label>
                <input type="text" required value={form.password} onChange={e=>setForm({...form, password: e.target.value})} className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Rol Jerárquico</label>
                <select value={form.role} onChange={e=>setForm({...form, role: e.target.value})} className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer">
                  <option value="STAFF">Empleado Restringido (STAFF)</option>
                  <option value="ADMIN">Gerente Total (ADMIN)</option>
                </select>
              </div>

              {form.role === 'STAFF' && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <label className="block text-sm font-bold text-slate-700 mb-3">Permisos de Acceso al Menú</label>
                  <div className="space-y-3">
                    {['CLIENTES', 'FACTURACION', 'PLANES', 'REPORTES', 'CAJA', 'SOPORTE'].map(p => (
                      <label key={p} className="flex items-center gap-3 cursor-pointer text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                        <input type="checkbox" checked={form.permissions.includes(p)} onChange={()=>togglePermission(p)} className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer" />
                        Puede abrir el módulo <span className="font-bold">{p}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-3 italic">*El Dashboard principal (Home) siempre está visible, pero las acciones dependen del permiso específico.</p>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-500 font-medium hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-md shadow-blue-200 transition-all">Guardar Empleado</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
