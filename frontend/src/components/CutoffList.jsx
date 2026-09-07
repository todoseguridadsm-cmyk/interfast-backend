import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Scissors, Search, CheckCircle2, AlertCircle, RefreshCw, Zap, ShieldAlert, WifiOff, Wifi } from 'lucide-react';

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://interfast-backend-95ww.onrender.com';

export default function CutoffList() {
  const [cutoffs, setCutoffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCutoffs, setSelectedCutoffs] = useState([]);
  const [executing, setExecuting] = useState(false);

  const fetchCutoffs = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${backendUrl}/api/cutoffs`);
      if (Array.isArray(res.data)) {
        setCutoffs(res.data);
      } else {
        console.warn('La respuesta del backend no es un arreglo válido.');
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
    if (!window.confirm('¿Deseas generar la lista de morosos ahora mismo? Esto buscará facturas impagas y las agregará a la lista sin cortar el servicio aún.')) {
      return;
    }
    try {
      setLoading(true);
      const res = await axios.post(`${backendUrl}/api/cutoffs/force`);
      alert(res.data.message || 'Lista generada.');
      fetchCutoffs();
    } catch (error) {
      console.error(error);
      const errorMsg = error.response?.data?.error || error.response?.data?.details || error.message || 'Desconocido';
      alert('Error al generar la lista: ' + errorMsg);
      setLoading(false);
    }
  };

  const handleExecuteCutoffs = async () => {
    if (selectedCutoffs.length === 0) return;
    
    // Filtrar solo los que están PENDING para evitar recortes
    const pendingIdsToCut = selectedCutoffs.filter(id => {
      const c = cutoffs.find(cutoff => cutoff.id === id);
      return c && c.status === 'PENDING';
    });
    
    if (pendingIdsToCut.length === 0) {
      alert('Solo puedes ejecutar cortes sobre clientes que estén en estado "Pendiente".');
      return;
    }

    if (!window.confirm(`¿Estás seguro de que deseas ejecutar el corte de servicio en el Mikrotik para los ${pendingIdsToCut.length} clientes seleccionados?`)) {
      return;
    }
    try {
      setExecuting(true);
      const res = await axios.post(`${backendUrl}/api/cutoffs/execute`, { ids: pendingIdsToCut });
      alert(res.data.message || 'Cortes ejecutados.');
      setSelectedCutoffs([]);
      fetchCutoffs();
    } catch (error) {
      console.error(error);
      alert('Error al ejecutar los cortes.');
    } finally {
      setExecuting(false);
    }
  };

  const handleRestoreCutoffs = async () => {
    if (selectedCutoffs.length === 0) return;
    if (!window.confirm(`¿Estás seguro de que deseas RESTAURAR/LARGAR el servicio de Internet en el Mikrotik para los ${selectedCutoffs.length} clientes seleccionados?`)) {
      return;
    }
    try {
      setExecuting(true);
      const res = await axios.post(`${backendUrl}/api/cutoffs/restore`, { ids: selectedCutoffs });
      alert(res.data.message || 'Servicios restaurados.');
      setSelectedCutoffs([]);
      fetchCutoffs();
    } catch (error) {
      console.error(error);
      alert('Error al restaurar los servicios.');
    } finally {
      setExecuting(false);
    }
  };

  const filteredCutoffs = (Array.isArray(cutoffs) ? cutoffs : []).filter(c => {
    const s = searchTerm.toLowerCase();
    const name = c.client?.name?.toLowerCase() || '';
    const dni = c.client?.dni?.toLowerCase() || '';
    return name.includes(s) || dni.includes(s);
  });

  const pendingCount = cutoffs.filter(c => c.status === 'PENDING').length;
  const cutCount = cutoffs.filter(c => c.status === 'CUT' || c.client?.status === 'SUSPENDED').length;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* Cyber Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#050b18] via-[#1a0814] to-[#040814] border border-rose-500/30 p-6 md:p-8 shadow-[0_0_35px_rgba(244,63,94,0.15)]">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="relative p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
              <Scissors size={36} className="drop-shadow-[0_0_8px_#f43f5e]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/80 border border-rose-500/40 text-rose-300 font-semibold tracking-wider uppercase">
                  AUTOMATION OPS // MIKROTIK
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-wide mt-1">
                Cortes de <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-amber-400">Servicio & Mora</span>
              </h1>
              <p className="text-slate-400 text-xs md:text-sm mt-1 max-w-xl">
                Clientes identificados con facturas impagas desde el día 28. Sincronizado con n8n y RouterOS.
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-slate-900/80 border border-rose-500/30 text-center">
              <div className="text-[10px] font-mono text-rose-400 uppercase">Pendientes</div>
              <div className="text-lg font-black text-rose-300">{pendingCount}</div>
            </div>
            <div className="px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-center">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Cortados</div>
              <div className="text-lg font-black text-white">{cutCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="p-4 rounded-2xl bg-[#070e1e] border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
        <div className="flex flex-wrap items-center gap-2.5">
          <button 
            onClick={handleExecuteCutoffs}
            disabled={selectedCutoffs.length === 0 || executing}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedCutoffs.length > 0 && !executing
                ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)] hover:scale-105'
                : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
            }`}
          >
            <WifiOff size={14} />
            <span>{executing ? 'Ejecutando...' : `Ejecutar Corte (${selectedCutoffs.length})`}</span>
          </button>

          <button 
            onClick={handleRestoreCutoffs}
            disabled={selectedCutoffs.length === 0 || executing}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedCutoffs.length > 0 && !executing
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:scale-105'
                : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
            }`}
          >
            <Wifi size={14} />
            <span>{executing ? '...' : `Restaurar Servicio (${selectedCutoffs.length})`}</span>
          </button>

          <button 
            onClick={handleForceScan}
            className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
          >
            <RefreshCw size={13} />
            <span>Generar Lista Ahora</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Buscar cliente o DNI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-400 focus:shadow-[0_0_12px_rgba(244,63,94,0.2)] transition-all"
          />
        </div>
      </div>

      {/* Cyber Table */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-b from-[#070e1e] to-[#040812] border border-slate-800 shadow-xl">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase border-b border-slate-800">
              <tr>
                <th className="px-5 py-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    className="rounded bg-slate-900 border-slate-700 text-rose-500 focus:ring-rose-500"
                    onChange={(e) => {
                      if (e.target.checked) {
                        const selectableIds = filteredCutoffs
                          .filter(c => c.status === 'PENDING' || c.status === 'CUT')
                          .map(c => c.id);
                        setSelectedCutoffs(selectableIds);
                      } else {
                        setSelectedCutoffs([]);
                      }
                    }}
                    checked={
                      filteredCutoffs.length > 0 && 
                      selectedCutoffs.length === filteredCutoffs.filter(c => c.status === 'PENDING' || c.status === 'CUT').length &&
                      selectedCutoffs.length > 0
                    }
                  />
                </th>
                <th className="px-5 py-4">Cliente</th>
                <th className="px-5 py-4">DNI / CUIT</th>
                <th className="px-5 py-4">Factura</th>
                <th className="px-5 py-4">Estado en Red</th>
                <th className="px-5 py-4">Fecha Ingreso</th>
                <th className="px-5 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr><td colSpan="7" className="text-center py-12 text-slate-500 font-mono">Cargando lista de cortes...</td></tr>
              ) : filteredCutoffs.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-12 text-slate-500 font-mono">No hay clientes pendientes de corte en este momento.</td></tr>
              ) : (
                filteredCutoffs.map(cutoff => {
                  const isSuspended = cutoff.client?.status === 'SUSPENDED';
                  const isSelectable = cutoff.status === 'PENDING' || cutoff.status === 'CUT';
                  const isChecked = selectedCutoffs.includes(cutoff.id);

                  return (
                    <tr 
                      key={cutoff.id} 
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isChecked ? 'bg-rose-950/20' : ''
                      }`}
                    >
                      <td className="px-5 py-4 text-center">
                        {isSelectable && (
                          <input 
                            type="checkbox"
                            className="rounded bg-slate-900 border-slate-700 text-rose-500 focus:ring-rose-500"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCutoffs([...selectedCutoffs, cutoff.id]);
                              } else {
                                setSelectedCutoffs(selectedCutoffs.filter(id => id !== cutoff.id));
                              }
                            }}
                          />
                        )}
                      </td>
                      <td className="px-5 py-4 font-bold text-white capitalize">
                        {cutoff.client?.name || 'Desconocido'}
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-400">
                        {cutoff.client?.dni || '---'}
                      </td>
                      <td className="px-5 py-4 font-mono text-cyan-400">
                        #{cutoff.invoiceId}
                      </td>
                      <td className="px-5 py-4">
                        {cutoff.status === 'PENDING' ? (
                          isSuspended ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              <AlertCircle size={12} /> SERVICIO CORTADO
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              <Scissors size={12} /> PENDIENTE DE CORTE
                            </span>
                          )
                        ) : cutoff.status === 'CUT' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            <AlertCircle size={12} /> SERVICIO CORTADO
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            <CheckCircle2 size={12} /> RESUELTO
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-400">
                        {new Date(cutoff.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {cutoff.status === 'PENDING' && (
                          <button 
                            onClick={() => handleExempt(cutoff.id)}
                            className="text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 hover:border-cyan-400 hover:text-cyan-300 px-3 py-1.5 rounded-lg transition-colors font-semibold"
                          >
                            Eximir
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

