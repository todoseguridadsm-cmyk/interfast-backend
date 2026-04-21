import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Wifi, Server, Trash2, Edit2 } from 'lucide-react';

export default function PlansList() {
  const [plans, setPlans] = useState([]);
  const [formData, setFormData] = useState({ 
    name: '', megas: '', 
    priceV1: '', dueDate1: 10,
    priceV2: '', dueDate2: 15,
    priceV3: '', dueDate3: 20
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
    if (!window.confirm('¿Estás seguro de eliminar este plan?')) return;
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
      priceV3: plan.priceV3 ?? plan.totalPrice ?? '', dueDate3: plan.dueDate3 || 20
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ 
      name: '', megas: '', 
      priceV1: '', dueDate1: 10,
      priceV2: '', dueDate2: 15,
      priceV3: '', dueDate3: 20
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
        dueDate3: parseInt(formData.dueDate3) || 20
      };
      
      if (editingId) {
        await axios.put(`https://interfast-backend-95ww.onrender.com/api/plans/${editingId}`, payload);
      } else {
        await axios.post('https://interfast-backend-95ww.onrender.com/api/plans', payload);
      }
      
      setFormData({ name: '', megas: '', priceV1: '', dueDate1: 10, priceV2: '', dueDate2: 15, priceV3: '', dueDate3: 20 });
      setEditingId(null);
      fetchPlans();
    } catch (error) {
      console.error(error);
      alert('Error al guardar el plan');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
          <Wifi className="text-blue-600" size={32} />
          Gestión de Planes
        </h2>
        <p className="text-slate-500 mt-1">Configura las tarifas de tu red con discriminación automática de IVA (21%).</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Formulario de Alta */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex-shrink-0 h-fit">
          <h3 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Plus size={20} className="text-blue-600" />
            {editingId ? 'Editar Plan' : 'Nuevo Plan'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Plan</label>
              <input 
                type="text" required
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej. Fibra Óptica Residencial"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Velocidad (Megas)</label>
              <div className="relative">
                <input 
                  type="number" required
                  value={formData.megas} onChange={e => setFormData({...formData, megas: e.target.value})}
                  className="w-full pl-4 pr-12 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="300"
                />
                <span className="absolute right-4 top-2.5 text-slate-400 text-sm font-medium">Mbps</span>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4 mt-2">
              <h4 className="text-sm font-semibold text-slate-800 mb-3">Configuración de Vencimientos</h4>
              
              <div className="grid grid-cols-2 gap-3 mb-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Vencimiento 1 (Día)</label>
                  <input type="number" min="1" max="31" required value={formData.dueDate1} onChange={e => setFormData({...formData, dueDate1: e.target.value})} className="w-full px-2 py-1.5 text-sm bg-white border border-slate-200 rounded focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Precio Total (Con IVA)</label>
                  <div className="relative"><span className="absolute left-2 top-1.5 text-slate-400 text-sm font-medium">$</span><input type="number" required step="0.01" value={formData.priceV1} onChange={e => setFormData({...formData, priceV1: e.target.value})} className="w-full pl-6 pr-2 py-1.5 text-sm bg-white border border-slate-200 rounded focus:border-blue-500" placeholder="15000" /></div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Vencimiento 2 (Día)</label>
                  <input type="number" min="1" max="31" required value={formData.dueDate2} onChange={e => setFormData({...formData, dueDate2: e.target.value})} className="w-full px-2 py-1.5 text-sm bg-white border border-slate-200 rounded focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Precio Total (Con IVA)</label>
                  <div className="relative"><span className="absolute left-2 top-1.5 text-slate-400 text-sm font-medium">$</span><input type="number" required step="0.01" value={formData.priceV2} onChange={e => setFormData({...formData, priceV2: e.target.value})} className="w-full pl-6 pr-2 py-1.5 text-sm bg-white border border-slate-200 rounded focus:border-blue-500" placeholder="16500" /></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Vencimiento 3 (Día)</label>
                  <input type="number" min="1" max="31" required value={formData.dueDate3} onChange={e => setFormData({...formData, dueDate3: e.target.value})} className="w-full px-2 py-1.5 text-sm bg-white border border-slate-200 rounded focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Precio Total (Con IVA)</label>
                  <div className="relative"><span className="absolute left-2 top-1.5 text-slate-400 text-sm font-medium">$</span><input type="number" required step="0.01" value={formData.priceV3} onChange={e => setFormData({...formData, priceV3: e.target.value})} className="w-full pl-6 pr-2 py-1.5 text-sm bg-white border border-slate-200 rounded focus:border-blue-500" placeholder="18000" /></div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 pt-2">
              {editingId && (
                <button type="button" onClick={cancelEdit} disabled={loading} className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 px-4 rounded-lg transition-colors">
                  Cancelar
                </button>
              )}
              <button 
                type="submit" disabled={loading}
                className={`${editingId ? 'w-2/3' : 'w-full'} bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex justify-center items-center gap-2`}
              >
                {loading ? 'Guardando...' : (editingId ? 'Actualizar' : 'Guardar Plan')}
              </button>
            </div>
          </form>
        </div>

        {/* Tabla de Planes Guardados */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100">
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider">Plan / Velocidad</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-right text-slate-500">Vencimiento 1</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-right text-slate-500">Vencimiento 2</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-right text-slate-500">Vencimiento 3</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {plans.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                      <Server className="mx-auto mb-3 opacity-20" size={48} />
                      No hay planes registrados todavía.
                    </td>
                  </tr>
                ) : (
                  plans.map(plan => (
                    <tr key={plan.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-800">{plan.name}</p>
                        <p className="text-sm text-slate-500">{plan.megas} Mbps</p>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-700 font-medium whitespace-nowrap">
                        <span className="text-xs text-slate-400 mr-2">Día {plan.dueDate1 || 10}:</span>
                        ${(plan.priceV1 || plan.totalPrice || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-700 font-medium whitespace-nowrap">
                        <span className="text-xs text-slate-400 mr-2">Día {plan.dueDate2 || 15}:</span>
                        ${(plan.priceV2 || plan.totalPrice || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-700 font-medium whitespace-nowrap">
                        <span className="text-xs text-slate-400 mr-2">Día {plan.dueDate3 || 20}:</span>
                        ${(plan.priceV3 || plan.totalPrice || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => handleEdit(plan)} className="text-blue-500 hover:text-blue-700 transition-colors p-2 rounded-lg hover:bg-blue-50 mr-2" title="Editar plan">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => handleDelete(plan.id)} className="text-red-500 hover:text-red-700 transition-colors p-2 rounded-lg hover:bg-red-50" title="Eliminar plan">
                          <Trash2 size={18} />
                        </button>
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
