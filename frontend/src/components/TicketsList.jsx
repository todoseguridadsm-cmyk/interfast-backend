import { useState, useEffect } from 'react';
import axios from 'axios';
import { Ticket, PlusCircle, CheckCircle, Clock, CalendarClock, UserX, Info, Wrench, AlertTriangle, ShieldCheck, MapPin, Phone, Globe, Cpu, X } from 'lucide-react';

export default function TicketsList() {
  const [tickets, setTickets] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ clientId: '', title: '', description: '', priority: 'NORMAL', scheduledAt: '' });

  const [resModal, setResModal] = useState({ show: false, ticket: null });
  const [resForm, setResForm] = useState({ action: 'RESOLVED', notes: '', routerProvided: false, mastProvided: false });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tRes, cRes] = await Promise.all([
        axios.get('https://interfast-backend-95ww.onrender.com/api/tickets'),
        axios.get('https://interfast-backend-95ww.onrender.com/api/clients')
      ]);
      setTickets(tRes.data);
      setClients(cRes.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData() }, []);

  const handleEdit = (ticket) => {
    setEditingId(ticket.id);
    let schedStr = '';
    if (ticket.scheduledAt) {
      const d = new Date(ticket.scheduledAt);
      const tzOffset = d.getTimezoneOffset() * 60000;
      schedStr = (new Date(d - tzOffset)).toISOString().slice(0, 16);
    }
    
    setForm({
      clientId: ticket.clientId,
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority,
      scheduledAt: schedStr
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este ticket?')) return;
    try {
      await axios.delete(`https://interfast-backend-95ww.onrender.com/api/tickets/${id}`);
      fetchData();
    } catch (e) { alert('Error eliminando ticket'); }
  };

  const saveTicket = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (payload.scheduledAt && !editingId) {
        payload.statusAction = 'AGENDADO';
        payload.resolutionNotes = 'Visita programada para ' + payload.scheduledAt.replace('T', ' ');
      } else if (payload.scheduledAt && editingId) {
        payload.statusAction = 'RE-AGENDADO';
        payload.resolutionNotes = 'Fecha actualizada para ' + payload.scheduledAt.replace('T', ' ');
      }
      
      if (editingId) {
        await axios.put(`https://interfast-backend-95ww.onrender.com/api/tickets/${editingId}`, payload);
      } else {
        await axios.post('https://interfast-backend-95ww.onrender.com/api/tickets', payload);
      }
      setShowModal(false);
      setEditingId(null);
      setForm({ clientId: '', title: '', description: '', priority: 'NORMAL', scheduledAt: '' });
      fetchData();
    } catch (e) { alert('Error procesando ticket'); }
  };

  const openResolution = (ticket) => {
    setResModal({ show: true, ticket });
    setResForm({ action: 'RESOLVED', notes: '', routerProvided: ticket.routerProvided || false, mastProvided: ticket.mastProvided || false });
  };

  const submitResolution = async (e) => {
    e.preventDefault();
    const tId = resModal.ticket.id;
    let newStatus = 'RESOLVED';
    if (resForm.action === 'CLIENT_ABSENT') newStatus = 'OPEN';
    if (resForm.action === 'COMMENT') newStatus = resModal.ticket.status;
    
    const statusTextDict = {
      'RESOLVED': 'CERRADO/SOLUCIONADO',
      'CLIENT_ABSENT': 'VISITA FALLIDA - CLIENTE AUSENTE',
      'COMMENT': 'COMENTARIO'
    };

    try {
      await axios.put(`https://interfast-backend-95ww.onrender.com/api/tickets/${tId}`, {
        status: newStatus,
        statusAction: statusTextDict[resForm.action],
        resolutionNotes: resForm.notes,
        routerProvided: resForm.routerProvided,
        mastProvided: resForm.mastProvided
      });
      setResModal({ show: false, ticket: null });
      fetchData();
    } catch(e) { alert('Error resolviendo ticket'); }
  };

  const updateStatusSimple = async (id, status) => {
    try {
      await axios.put(`https://interfast-backend-95ww.onrender.com/api/tickets/${id}`, { status, statusAction: 'CAMBIO ESTADO', resolutionNotes: `Movido a ${status}` });
      fetchData();
    } catch (e) { alert('Error'); }
  };

  const renderClientData = (c) => (
    <div className="text-[11px] bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 mb-3 space-y-1 mt-2 text-slate-300">
      <div className="font-bold text-white text-xs border-b border-slate-800 pb-1 mb-1 flex items-center justify-between">
        <span>👤 {c?.name}</span>
        <span className="font-mono text-[10px] text-cyan-400">TK{String(c?.id || '').padStart(3, '0')}</span>
      </div>
      <div className="flex items-center gap-1.5 text-slate-400">
        <MapPin size={11} className="text-rose-400" />
        <span className="truncate">{c?.address} - {c?.city}</span>
      </div>
      <div className="flex items-center gap-1.5 text-slate-400">
        <Phone size={11} className="text-emerald-400" />
        <span>{c?.phone}</span>
      </div>
      <div className="flex items-center gap-1.5 text-slate-400">
        <Globe size={11} className="text-cyan-400" />
        <span>{c?.mainNode || 'Nodo'} | IP: {c?.ipNumber || 'DHCP'}</span>
      </div>
    </div>
  );

  const renderHistory = (history) => {
    if (!history || history.length === 0) return null;
    return (
      <div className="mt-3 pt-3 border-t border-slate-800/80">
        <div className="flex items-center gap-1 text-[10px] font-mono uppercase text-slate-400 mb-1.5">
          <Info size={11} className="text-cyan-400" /> Historial de Partes
        </div>
        <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
          {history.map(h => (
            <div key={h.id} className="text-[10px] bg-slate-900/90 p-2 rounded-lg text-slate-300 border-l-2 border-cyan-400">
              <span className="font-mono text-[9px] text-slate-500 block">{new Date(h.createdAt).toLocaleString()}</span>
              <span className="font-bold text-cyan-300">{h.action}:</span> {h.notes}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* Cyber Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#050b18] via-[#0b1633] to-[#040814] border border-cyan-500/30 p-6 md:p-8 shadow-[0_0_35px_rgba(6,182,212,0.15)]">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="relative p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              <Wrench size={36} className="drop-shadow-[0_0_8px_#00f0ff]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-semibold tracking-wider uppercase">
                  HELPDESK // FIELD SERVICE
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-wide mt-1">
                Mesa de Ayuda <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">(Tickets & Visitas)</span>
              </h1>
              <p className="text-slate-400 text-xs md:text-sm mt-1 max-w-xl">
                Gestión de fallas, visitas técnicas en domicilio, inventario y entregas de equipos.
              </p>
            </div>
          </div>

          <button 
            onClick={() => { setEditingId(null); setForm({ clientId: '', title: '', description: '', priority: 'NORMAL', scheduledAt: '' }); setShowModal(true); }}
            className="group px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all duration-200 flex items-center gap-2 hover:scale-105"
          >
            <PlusCircle size={16} />
            <span>Nuevo Ticket</span>
          </button>
        </div>
      </div>

      {/* Cyber Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* ABIERTOS / PENDIENTES */}
        <div className="rounded-2xl bg-gradient-to-b from-[#070e1e] to-[#040812] border border-rose-500/30 p-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-rose-500/30 mb-4">
            <h3 className="font-mono text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
              Pendientes
            </h3>
            <span className="text-xs font-mono font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
              {tickets.filter(t=>t.status==='OPEN').length}
            </span>
          </div>

          <div className="space-y-3">
            {tickets.filter(t => t.status === 'OPEN').map(t => (
              <div key={t.id} className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 hover:border-rose-500/40 transition-all shadow-md">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-white text-sm leading-snug">{t.title}</h4>
                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${
                    t.priority === 'HIGH' 
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {t.priority}
                  </span>
                </div>
                
                <div className="text-[10px] font-mono text-slate-400 mb-2 flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 w-fit">
                  <Clock size={11} className="text-cyan-400" />
                  <span>{new Date(t.createdAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })} hs</span>
                </div>

                {t.scheduledAt && (
                  <div className="text-[11px] font-mono font-bold text-cyan-300 mb-2 flex items-center gap-1 bg-cyan-950/40 border border-cyan-500/30 px-2 py-1 rounded-lg">
                    <CalendarClock size={13} className="text-cyan-400 animate-pulse" />
                    <span>Visita: {new Date(t.scheduledAt).toLocaleString()}</span>
                  </div>
                )}

                <p className="text-xs text-slate-300">{t.description}</p>
                {renderClientData(t.client)}
                {renderHistory(t.history)}

                <div className="flex gap-2 mt-3 pt-2 border-t border-slate-800/80">
                   <button onClick={()=>updateStatusSimple(t.id, 'IN_PROGRESS')} className="flex-1 text-[11px] font-bold py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl transition-all flex items-center justify-center gap-1">
                     <Clock size={12}/> En Curso
                   </button>
                   <button onClick={()=>openResolution(t)} className="flex-1 text-[11px] font-bold py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-xl transition-all flex items-center justify-center gap-1">
                     <CheckCircle size={12}/> Resolver
                   </button>
                </div>
                <div className="flex gap-2 mt-1.5">
                   <button onClick={()=>handleEdit(t)} className="flex-1 text-[10px] font-bold py-1.5 bg-slate-800 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 rounded-lg transition-all">
                     Agendar / Editar
                   </button>
                   <button onClick={()=>handleDelete(t.id)} className="flex-1 text-[10px] font-bold py-1.5 bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 rounded-lg transition-all">
                     Eliminar
                   </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* EN PROCESO */}
        <div className="rounded-2xl bg-gradient-to-b from-[#070e1e] to-[#040812] border border-amber-500/30 p-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-amber-500/30 mb-4">
            <h3 className="font-mono text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              En Proceso
            </h3>
            <span className="text-xs font-mono font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
              {tickets.filter(t=>t.status==='IN_PROGRESS').length}
            </span>
          </div>

          <div className="space-y-3">
            {tickets.filter(t => t.status === 'IN_PROGRESS').map(t => (
              <div key={t.id} className="bg-slate-900/90 p-4 rounded-xl border border-amber-500/30 hover:border-amber-400 transition-all shadow-md">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-white text-sm leading-snug">{t.title}</h4>
                </div>
                <div className="text-[10px] font-mono text-slate-400 mb-2 flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 w-fit">
                  <Clock size={11} className="text-amber-400" />
                  <span>{new Date(t.createdAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })} hs</span>
                </div>
                {t.scheduledAt && (
                  <div className="text-[11px] font-mono font-bold text-cyan-300 mb-2 flex items-center gap-1 bg-cyan-950/40 border border-cyan-500/30 px-2 py-1 rounded-lg">
                    <CalendarClock size={13} className="text-cyan-400 animate-pulse" />
                    <span>Visita: {new Date(t.scheduledAt).toLocaleString()}</span>
                  </div>
                )}
                <p className="text-xs text-slate-300">{t.description}</p>
                {renderClientData(t.client)}
                {renderHistory(t.history)}

                <div className="flex gap-2 mt-3 pt-2 border-t border-slate-800/80">
                   <button onClick={()=>openResolution(t)} className="flex-[2] text-[11px] font-bold py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl transition-all flex items-center justify-center gap-1">
                     <CheckCircle size={13}/> Resolver / Parte
                   </button>
                   <button onClick={()=>handleEdit(t)} className="flex-1 text-[11px] font-bold py-2 bg-slate-800 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 rounded-xl transition-all">
                     Editar
                   </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RESUELTOS */}
        <div className="rounded-2xl bg-gradient-to-b from-[#070e1e] to-[#040812] border border-emerald-500/30 p-4 shadow-xl opacity-90">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-500/30 mb-4">
            <h3 className="font-mono text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Cerrados
            </h3>
            <span className="text-xs font-mono font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              {tickets.filter(t=>t.status==='RESOLVED').length}
            </span>
          </div>

          <div className="space-y-3">
            {tickets.filter(t => t.status === 'RESOLVED').map(t => (
              <div key={t.id} className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-slate-400">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-slate-300 line-through text-sm">{t.title}</h4>
                </div>
                <div className="text-[10px] font-mono bg-emerald-950/40 text-emerald-300 p-2 rounded-lg border border-emerald-500/30 mb-2">
                  Cerrado: {new Date(t.updatedAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })} hs
                </div>
                <div className="flex gap-2 mb-2">
                  {t.routerProvided && <span className="text-[9px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 font-bold rounded">Router ✔️</span>}
                  {t.mastProvided && <span className="text-[9px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 font-bold rounded">Mástil ✔️</span>}
                </div>
                {renderHistory(t.history)}
                <div className="flex gap-2 mt-3 pt-2 border-t border-slate-800">
                   <button onClick={()=>handleDelete(t.id)} className="flex-1 text-[10px] font-bold py-1.5 bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-800 rounded-lg transition-colors">
                     Eliminar Archivo
                   </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Cyber Create / Edit Ticket Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-gradient-to-b from-[#081226] via-[#050b18] to-[#040814] border border-cyan-500/30 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
              <h3 className="font-black text-lg text-white">
                {editingId ? 'Editar Ticket / Visita' : 'Levantar Nuevo Ticket Técnico'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={saveTicket} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                  Cliente Afectado
                </label>
                <select 
                  required 
                  value={form.clientId} 
                  onChange={e=>setForm({...form, clientId: e.target.value})} 
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-xs outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="">Seleccione un cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name} - {c.address}</option>)}
                </select>
              </div>
              
              {editingId && (
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                    Agendar Visita (Fecha & Hora)
                  </label>
                  <input 
                    type="datetime-local" 
                    value={form.scheduledAt} 
                    onChange={e=>setForm({...form, scheduledAt: e.target.value})} 
                    className="w-full bg-slate-900 border border-slate-700 text-cyan-300 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-cyan-400 font-mono" 
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                  Título del Reclamo / Motivo
                </label>
                <input 
                  required 
                  type="text" 
                  value={form.title} 
                  onChange={e=>setForm({...form, title: e.target.value})} 
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-xs outline-none focus:border-cyan-400" 
                  placeholder="Ej: Antena desorientada / Sin señal" 
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                  Descripción Técnica
                </label>
                <textarea 
                  required 
                  rows={3} 
                  value={form.description} 
                  onChange={e=>setForm({...form, description: e.target.value})} 
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-xs outline-none focus:border-cyan-400" 
                  placeholder="Detalles para el técnico en calle..."
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3 pb-2">
                <button 
                  type="button" 
                  onClick={()=>setForm({...form, priority: 'NORMAL'})} 
                  className={`py-2 rounded-xl font-bold text-xs border transition-all ${
                    form.priority==='NORMAL' 
                      ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300' 
                      : 'border-slate-800 bg-slate-900/60 text-slate-400'
                  }`}
                >
                  Normal
                </button>
                <button 
                  type="button" 
                  onClick={()=>setForm({...form, priority: 'HIGH'})} 
                  className={`py-2 rounded-xl font-bold text-xs border transition-all ${
                    form.priority==='HIGH' 
                      ? 'border-rose-500 bg-rose-500/20 text-rose-300' 
                      : 'border-slate-800 bg-slate-900/60 text-slate-400'
                  }`}
                >
                  Urgente
                </button>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="flex-1 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
                >
                  Guardar Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cyber Technical Resolution Modal */}
      {resModal.show && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-gradient-to-b from-[#081226] via-[#050b18] to-[#040814] border border-emerald-500/30 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full max-w-sm overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <CheckCircle size={20}/>
                </div>
                <div>
                  <h3 className="font-black text-base text-white">Parte de Cierre Técnico</h3>
                  <p className="text-xs text-emerald-400 font-mono truncate max-w-[200px]">{resModal.ticket.title}</p>
                </div>
              </div>
              <button onClick={() => setResModal({show:false, ticket:null})} className="text-slate-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitResolution} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                  Resultado de la Visita
                </label>
                <select 
                  required 
                  value={resForm.action} 
                  onChange={e=>setResForm({...resForm, action: e.target.value})} 
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-emerald-400 cursor-pointer"
                >
                  <option value="RESOLVED">✅ Solucionado / Instalado</option>
                  <option value="CLIENT_ABSENT">❌ Cliente Ausente (Reprogramar)</option>
                  <option value="COMMENT">📝 Nota sin cerrar ticket</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                  Comentarios del Técnico
                </label>
                <textarea 
                  required 
                  rows={3} 
                  value={resForm.notes} 
                  onChange={e=>setResForm({...resForm, notes: e.target.value})} 
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-emerald-400" 
                  placeholder="Detalle de reparación o materiales..."
                ></textarea>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
                 <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-bold">Inventario Entregado</p>
                 <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-300">
                   <input type="checkbox" checked={resForm.routerProvided} onChange={e=>setResForm({...resForm, routerProvided: e.target.checked})} className="rounded text-cyan-500 focus:ring-cyan-500 bg-slate-900 border-slate-700" />
                   Se entregó Router Wi-Fi
                 </label>
                 <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-300">
                   <input type="checkbox" checked={resForm.mastProvided} onChange={e=>setResForm({...resForm, mastProvided: e.target.checked})} className="rounded text-cyan-500 focus:ring-cyan-500 bg-slate-900 border-slate-700" />
                   Se entregó Mástil / Soporte
                 </label>
              </div>

              <div className="flex gap-3 pt-2 border-t border-slate-800">
                <button type="button" onClick={() => setResModal({show:false, ticket:null})} className="flex-1 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all">
                  Guardar Parte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

