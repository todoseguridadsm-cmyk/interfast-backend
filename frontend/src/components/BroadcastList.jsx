import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Radio, 
  Send, 
  Clock, 
  Users, 
  Search, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  Zap, 
  Globe, 
  Layers, 
  MessageSquare, 
  Sparkles,
  Loader2,
  Filter
} from 'lucide-react';

export default function BroadcastList() {
  const [scope, setScope] = useState('ALL');
  const [selectedNode, setSelectedNode] = useState('');
  const [selectedPanel, setSelectedPanel] = useState('');
  const [message, setMessage] = useState('');
  const [nodes, setNodes] = useState([]);
  const [panels, setPanels] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [selectedClientIds, setSelectedClientIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const [resNodes, resPanels] = await Promise.all([
          axios.get('https://interfast-backend-95ww.onrender.com/api/nodes', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('https://interfast-backend-95ww.onrender.com/api/panels', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setNodes(resNodes.data);
        setPanels(resPanels.data);
      } catch (error) { 
        console.error("Error cargando nodos/paneles", error); 
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchFilteredClients = async () => {
      try {
        const token = localStorage.getItem('token');
        let res;
        
        if (scope === 'ALL') {
          res = await axios.get('https://interfast-backend-95ww.onrender.com/api/clients', { headers: { Authorization: `Bearer ${token}` } });
        } else if (scope === 'SEGMENTED') {
          if (!selectedNode && !selectedPanel) {
            setFilteredClients([]);
            setSelectedClientIds(new Set());
            return;
          }
          res = await axios.post('https://interfast-backend-95ww.onrender.com/api/clients/filter', 
            { nodeId: selectedNode, panelId: selectedPanel }, 
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }

        if (res && res.data) {
          const validClients = res.data.filter(c => c.status === 'ACTIVE' && c.phone && c.phone.length > 8);
          setFilteredClients(validClients);
          setSelectedClientIds(new Set(validClients.map(c => c.id)));
        }
      } catch (error) { 
        console.error("Error filtrando clientes", error); 
      }
    };

    fetchFilteredClients();
  }, [scope, selectedNode, selectedPanel]);

  const toggleClientSelection = (id) => {
    const newSelection = new Set(selectedClientIds);
    if (newSelection.has(id)) newSelection.delete(id);
    else newSelection.add(id);
    setSelectedClientIds(newSelection);
  };

  const toggleAll = () => {
    if (selectedClientIds.size === filteredClients.length) setSelectedClientIds(new Set());
    else setSelectedClientIds(new Set(filteredClients.map(c => c.id)));
  };

  const displayedClients = useMemo(() => {
    if (!searchTerm.trim()) return filteredClients;
    const term = searchTerm.toLowerCase().trim();
    return filteredClients.filter(c => 
      c.name.toLowerCase().includes(term) || 
      (c.dni && c.dni.includes(term)) ||
      (c.phone && c.phone.includes(term))
    );
  }, [filteredClients, searchTerm]);

  const estimatedClients = selectedClientIds.size;
  const estimateTimeStr = () => {
    if (estimatedClients === 0) return '0 minutos';
    const totalSeconds = (estimatedClients * 20) + (Math.floor(estimatedClients / 40) * 90);
    const mins = Math.floor(totalSeconds / 60);
    return mins < 1 ? 'Menos de 1 minuto' : mins > 60 ? `~${(mins / 60).toFixed(1)} horas` : `~${mins} minutos`;
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!message.trim()) return alert("El mensaje no puede estar vacío.");
    if (estimatedClients === 0) return alert("Debes seleccionar al menos un destinatario.");
    if (!window.confirm(`⚠️ ¿Confirmar inicio de campaña de difusión para ${estimatedClients} clientes seleccionados?`)) return;
    
    setIsSending(true);
    try {
      await axios.post('https://interfast-backend-95ww.onrender.com/api/bot/broadcast-segmented', 
        { clientIds: Array.from(selectedClientIds), message }, 
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      alert('🚀 ¡Campaña de difusión iniciada exitosamente en segundo plano!');
      setMessage(''); 
      setScope('ALL'); 
      setSelectedNode(''); 
      setSelectedPanel('');
    } catch (error) { 
      alert('Error al iniciar la difusión. Verifica la conexión con el servidor.'); 
    } finally { 
      setIsSending(false); 
    }
  };

  const availablePanels = selectedNode ? panels.filter(p => p.nodeId === parseInt(selectedNode)) : panels;

  return (
    <div className="relative min-h-screen bg-[#040814] text-slate-100 p-4 md:p-8 rounded-3xl overflow-hidden border border-cyan-500/20 shadow-2xl">
      
      {/* Background Cyber Network Glow Effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-0" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(#00f0ff_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.04] pointer-events-none" />

      {/* Cyber Header */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b border-cyan-500/20 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-400/40 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.25)] flex items-center justify-center">
            <Radio className="text-cyan-400 animate-pulse" size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest font-black text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-500/30">
                INTERFASTSM • NETWORK TELECOM
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Live
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white mt-1 drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]">
              Centro de Difusión Masiva
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-0.5">
              Conectamos y transmitimos comunicados a toda tu red de clientes en segundos
            </p>
          </div>
        </div>

        {/* Telemetry Quick Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-[#091224]/80 border border-cyan-500/30 px-3.5 py-2 rounded-xl backdrop-blur-md flex items-center gap-2.5 shadow-lg">
            <Users size={16} className="text-cyan-400" />
            <div>
              <div className="text-[10px] text-slate-400 font-medium uppercase leading-tight">Destinatarios</div>
              <div className="text-sm font-extrabold text-cyan-300 leading-tight">
                {selectedClientIds.size} <span className="text-slate-500 text-xs">/ {filteredClients.length}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#091224]/80 border border-blue-500/30 px-3.5 py-2 rounded-xl backdrop-blur-md flex items-center gap-2.5 shadow-lg">
            <Clock size={16} className="text-blue-400" />
            <div>
              <div className="text-[10px] text-slate-400 font-medium uppercase leading-tight">Tiempo Estimado</div>
              <div className="text-sm font-extrabold text-blue-300 leading-tight">{estimateTimeStr()}</div>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleBroadcast} className="relative z-10 space-y-6">
        
        {/* Main Grid: Scope & Message Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Columna Izquierda: Alcance & Segmentación */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#070f20]/90 border border-cyan-500/30 rounded-2xl p-5 shadow-xl backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center gap-2 mb-4">
                <Globe size={18} className="text-cyan-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-200">Alcance de la Campaña</h3>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => { setScope('ALL'); setSelectedNode(''); setSelectedPanel(''); }}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    scope === 'ALL'
                      ? 'bg-gradient-to-b from-cyan-950/80 to-blue-950/80 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                      : 'bg-[#0b162c]/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <Globe size={20} className={`mb-1.5 ${scope === 'ALL' ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
                  Toda la Red (Global)
                </button>

                <button
                  type="button"
                  onClick={() => setScope('SEGMENTED')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    scope === 'SEGMENTED'
                      ? 'bg-gradient-to-b from-cyan-950/80 to-blue-950/80 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                      : 'bg-[#0b162c]/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <Layers size={20} className={`mb-1.5 ${scope === 'SEGMENTED' ? 'text-cyan-400' : 'text-slate-500'}`} />
                  Por Nodo / Sectorial
                </button>
              </div>

              {/* Segmented Controls Panel */}
              {scope === 'SEGMENTED' && (
                <div className="space-y-3.5 p-4 bg-[#091326] border border-cyan-500/20 rounded-xl animate-in fade-in zoom-in-95 duration-200">
                  <div>
                    <label className="block text-[11px] font-bold text-cyan-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Zap size={12} className="text-amber-400" />
                      Nodo Matriz (Obligatorio)
                    </label>
                    <select 
                      value={selectedNode} 
                      onChange={(e) => { setSelectedNode(e.target.value); setSelectedPanel(''); }} 
                      className="w-full bg-[#040814] border border-cyan-500/40 text-cyan-100 rounded-xl p-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all cursor-pointer"
                    >
                      <option value="">Selecciona un Nodo Matriz...</option>
                      {nodes.map(n => <option key={n.id} value={n.id} className="bg-slate-900 text-white">{n.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Filter size={12} className="text-cyan-400" />
                      Panel Sectorial (Opcional)
                    </label>
                    <select 
                      value={selectedPanel} 
                      onChange={(e) => setSelectedPanel(e.target.value)} 
                      disabled={!selectedNode} 
                      className="w-full bg-[#040814] border border-slate-700 text-slate-200 rounded-xl p-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <option value="">Todos los paneles del nodo...</option>
                      {availablePanels.map(p => <option key={p.id} value={p.id} className="bg-slate-900 text-white">{p.name}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <ShieldCheck size={14} /> Anti-Ban Activo
                </span>
                <span>Intervalo inteligente (15s-25s)</span>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Mensaje a Enviar */}
          <div className="lg:col-span-7">
            <div className="bg-[#070f20]/90 border border-cyan-500/30 rounded-2xl p-5 shadow-xl backdrop-blur-md h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={18} className="text-cyan-400" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-200">Mensaje de la Campaña</h3>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {message.length} caracteres
                  </span>
                </div>

                <div className="relative">
                  <textarea 
                    value={message} 
                    onChange={(e) => setMessage(e.target.value)} 
                    rows={6}
                    className="w-full bg-[#030611] border border-cyan-500/40 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all resize-none font-sans leading-relaxed shadow-inner"
                    placeholder="Escribe el comunicado para los clientes... Ejemplo: Estimados clientes, les informamos sobre tareas de mantenimiento programadas en el nodo..."
                  />
                </div>

                {/* Quick Helper formatting buttons */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className="text-[11px] text-slate-500 font-bold uppercase">Formato Rápido:</span>
                  <button 
                    type="button" 
                    onClick={() => setMessage(prev => prev + ' *texto en negrita* ')}
                    className="text-[11px] bg-slate-900 hover:bg-cyan-950/60 text-cyan-300 px-2.5 py-1 rounded-lg border border-cyan-500/30 font-mono transition-colors cursor-pointer"
                  >
                    *Negrita*
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setMessage(prev => prev + ' _texto en cursiva_ ')}
                    className="text-[11px] bg-slate-900 hover:bg-cyan-950/60 text-cyan-300 px-2.5 py-1 rounded-lg border border-cyan-500/30 font-mono transition-colors cursor-pointer"
                  >
                    _Cursiva_
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setMessage(prev => prev + ' ⚠️ AVISO IMPORTANTE: ')}
                    className="text-[11px] bg-slate-900 hover:bg-amber-950/60 text-amber-300 px-2.5 py-1 rounded-lg border border-amber-500/30 transition-colors cursor-pointer"
                  >
                    ⚠️ Aviso
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setMessage(prev => prev + ' 📡 INTERFAST: ')}
                    className="text-[11px] bg-slate-900 hover:bg-blue-950/60 text-blue-300 px-2.5 py-1 rounded-lg border border-blue-500/30 transition-colors cursor-pointer"
                  >
                    📡 Firma
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recipients Grid Section */}
        {filteredClients.length > 0 && (
          <div className="bg-[#070f20]/90 border border-cyan-500/30 rounded-2xl p-5 shadow-xl backdrop-blur-md">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <Users size={20} className="text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Matriz de Destinatarios
                  </h3>
                  <span className="text-xs text-cyan-400 font-bold">
                    {selectedClientIds.size} seleccionados de {filteredClients.length} clientes activos
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Search Bar */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Buscar cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-[#040814] border border-slate-700 text-slate-200 pl-8 pr-3 py-1.5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 w-44 sm:w-56"
                  />
                </div>

                <button 
                  type="button" 
                  onClick={toggleAll} 
                  className="text-xs font-bold px-3 py-1.5 rounded-xl border border-cyan-500/40 text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/60 transition-all cursor-pointer shadow-sm"
                >
                  {selectedClientIds.size === filteredClients.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                </button>
              </div>
            </div>

            {/* Recipients Checkbox Scrollable List */}
            <div className="max-h-60 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pr-2 custom-scrollbar">
              {displayedClients.map(client => {
                const isChecked = selectedClientIds.has(client.id);
                return (
                  <label 
                    key={client.id} 
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                      isChecked
                        ? 'bg-[#09162e] border-cyan-500/40 text-cyan-100 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                        : 'bg-[#050b17]/50 border-slate-800/80 text-slate-500 hover:border-slate-700 hover:bg-[#081224]'
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      checked={isChecked} 
                      onChange={() => toggleClientSelection(client.id)} 
                      className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 bg-slate-900 border-slate-700 cursor-pointer" 
                    />
                    <div className="min-w-0 flex-1">
                      <div className={`text-xs truncate font-bold ${isChecked ? 'text-white' : 'text-slate-500'}`}>
                        {client.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        TK{String(client.id).padStart(3, '0')} • {client.phone || 'Sin tel'}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            {displayedClients.length === 0 && (
              <div className="text-center py-6 text-slate-500 text-xs">
                No se encontraron destinatarios que coincidan con "{searchTerm}".
              </div>
            )}
          </div>
        )}

        {scope === 'SEGMENTED' && filteredClients.length === 0 && selectedNode && (
          <div className="text-center p-6 text-cyan-400/80 text-sm border border-cyan-500/20 rounded-2xl bg-[#070f20]/90 shadow-lg">
            📡 No se encontraron clientes activos con número de WhatsApp válido en esta segmentación.
          </div>
        )}

        {/* Action Footer Bar with Glowing Launch Button */}
        <div className="flex flex-col sm:flex-row justify-between items-center bg-[#070f20]/95 p-5 rounded-2xl border border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.15)] gap-4 backdrop-blur-md">
          <div className="flex items-center gap-3 text-xs md:text-sm text-slate-300">
            <div className="p-2 bg-blue-950/80 border border-blue-500/40 rounded-xl">
              <Clock size={18} className="text-cyan-400" />
            </div>
            <div>
              <span className="text-slate-400 text-xs block">Tiempo estimado de transmisión:</span>
              <span className="font-extrabold text-white text-sm tracking-wide">{estimateTimeStr()}</span>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSending || estimatedClients === 0} 
            className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-sm uppercase tracking-wider transition-all duration-300 shadow-[0_0_25px_rgba(6,182,212,0.6)] hover:shadow-[0_0_35px_rgba(6,182,212,0.9)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {isSending ? (
              <>
                <Loader2 size={18} className="animate-spin text-slate-950" />
                <span>Transmitiendo...</span>
              </>
            ) : (
              <>
                <Send size={18} className="text-slate-950" />
                <span>Iniciar Difusión</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

