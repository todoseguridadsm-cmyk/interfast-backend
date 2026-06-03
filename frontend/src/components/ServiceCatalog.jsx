import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShoppingBag, Map, Plus, Save, Trash2, Edit2, Check, X, AlertCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://interfast-backend-95ww.onrender.com/api';

export default function ServiceCatalog() {
  const [activeTab, setActiveTab] = useState('CATALOG'); // CATALOG | COVERAGE
  
  // Catalog State
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({ name: '', category: 'EQUIPO', price: '', description: '', isActive: true });

  // Coverage State
  const [mapUrl, setMapUrl] = useState('');
  const [polygons, setPolygons] = useState('');
  const [loadingSettings, setLoadingSettings] = useState(false);

  useEffect(() => {
    fetchItems();
    fetchSettings();
  }, []);

  const fetchItems = async () => {
    setLoadingItems(true);
    try {
      const res = await axios.get(`${API_URL}/catalog`);
      setItems(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoadingItems(false);
  };

  const fetchSettings = async () => {
    setLoadingSettings(true);
    try {
      const urlRes = await axios.get(`${API_URL}/settings/MY_MAPS_URL`);
      setMapUrl(urlRes.data.value || '');
      const polyRes = await axios.get(`${API_URL}/settings/COVERAGE_POLYGONS`);
      setPolygons(polyRes.data.value || '');
    } catch (err) {
      console.error(err);
    }
    setLoadingSettings(false);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await axios.put(`${API_URL}/catalog/${editingItem.id}`, itemForm);
      } else {
        await axios.post(`${API_URL}/catalog`, itemForm);
      }
      setShowItemForm(false);
      setEditingItem(null);
      setItemForm({ name: '', category: 'EQUIPO', price: '', description: '', isActive: true });
      fetchItems();
    } catch (err) {
      console.error(err);
      alert('Error al guardar ítem');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('¿Eliminar este ítem del catálogo?')) return;
    try {
      await axios.delete(`${API_URL}/catalog/${id}`);
      fetchItems();
    } catch (err) {
      console.error(err);
      alert('Error al eliminar');
    }
  };

  const handleSaveSettings = async () => {
    setLoadingSettings(true);
    try {
      await axios.post(`${API_URL}/settings`, { key: 'MY_MAPS_URL', value: mapUrl });
      await axios.post(`${API_URL}/settings`, { key: 'COVERAGE_POLYGONS', value: polygons });
      alert('Configuraciones de mapa guardadas correctamente.');
    } catch (err) {
      console.error(err);
      alert('Error al guardar configuraciones');
    }
    setLoadingSettings(false);
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <ShoppingBag className="text-blue-600" size={32} />
            Venta de Servicios
          </h2>
          <p className="text-slate-500 mt-1">Configura el catálogo de precios y la zona de cobertura para el bot.</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden w-fit">
        <button
          onClick={() => setActiveTab('CATALOG')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold transition-colors ${activeTab === 'CATALOG' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <ShoppingBag size={18} /> Catálogo de Precios
        </button>
        <button
          onClick={() => setActiveTab('COVERAGE')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold transition-colors ${activeTab === 'COVERAGE' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <Map size={18} /> Cobertura y Mapa
        </button>
      </div>

      {/* Tab: CATALOG */}
      {activeTab === 'CATALOG' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800 text-lg">Artículos y Servicios</h3>
            <button 
              onClick={() => { setEditingItem(null); setItemForm({ name: '', category: 'EQUIPO', price: '', description: '', isActive: true }); setShowItemForm(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium shadow-sm flex items-center gap-2 transition-colors"
            >
              <Plus size={18} /> Nuevo Artículo
            </button>
          </div>
          
          <div className="p-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="p-4 font-semibold">Nombre</th>
                  <th className="p-4 font-semibold">Categoría</th>
                  <th className="p-4 font-semibold">Precio</th>
                  <th className="p-4 font-semibold text-center">Estado</th>
                  <th className="p-4 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 && !loadingItems ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-500">No hay artículos en el catálogo. ¡Agrega uno!</td>
                  </tr>
                ) : (
                  items.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{item.name}</div>
                        <div className="text-xs text-slate-500 truncate max-w-xs">{item.description}</div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-semibold uppercase">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-blue-600">
                        ${item.price.toLocaleString(undefined, {minimumFractionDigits:2})}
                      </td>
                      <td className="p-4 text-center">
                        {item.isActive ? (
                          <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full text-xs font-bold">Activo</span>
                        ) : (
                          <span className="text-slate-400 bg-slate-100 px-2 py-1 rounded-full text-xs font-bold">Inactivo</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button onClick={() => { setEditingItem(item); setItemForm(item); setShowItemForm(true); }} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors ml-1">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal form for Catalog */}
      {showItemForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-xl text-slate-800">{editingItem ? 'Editar Artículo' : 'Nuevo Artículo'}</h3>
              <button onClick={() => setShowItemForm(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleSaveItem} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre del producto/servicio</label>
                <input required type="text" value={itemForm.name} onChange={e=>setItemForm({...itemForm, name: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-blue-500" placeholder="Ej: Router TP-Link" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Categoría</label>
                  <select value={itemForm.category} onChange={e=>setItemForm({...itemForm, category: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-blue-500 bg-white">
                    <option value="EQUIPO">Equipo / Hardware</option>
                    <option value="INSTALACION">Costo Instalación</option>
                    <option value="PROMOCION">Promoción (Descuento)</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Precio ($)</label>
                  <input required type="number" step="0.01" value={itemForm.price} onChange={e=>setItemForm({...itemForm, price: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-blue-500" placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Descripción corta (opcional)</label>
                <input type="text" value={itemForm.description} onChange={e=>setItemForm({...itemForm, description: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-blue-500" placeholder="Ej: Router doble banda 5GHz..." />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" checked={itemForm.isActive} onChange={e=>setItemForm({...itemForm, isActive: e.target.checked})} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-700 cursor-pointer">Artículo Activo (Visible para el Bot)</label>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={()=>setShowItemForm(false)} className="flex-1 px-4 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab: COVERAGE */}
      {activeTab === 'COVERAGE' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
            <div>
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <Map className="text-emerald-500" /> Configuración de Cobertura
              </h3>
              <p className="text-sm text-slate-500 mt-1">Integra tu mapa de Google My Maps y las coordenadas para que n8n sepa dónde hay servicio.</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Enlace iframe de Google My Maps</label>
                <input 
                  type="text" 
                  value={mapUrl} 
                  onChange={e => setMapUrl(e.target.value)} 
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-emerald-500 font-mono text-sm" 
                  placeholder='<iframe src="https://www.google.com/maps/d/embed?mid=..." width="640" height="480"></iframe>' 
                />
                <p className="text-xs text-slate-500 mt-1">Pega aquí el código HTML completo que te da My Maps para "Insertar en mi sitio".</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Coordenadas del Polígono (JSON) para n8n</label>
                <textarea 
                  rows="6"
                  value={polygons} 
                  onChange={e => setPolygons(e.target.value)} 
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-emerald-500 font-mono text-xs" 
                  placeholder='[ { "lat": -33.0, "lng": -68.0 }, ... ]' 
                />
                <p className="text-xs text-slate-500 mt-1">La API pasará exactamente este texto a n8n para calcular si el pin del cliente cae adentro.</p>
              </div>
              
              <button 
                onClick={handleSaveSettings} disabled={loadingSettings}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm transition-colors flex items-center justify-center gap-2 w-full"
              >
                <Save size={18} /> {loadingSettings ? 'Guardando...' : 'Guardar Configuración'}
              </button>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl shadow-inner border border-slate-200 p-2 overflow-hidden h-[500px] flex items-center justify-center relative">
             {mapUrl && mapUrl.includes('<iframe') ? (
               <div className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:rounded-xl" dangerouslySetInnerHTML={{ __html: mapUrl }} />
             ) : (
               <div className="text-center text-slate-400 flex flex-col items-center">
                 <Map size={48} className="mb-2 opacity-50" />
                 <p className="font-medium">El mapa aparecerá aquí</p>
                 <p className="text-xs mt-1">Pega el iframe de Google My Maps a la izquierda</p>
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
}
