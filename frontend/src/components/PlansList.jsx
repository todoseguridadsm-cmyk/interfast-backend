import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Wifi, Server, Trash2, Edit2, Zap, ShieldCheck, Calendar, DollarSign, ArrowRight } from 'lucide-react';

export default function PlansList() {
  const [plans, setPlans] = useState([]);
  const [formData, setFormData] = useState({ 
    name: '', megas: '', 
    priceV1: '', dueDate1: 10,
    priceV2: '', dueDate2: 15,
    priceV3: '', dueDate3: 20,
    priceV4: '', dueDate4: 22
  });
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const fetchPlans = async () => {
    try {
      const res = await axios.get('https://interfast-backend-95ww.onrender.com/api/plans');
      setPlans(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este plan de la matriz de red?')) return;
    try {
      await axios.delete(`https://interfast-backend-95ww.onrender.com/api/plans/${id}`);
      fetchPlans();
    } catch (error) {
      console.error(error);
      alert('Error al eliminar');
    }
  };

  const handleEdit = (plan) => {
    setEditingId(plan.id);
    setFormData({ 
      name: plan.name || '', 
      megas: plan.megas || '', 
      priceV1: plan.priceV1 ?? plan.totalPrice ?? '', dueDate1: plan.dueDate1 || 10,
      priceV2: plan.priceV2 ?? plan.totalPrice ?? '', dueDate2: plan.dueDate2 || 15,
      priceV3: plan.priceV3 ?? plan.totalPrice ?? '', dueDate3: plan.dueDate3 || 20,
      priceV4: plan.priceV4 ?? plan.totalPrice ?? '', dueDate4: plan.dueDate4 || 22
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ 
      name: '', megas: '', 
      priceV1: '', dueDate1: 10,
      priceV2: '', dueDate2: 15,
      priceV3: '', dueDate3: 20,
      priceV4: '', dueDate4: 22
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        megas: parseInt(formData.megas) || 0,
        priceV1: parseFloat(formData.priceV1) || 0,
        dueDate1: parseInt(formData.dueDate1) || 10,
        priceV2: parseFloat(formData.priceV2) || 0,
        dueDate2: parseInt(formData.dueDate2) || 15,
        priceV3: parseFloat(formData.priceV3) || 0,
        dueDate3: parseInt(formData.dueDate3) || 20,
        priceV4: parseFloat(formData.priceV4) || 0,
        dueDate4: parseInt(formData.dueDate4) || 22
      };
      
      if (editingId) {
        await axios.put(`https://interfast-backend-95ww.onrender.com/api/plans/${editingId}`, payload);
      } else {
        await axios.post('https://interfast-backend-95ww.onrender.com/api/plans', payload);
      }
      
      setFormData({ name: '', megas: '', priceV1: '', dueDate1: 10, priceV2: '', dueDate2: 15, priceV3: '', dueDate3: 20, priceV4: '', dueDate4: 22 });
      setEditingId(null);
      fetchPlans();
    } catch (error) {
      console.error(error);
      alert('Error al guardar el plan');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-100">
      {/* HEADER FUTURISTA */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0a152e] via-[#0d1e3d] to-[#091124] border border-cyan-500/30 p-6 md:p-8 shadow-[0_0_35px_rgba(6,182,212,0.15)]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-mono uppercase tracking-widest mb-3">
              <Zap size={14} className="animate-pulse text-cyan-400" />
              Bandwidth & Tariff Matrix Engine
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <Wifi className="text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]" size={36} />
              Gestión de Planes de Red
            </h2>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Configuración de perfiles de velocidad simétrica/asimétrica y matriz tarifaria con escalonamiento de 4 vencimientos y discriminación tributaria de IVA (21%).
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-4 py-3 rounded-2xl border border-cyan-500/30">
            <Server className="text-cyan-400" size={24} />
            <div>
              <p className="text-xs font-mono text-slate-400 uppercase">Perfiles Activos</p>
              <p className="text-xl font-bold text-white tracking-wider">{plans.length} <span className="text-xs font-normal text-cyan-400">Planes</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL: FORMULARIO + TABLA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Formulario de Alta / Edición */}
        <div className="relative bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-cyan-500/30 p-6 flex-shrink-0 h-fit hover:border-cyan-500/50 transition-all">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-cyan-500/20">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus size={20} className="text-cyan-400" />
              {editingId ? 'Editar Perfil de Plan' : 'Registrar Nuevo Plan'}
            </h3>
            {editingId && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                MODO EDICIÓN
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-cyan-300 mb-1.5">Nombre del Plan</label>
              <input 
                type="text" required
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-sm transition-all"
                placeholder="Ej. Fibra Óptica 100M Ultra"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-cyan-300 mb-1.5">Velocidad de Enlace</label>
              <div className="relative">
                <input 
                  type="number" required
                  value={formData.megas} onChange={e => setFormData({...formData, megas: e.target.value})}
                  className="w-full pl-4 pr-16 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-sm font-mono transition-all"
                  placeholder="300"
                />
                <span className="absolute right-3.5 top-2.5 text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                  Mbps
                </span>
              </div>
            </div>

            {/* Escalonamiento de Vencimientos */}
            <div className="border-t border-slate-800 pt-4 mt-2">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Calendar size={14} className="text-cyan-400" />
                  Escala de Vencimientos (Con IVA)
                </h4>
                <span className="text-[10px] font-mono text-slate-400">IVA 21% DISCRIMINADO</span>
              </div>
              
              <div className="space-y-2.5">
                {/* Vencimiento 1 */}
                <div className="grid grid-cols-2 gap-2.5 bg-slate-950/60 p-3 rounded-xl border border-cyan-500/20 hover:border-cyan-500/40 transition-colors">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-1">VTO 1 (Día)</label>
                    <input type="number" min="1" max="31" required value={formData.dueDate1} onChange={e => setFormData({...formData, dueDate1: e.target.value})} className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:border-cyan-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-cyan-300 mb-1">Precio Total</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs">$</span>
                      <input type="number" required step="0.01" value={formData.priceV1} onChange={e => setFormData({...formData, priceV1: e.target.value})} className="w-full pl-6 pr-2 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-emerald-400 font-mono font-bold focus:border-cyan-400 focus:outline-none" placeholder="15000" />
                    </div>
                  </div>
                </div>

                {/* Vencimiento 2 */}
                <div className="grid grid-cols-2 gap-2.5 bg-slate-950/60 p-3 rounded-xl border border-cyan-500/20 hover:border-cyan-500/40 transition-colors">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-1">VTO 2 (Día)</label>
                    <input type="number" min="1" max="31" required value={formData.dueDate2} onChange={e => setFormData({...formData, dueDate2: e.target.value})} className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:border-cyan-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-cyan-300 mb-1">Precio Total</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs">$</span>
                      <input type="number" required step="0.01" value={formData.priceV2} onChange={e => setFormData({...formData, priceV2: e.target.value})} className="w-full pl-6 pr-2 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-emerald-400 font-mono font-bold focus:border-cyan-400 focus:outline-none" placeholder="16500" />
                    </div>
                  </div>
                </div>

                {/* Vencimiento 3 */}
                <div className="grid grid-cols-2 gap-2.5 bg-slate-950/60 p-3 rounded-xl border border-cyan-500/20 hover:border-cyan-500/40 transition-colors">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-1">VTO 3 (Día)</label>
                    <input type="number" min="1" max="31" required value={formData.dueDate3} onChange={e => setFormData({...formData, dueDate3: e.target.value})} className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:border-cyan-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-cyan-300 mb-1">Precio Total</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs">$</span>
                      <input type="number" required step="0.01" value={formData.priceV3} onChange={e => setFormData({...formData, priceV3: e.target.value})} className="w-full pl-6 pr-2 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-emerald-400 font-mono font-bold focus:border-cyan-400 focus:outline-none" placeholder="18000" />
                    </div>
                  </div>
                </div>

                {/* Vencimiento 4 */}
                <div className="grid grid-cols-2 gap-2.5 bg-slate-950/60 p-3 rounded-xl border border-cyan-500/20 hover:border-cyan-500/40 transition-colors">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-1">VTO 4 (Día)</label>
                    <input type="number" min="1" max="31" required value={formData.dueDate4} onChange={e => setFormData({...formData, dueDate4: e.target.value})} className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:border-cyan-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-cyan-300 mb-1">Precio Total</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs">$</span>
                      <input type="number" required step="0.01" value={formData.priceV4} onChange={e => setFormData({...formData, priceV4: e.target.value})} className="w-full pl-6 pr-2 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-emerald-400 font-mono font-bold focus:border-cyan-400 focus:outline-none" placeholder="19500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2.5 pt-3">
              {editingId && (
                <button type="button" onClick={cancelEdit} disabled={loading} className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 px-4 rounded-xl transition-colors text-xs font-mono uppercase tracking-wider border border-slate-700">
                  Cancelar
                </button>
              )}
              <button 
                type="submit" disabled={loading}
                className={`${editingId ? 'w-2/3' : 'w-full'} bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold py-2.5 px-4 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all flex justify-center items-center gap-2 text-xs font-mono uppercase tracking-wider disabled:opacity-50`}
              >
                {loading ? 'Guardando en Matriz...' : (editingId ? 'Actualizar Plan' : 'Guardar en Red')}
              </button>
            </div>
          </form>
        </div>

        {/* Tabla / Matriz de Planes Guardados */}
        <div className="lg:col-span-2 bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-cyan-500/30 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-cyan-500/20 bg-slate-950/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server size={18} className="text-cyan-400" />
              <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold">Matriz de Tarifas Activas</span>
            </div>
            <span className="text-[11px] font-mono text-cyan-400/80 bg-cyan-950/40 border border-cyan-500/20 px-2.5 py-0.5 rounded-full">
              Sincronizado con Mikrotik
            </span>
          </div>

          <div className="overflow-x-auto no-scrollbar flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 text-cyan-300 text-xs font-mono border-b border-cyan-500/20">
                  <th className="px-5 py-3.5 uppercase tracking-wider">Plan / Perfil</th>
                  <th className="px-4 py-3.5 uppercase tracking-wider text-right">VTO 1</th>
                  <th className="px-4 py-3.5 uppercase tracking-wider text-right">VTO 2</th>
                  <th className="px-4 py-3.5 uppercase tracking-wider text-right">VTO 3</th>
                  <th className="px-4 py-3.5 uppercase tracking-wider text-right">VTO 4</th>
                  <th className="px-4 py-3.5 uppercase tracking-wider text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {plans.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-16 text-center text-slate-500">
                      <Server className="mx-auto mb-3 opacity-30 text-cyan-400 animate-pulse" size={48} />
                      <p className="font-mono text-sm text-slate-400">No hay planes registrados en la matriz de red.</p>
                      <p className="text-xs text-slate-600 mt-1">Utilice el panel lateral para registrar el primer plan.</p>
                    </td>
                  </tr>
                ) : (
                  plans.map(plan => (
                    <tr key={plan.id} className="hover:bg-cyan-500/5 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400 font-bold group-hover:scale-105 transition-transform">
                            <Wifi size={18} />
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm tracking-wide group-hover:text-cyan-300 transition-colors">{plan.name}</p>
                            <span className="inline-block mt-0.5 px-2 py-0.5 bg-blue-950/60 border border-blue-500/30 text-blue-300 text-[10px] font-mono rounded">
                              {plan.megas} Mbps Ancho de Banda
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-xs whitespace-nowrap">
                        <span className="text-[10px] text-slate-500 block">Día {plan.dueDate1 || 10}</span>
                        <span className="text-emerald-400 font-bold">${(plan.priceV1 || plan.totalPrice || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-xs whitespace-nowrap">
                        <span className="text-[10px] text-slate-500 block">Día {plan.dueDate2 || 15}</span>
                        <span className="text-emerald-400/90 font-bold">${(plan.priceV2 || plan.totalPrice || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-xs whitespace-nowrap">
                        <span className="text-[10px] text-slate-500 block">Día {plan.dueDate3 || 20}</span>
                        <span className="text-amber-400/90 font-bold">${(plan.priceV3 || plan.totalPrice || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-xs whitespace-nowrap">
                        <span className="text-[10px] text-slate-500 block">Día {plan.dueDate4 || 22}</span>
                        <span className="text-rose-400/90 font-bold">${(plan.priceV4 || plan.totalPrice || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                      </td>
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            onClick={() => handleEdit(plan)} 
                            className="p-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:border-cyan-400 transition-all" 
                            title="Editar plan"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button 
                            onClick={() => handleDelete(plan.id)} 
                            className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:border-rose-400 transition-all" 
                            title="Eliminar plan"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

