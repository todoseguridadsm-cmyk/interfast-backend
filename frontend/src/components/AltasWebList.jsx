import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2, CheckCircle, Clock, Phone, User, MessageSquare, Globe, Bot, Sparkles, RefreshCw, MessageCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://interfast-backend-95ww.onrender.com/api';

export default function AltasWebList() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/leads`);
      setLeads(response.data);
    } catch (error) {
      console.error('Error fetching leads:', error);
      alert('Error al cargar las altas web');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.put(`${API_URL}/leads/${id}`, { status: newStatus });
      fetchLeads();
    } catch (error) {
      alert('Error al actualizar el estado');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este prospecto?')) return;
    try {
      await axios.delete(`${API_URL}/leads/${id}`);
      fetchLeads();
    } catch (error) {
      alert('Error al eliminar');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'NEW':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span> NUEVO
          </span>
        );
      case 'CONTACTED':
        return (
          <span className="inline-flex items-center gap-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold">
            CONTACTADO
          </span>
        );
      case 'CONVERTED':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold">
            <CheckCircle size={10} /> CONVERTIDO
          </span>
        );
      default:
        return <span className="bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold">{status}</span>;
    }
  };

  const newCount = leads.filter(l => l.status === 'NEW').length;
  const contactedCount = leads.filter(l => l.status === 'CONTACTED').length;
  const convertedCount = leads.filter(l => l.status === 'CONVERTED').length;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* Cyber Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#050b18] via-[#09152b] to-[#040814] border border-cyan-500/30 p-6 md:p-8 shadow-[0_0_35px_rgba(6,182,212,0.15)]">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="relative p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              <Bot size={36} className="drop-shadow-[0_0_8px_#00f0ff]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-semibold tracking-wider uppercase">
                  AI PIPELINE // N8N LANDING
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-wide mt-1">
                Altas Web <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">& Agente IA</span>
              </h1>
              <p className="text-slate-400 text-xs md:text-sm mt-1 max-w-xl">
                Gestiona los prospectos capturados por Sofi IA desde la Landing Page y campañas publicitarias.
              </p>
            </div>
          </div>

          <button 
            onClick={fetchLeads} 
            className="p-2.5 px-4 rounded-xl bg-slate-900/80 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/40 transition-all text-xs font-semibold flex items-center gap-2 shadow-inner"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-cyan-400' : ''} />
            <span>Actualizar Leads</span>
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 backdrop-blur-sm">
            <div className="text-[10px] font-mono uppercase text-slate-400">Total Leads</div>
            <div className="text-xl font-black text-white mt-0.5">{leads.length}</div>
          </div>
          <div className="bg-slate-900/60 border border-amber-500/20 rounded-xl p-3 backdrop-blur-sm">
            <div className="text-[10px] font-mono uppercase text-amber-400">Nuevos</div>
            <div className="text-xl font-black text-amber-300 mt-0.5">{newCount}</div>
          </div>
          <div className="bg-slate-900/60 border border-cyan-500/20 rounded-xl p-3 backdrop-blur-sm">
            <div className="text-[10px] font-mono uppercase text-cyan-400">Contactados</div>
            <div className="text-xl font-black text-cyan-300 mt-0.5">{contactedCount}</div>
          </div>
          <div className="bg-slate-900/60 border border-emerald-500/20 rounded-xl p-3 backdrop-blur-sm">
            <div className="text-[10px] font-mono uppercase text-emerald-400">Convertidos</div>
            <div className="text-xl font-black text-emerald-300 mt-0.5">{convertedCount}</div>
          </div>
        </div>
      </div>

      {/* Cyber Table */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-b from-[#070e1e] to-[#040812] border border-slate-800 shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-500 font-mono text-xs">Cargando prospectos...</div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-mono text-xs">No hay altas web registradas en la base de datos.</div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase border-b border-slate-800">
                <tr>
                  <th className="px-5 py-4">Prospecto</th>
                  <th className="px-5 py-4">Contacto Directo</th>
                  <th className="px-5 py-4">Mensaje / Consulta</th>
                  <th className="px-5 py-4">Fecha Captura</th>
                  <th className="px-5 py-4">Estado</th>
                  <th className="px-5 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold text-xs">
                          {lead.name ? lead.name.charAt(0).toUpperCase() : 'L'}
                        </div>
                        <div className="font-bold text-white text-sm">{lead.name}</div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <a 
                        href={`https://wa.me/${lead.phone}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all font-mono font-bold"
                      >
                        <MessageCircle size={13} />
                        {lead.phone}
                      </a>
                    </td>
                    <td className="px-5 py-4 max-w-xs">
                      <div className="flex items-start gap-1.5 text-slate-300">
                        <MessageSquare size={14} className="text-slate-500 shrink-0 mt-0.5" />
                        <p className="line-clamp-2 text-xs" title={lead.notes}>{lead.notes || 'Consulta general de cobertura'}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-cyan-400" />
                        {new Date(lead.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {getStatusBadge(lead.status)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end items-center gap-1.5">
                        {lead.status === 'NEW' && (
                          <button 
                            onClick={() => handleStatusChange(lead.id, 'CONTACTED')} 
                            className="px-2.5 py-1 text-[11px] font-bold text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 rounded-lg transition-colors flex items-center gap-1" 
                            title="Marcar como Contactado"
                          >
                            <CheckCircle size={12} /> Contactado
                          </button>
                        )}
                        {lead.status === 'CONTACTED' && (
                          <button 
                            onClick={() => handleStatusChange(lead.id, 'CONVERTED')} 
                            className="px-2.5 py-1 text-[11px] font-bold text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-lg transition-colors flex items-center gap-1" 
                            title="Marcar como Convertido"
                          >
                            <CheckCircle size={12} /> Convertido
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(lead.id)} 
                          className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-900 hover:bg-rose-500/20 border border-slate-800 rounded-lg transition-colors" 
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

