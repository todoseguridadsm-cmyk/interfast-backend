import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Scissors, Search, CheckCircle2, AlertCircle } from 'lucide-react';

const backendUrl = import.meta.env.VITE_BACKEND_URL || '';

export default function CutoffList() {
  const [cutoffs, setCutoffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCutoffs = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${backendUrl}/api/cutoffs`);
      if (Array.isArray(res.data)) {
        setCutoffs(res.data);
      } else {
        console.warn('La respuesta del backend no es un arreglo válido. Probablemente el servidor aún no actualizó las rutas.');
        setCutoffs([]);
      }
    } catch (error) {
      console.error('Error fetching cutoffs:', error);
      alert('Error al cargar la lista de cortes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCutoffs();
  }, []);

  const handleExempt = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eximir/eliminar manualmente a este cliente de la lista de cortes?')) {
      return;
    }
    try {
      await axios.post(`${backendUrl}/api/cutoffs/remove/${id}`);
      alert('Cliente eximido exitosamente.');
      fetchCutoffs();
    } catch (error) {
      console.error(error);
      alert('Error al intentar eximir al cliente.');
    }
  };

  const handleForceScan = async () => {
    if (!window.confirm('¿Deseas forzar el escaneo de morosos ahora mismo? Esto buscará facturas impagas y las agregará a la lista sin esperar al día 28.')) {
      return;
    }
    try {
      setLoading(true);
      const res = await axios.post(`${backendUrl}/api/cutoffs/force`);
      alert(res.data.message || 'Escaneo completado.');
      fetchCutoffs();
    } catch (error) {
      console.error(error);
      alert('Error al forzar el escaneo.');
      setLoading(false);
    }
  };

  const filteredCutoffs = (Array.isArray(cutoffs) ? cutoffs : []).filter(c => {
    const s = searchTerm.toLowerCase();
    const name = c.client?.name?.toLowerCase() || '';
    const dni = c.client?.dni?.toLowerCase() || '';
    return name.includes(s) || dni.includes(s);
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Scissors className="text-red-500" />
            Cortes de Servicio
          </h2>
          <p className="text-slate-500 mt-1">
            Clientes identificados con facturas impagas desde el día 28. (n8n consultará esta lista).
          </p>
        </div>
        <div className="flex flex-col md:flex-row gap-3">
          <button 
            onClick={handleForceScan}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          >
            Generar Lista Ahora
          </button>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nombre o DNI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full md:w-64 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-100">
            <tr>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">DNI</th>
              <th className="px-6 py-4">Factura ID</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4">Fecha de Ingreso</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan="6" className="text-center py-8 text-slate-400">Cargando datos...</td></tr>
            ) : filteredCutoffs.length === 0 ? (
              <tr><td colSpan="6" className="text-center py-8 text-slate-400">No hay clientes en la lista de cortes.</td></tr>
            ) : (
              filteredCutoffs.map(cutoff => (
                <tr key={cutoff.id} className={`hover:bg-slate-50 transition-colors ${cutoff.status === 'PENDING' ? 'bg-red-50/30' : 'bg-green-50/30'}`}>
                  <td className="px-6 py-4 font-medium text-slate-700">
                    {cutoff.client?.name || 'Desconocido'}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {cutoff.client?.dni}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    #{cutoff.invoiceId}
                  </td>
                  <td className="px-6 py-4">
                    {cutoff.status === 'PENDING' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        <AlertCircle size={14} /> Cortado / Pendiente
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <CheckCircle2 size={14} /> Resuelto
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {new Date(cutoff.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {cutoff.status === 'PENDING' && (
                      <button 
                        onClick={() => handleExempt(cutoff.id)}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-md transition-colors"
                      >
                        Eximir Manualmente
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
