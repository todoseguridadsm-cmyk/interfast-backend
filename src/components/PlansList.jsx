import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Wifi, Server, Trash2, Edit2 } from 'lucide-react';

export default function PlansList() {
  const [plans, setPlans] = useState([]);
  const [formData, setFormData] = useState({ name: '', megas: '', basePrice: '' });
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
    setFormData({ name: plan.name, megas: plan.megas, basePrice: plan.basePrice });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', megas: '', basePrice: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        megas: parseInt(formData.megas),
        basePrice: parseFloat(formData.basePrice)
      };
      
      if (editingId) {
        await axios.put(`https://interfast-backend-95ww.onrender.com/api/plans/${editingId}`, payload);
      } else {
        await axios.post('https://interfast-backend-95ww.onrender.com/api/plans', payload);
      }
      
      setFormData({ name: '', megas: '', basePrice: '' });
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
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Precio Base (Sin IVA)</label>
              <div className="relative">
                <span className="absolute left-4 top-2.5 text-slate-400 font-medium">$</span>
                <input 
                  type="number" required step="0.01"
                  value={formData.basePrice} onChange={e => setFormData({...formData, basePrice: e.target.value})}
                  className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="10000"
                />
              </div>
              {formData.basePrice && (
                <p className="text-xs text-slate-500 mt-2">
                  Total estimado: ${(parseFloat(formData.basePrice) * 1.21).toFixed(2)}
                </p>
              )}
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
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-right">Precio Base</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-right text-slate-400">IVA (21%)</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-right text-blue-600">Total Final</th>
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
                      <td className="px-6 py-4 text-right text-slate-600 font-medium">
                        ${plan.basePrice.toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400 text-sm">
                        + ${plan.ivaAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">
                        ${plan.totalPrice.toLocaleString(undefined, {minimumFractionDigits: 2})}
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
