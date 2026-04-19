import { useState, useEffect } from 'react';
import axios from 'axios';
import { Ticket, PlusCircle, CheckCircle, Clock, CalendarClock, UserX, Info } from 'lucide-react';

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
      const tzOffset = d.getTimezoneOffset() * 60000; //offset in milliseconds
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
    if (resForm.action === 'CLIENT_ABSENT') newStatus = 'OPEN'; // Lo devolvemos a PENDIENTE
    if (resForm.action === 'COMMENT') newStatus = resModal.ticket.status; // No cambia estado
    
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
    <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100 mb-3 space-y-1 mt-2">
      <div className="font-bold text-slate-800 text-sm border-b border-slate-50 pb-1 mb-1">
        🙍‍♂️ {c?.name}
      </div>
      <div className="flex gap-2"><b>📍 Dirección:</b> {c?.address} - {c?.city}</div>
      <div className="flex gap-2"><b>📞 Teléfono:</b> {c?.phone}</div>
      <div className="flex gap-2"><b>🌐 Nodo/Panel:</b> {c?.mainNode} | {c?.panelId} </div>
      <div className="flex gap-2"><b>🖥️ IP:</b> {c?.ipNumber}</div>
    </div>
  );

  const renderHistory = (history) => {
    if (!history || history.length === 0) return null;
    return (
      <div className="mt-3 pt-3 border-t border-slate-200">
        <div className="flex items-center gap-1 text-xs font-bold text-slate-500 mb-2">
          <Info size={12}/> Historial de Visitas/Notas
        </div>
        <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
          {history.map(h => (
            <div key={h.id} className="text-[10px] bg-slate-100/50 p-1.5 rounded text-slate-600 border-l-[3px] border-blue-400">
              <span className="font-bold block text-[9px] text-slate-400">{new Date(h.createdAt).toLocaleString()}</span>
              <span className="font-semibold text-slate-700">{h.action}:</span> {h.notes}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Ticket className="text-blue-500" size={32} />
            Mesa de Ayuda (Tickets)
          </h2>
          <p className="text-slate-500 mt-1 ml-11">Gestión de fallas, visitas y entregas de equipos.</p>
        </div>
        <button 
          onClick={() => { setEditingId(null); setForm({ clientId: '', title: '', description: '', priority: 'NORMAL', scheduledAt: '' }); setShowModal(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
        >
          <PlusCircle size={20} /> Nuevo Ticket
        </button>
      </header>

      {/* Kanban Board like lists */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* ABIERTOS */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <h3 className="font-black text-slate-700 mb-4 pb-2 border-b-2 border-slate-100 flex justify-between">
            PENDIENTES <span className="bg-red-100 text-red-600 px-2 rounded-full">{tickets.filter(t=>t.status==='OPEN').length}</span>
          </h3>
          <div className="space-y-3">
            {tickets.filter(t => t.status === 'OPEN').map(t => (
              <div key={t.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-slate-900 leading-tight">{t.title}</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.priority==='HIGH'?'bg-red-100 text-red-600':'bg-slate-200 text-slate-600'}`}>{t.priority}</span>
                </div>
                {t.scheduledAt && <div className="text-xs font-bold text-blue-600 mb-2 flex items-center gap-1"><CalendarClock size={14}/> Visita: {new Date(t.scheduledAt).toLocaleString()}</div>}
                <p className="text-xs text-slate-600">{t.description}</p>
                {renderClientData(t.client)}
                {renderHistory(t.history)}

                <div className="flex gap-2 mt-4">
                   <button onClick={()=>updateStatusSimple(t.id, 'IN_PROGRESS')} className="flex-1 text-xs font-bold py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 flex items-center justify-center gap-1"><Clock size={14}/> En Curso</button>
                   <button onClick={()=>openResolution(t)} className="flex-1 text-xs font-bold py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 flex items-center justify-center gap-1"><CheckCircle size={14}/> Resolver</button>
                </div>
                <div className="flex gap-2 mt-2">
                   <button onClick={()=>handleEdit(t)} className="flex-1 text-xs font-bold py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">Agendar / Editar</button>
                   <button onClick={()=>handleDelete(t.id)} className="flex-1 text-xs font-bold py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200">Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* EN PROGRESO */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <h3 className="font-black text-slate-700 mb-4 pb-2 border-b-2 border-slate-100 flex justify-between">
            EN PROCESO <span className="bg-yellow-100 text-yellow-700 px-2 rounded-full">{tickets.filter(t=>t.status==='IN_PROGRESS').length}</span>
          </h3>
          <div className="space-y-3">
            {tickets.filter(t => t.status === 'IN_PROGRESS').map(t => (
              <div key={t.id} className="bg-slate-50 p-4 rounded-xl border border-yellow-200 shadow-[0_0_10px_rgba(250,204,21,0.1)]">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-slate-900 leading-tight">{t.title}</h4>
                </div>
                {t.scheduledAt && <div className="text-xs font-bold text-blue-600 mb-2 flex items-center gap-1"><CalendarClock size={14}/> Visita: {new Date(t.scheduledAt).toLocaleString()}</div>}
                <p className="text-xs text-slate-600">{t.description}</p>
                {renderClientData(t.client)}
                {renderHistory(t.history)}

                <div className="flex gap-2 mt-4">
                   <button onClick={()=>openResolution(t)} className="flex-[2] text-xs font-bold py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 flex items-center justify-center gap-1"><CheckCircle size={14}/> Resolver / Visita</button>
                   <button onClick={()=>handleEdit(t)} className="flex-1 px-3 text-xs font-bold py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">Editar</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RESUELTOS */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 opacity-75">
          <h3 className="font-black text-slate-700 mb-4 pb-2 border-b-2 border-slate-100 flex justify-between">
            CERRADOS <span className="bg-emerald-100 text-emerald-700 px-2 rounded-full">{tickets.filter(t=>t.status==='RESOLVED').length}</span>
          </h3>
          <div className="space-y-3">
            {tickets.filter(t => t.status === 'RESOLVED').map(t => (
              <div key={t.id} className="bg-slate-50 p-4 rounded-xl border border-emerald-200 text-slate-500">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold line-through leading-tight">{t.title}</h4>
                </div>
                <div className="text-xs font-medium bg-emerald-50 text-emerald-700 p-2 rounded mb-2">
                  (Cerrado el {new Date(t.updatedAt).toLocaleDateString()})
                </div>
                <div className="flex gap-2 justify-center mb-2">
                  {t.routerProvided && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 font-bold rounded">Router ✔️</span>}
                  {t.mastProvided && <span className="text-[10px] bg-sky-100 text-sky-700 px-2 font-bold rounded">Mástil ✔️</span>}
                </div>
                {renderHistory(t.history)}
                <div className="flex gap-2 mt-4 border-t border-emerald-100/50 pt-3">
                   <button onClick={()=>handleDelete(t.id)} className="flex-1 text-xs font-bold py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200">Eliminar Archivo</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-slate-50 p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">{editingId ? 'Editar Ticket / Visita' : 'Levantar Nuevo Ticket'}</h3>
            </div>
            <form onSubmit={saveTicket} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Cliente Afectado</label>
                <select required value={form.clientId} onChange={e=>setForm({...form, clientId: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none">
                  <option value="">Seleccione un cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name} - {c.address}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Agendar Visita (Opcional)</label>
                <input type="datetime-local" value={form.scheduledAt} onChange={e=>setForm({...form, scheduledAt: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none text-slate-600" />
              </div>
              <div className="border-t border-slate-100 pt-3">
                <label className="block text-sm font-bold text-slate-700 mb-1">Titulo de la Falla / Motivo</label>
                <input required type="text" value={form.title} onChange={e=>setForm({...form, title: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" placeholder="Ej: Instalación, Sin internet..." />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Descripción Técnica</label>
                <textarea required rows={3} value={form.description} onChange={e=>setForm({...form, description: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" placeholder="Detalles a tener en cuenta por el técnico"></textarea>
              </div>
              <div className="grid grid-cols-2 gap-3 pb-3">
                <button type="button" onClick={()=>setForm({...form, priority: 'NORMAL'})} className={`py-2 rounded-xl font-bold text-sm border-2 ${form.priority==='NORMAL'?'border-blue-500 bg-blue-50 text-blue-700':'border-slate-200 text-slate-400'}`}>Normal</button>
                <button type="button" onClick={()=>setForm({...form, priority: 'HIGH'})} className={`py-2 rounded-xl font-bold text-sm border-2 ${form.priority==='HIGH'?'border-red-500 bg-red-50 text-red-700':'border-slate-200 text-slate-400'}`}>Urgente</button>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-white border border-slate-200 text-slate-600 px-4 py-3 rounded-xl font-bold">Cancelar</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-xl font-bold shadow shadow-blue-200">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESOLUTION MODAL */}
      {resModal.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200">
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center gap-3">
              <div className="bg-emerald-100 p-2 rounded-full text-emerald-600"><CheckCircle size={24}/></div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Parte Técnico</h3>
                <p className="text-xs text-slate-500">{resModal.ticket.title}</p>
              </div>
            </div>
            <form onSubmit={submitResolution} className="p-6 space-y-5">
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">¿Qué ocurrió en la visita?</label>
                <select required value={resForm.action} onChange={e=>setResForm({...resForm, action: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none">
                  <option value="RESOLVED">✅ Solucionado / Instalado Correctamente</option>
                  <option value="CLIENT_ABSENT">❌ Cliente Ausente (Reprogramar)</option>
                  <option value="COMMENT">📝 Agregar nota sin cerrar ticket</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Comentarios del Técnico (Obligatorio)</label>
                <textarea required rows={3} value={resForm.notes} onChange={e=>setResForm({...resForm, notes: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none text-sm" placeholder="Se cambió ficha exterior, la casa estaba vacía..."></textarea>
              </div>

              <div className="bg-sky-50 border border-sky-100 p-4 rounded-xl space-y-3">
                 <p className="text-xs font-bold text-sky-800 mb-1 uppercase tracking-wider">Inventario Entregado</p>
                 <label className="flex items-center gap-3 cursor-pointer text-sm font-semibold text-slate-700">
                   <input type="checkbox" checked={resForm.routerProvided} onChange={e=>setResForm({...resForm, routerProvided: e.target.checked})} className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300" />
                   Se entregó Router Wi-Fi
                 </label>
                 <label className="flex items-center gap-3 cursor-pointer text-sm font-semibold text-slate-700">
                   <input type="checkbox" checked={resForm.mastProvided} onChange={e=>setResForm({...resForm, mastProvided: e.target.checked})} className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300" />
                   Se entregó Mástil / Soporte
                 </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setResModal({show:false, ticket:null})} className="flex-1 bg-white border border-slate-200 text-slate-600 px-4 py-3 rounded-xl font-bold hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-xl font-bold shadow-md shadow-emerald-200 transition-colors">Guardar Parte</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
