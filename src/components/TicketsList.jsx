import { useState, useEffect } from 'react';
import axios from 'axios';
import { Ticket, PlusCircle, CheckCircle, Clock } from 'lucide-react';

export default function TicketsList() {
  const [tickets, setTickets] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ clientId: '', title: '', description: '', priority: 'NORMAL' });

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

  const updateStatus = async (id, status) => {
    try {
      await axios.put(`https://interfast-backend-95ww.onrender.com/api/tickets/${id}`, { status });
      fetchData();
    } catch (e) { alert('Error actualizando estado'); }
  };

  const handleEdit = (ticket) => {
    setEditingId(ticket.id);
    setForm({
      clientId: ticket.clientId,
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority
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
      if (editingId) {
        await axios.put(`https://interfast-backend-95ww.onrender.com/api/tickets/${editingId}`, form);
      } else {
        await axios.post('https://interfast-backend-95ww.onrender.com/api/tickets', form);
      }
      setShowModal(false);
      setEditingId(null);
      setForm({ clientId: '', title: '', description: '', priority: 'NORMAL' });
      fetchData();
    } catch (e) { alert('Error procesando ticket'); }
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Ticket className="text-blue-500" size={32} />
            Mesa de Ayuda (Tickets)
          </h2>
          <p className="text-slate-500 mt-1 ml-11">Gestión de reclamos y averías técnicas.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
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
                <p className="text-xs text-slate-500 mb-3">{t.description}</p>
                <div className="text-sm font-medium text-slate-700 bg-white p-2 rounded border border-slate-100 mb-3">
                  🙍‍♂️ Cliente: {t.client?.name}
                </div>
                <div className="flex gap-2">
                   <button onClick={()=>updateStatus(t.id, 'IN_PROGRESS')} className="flex-1 text-xs font-bold py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 flex items-center justify-center gap-1"><Clock size={14}/> En Curso</button>
                   <button onClick={()=>updateStatus(t.id, 'RESOLVED')} className="flex-1 text-xs font-bold py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 flex items-center justify-center gap-1"><CheckCircle size={14}/> Solucionar</button>
                </div>
                <div className="flex gap-2 mt-2">
                   <button onClick={()=>handleEdit(t)} className="flex-1 text-xs font-bold py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">Editar</button>
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
              <div key={t.id} className="bg-slate-50 p-4 rounded-xl border border-yellow-200">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-slate-900 leading-tight">{t.title}</h4>
                </div>
                <p className="text-xs text-slate-500 mb-3">{t.description}</p>
                <div className="text-sm font-medium text-slate-700 bg-white p-2 rounded border border-slate-100 mb-3">
                  🙍‍♂️ {t.client?.name} | {t.client?.mainNode}
                </div>
                <div className="flex gap-2">
                   <button onClick={()=>updateStatus(t.id, 'RESOLVED')} className="w-full text-xs font-bold py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 flex items-center justify-center gap-1"><CheckCircle size={14}/> Solucionar</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RESUELTOS */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 opacity-75">
          <h3 className="font-black text-slate-700 mb-4 pb-2 border-b-2 border-slate-100 flex justify-between">
            RESUELTOS <span className="bg-emerald-100 text-emerald-700 px-2 rounded-full">{tickets.filter(t=>t.status==='RESOLVED').length}</span>
          </h3>
          <div className="space-y-3">
            {tickets.filter(t => t.status === 'RESOLVED').map(t => (
              <div key={t.id} className="bg-slate-50 p-4 rounded-xl border border-emerald-200">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold line-through text-slate-500 leading-tight">{t.title}</h4>
                </div>
                <p className="text-xs text-slate-400 mb-3">{t.description}</p>
                <div className="text-xs font-medium text-slate-400">
                  Resuelto a las: {new Date(t.updatedAt).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-slate-50 p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">{editingId ? 'Editar Ticket' : 'Levantar Ticket'}</h3>
            </div>
            <form onSubmit={saveTicket} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Cliente Afectado</label>
                <select required value={form.clientId} onChange={e=>setForm({...form, clientId: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none">
                  <option value="">Seleccione un cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name} - {c.dni}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Titulo Breve</label>
                <input required type="text" value={form.title} onChange={e=>setForm({...form, title: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" placeholder="Ej: Sin internet, cable cortado..." />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Descripción del Problema</label>
                <textarea required rows={3} value={form.description} onChange={e=>setForm({...form, description: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" placeholder="Detalles de la falla"></textarea>
              </div>
              <div className="grid grid-cols-2 gap-3 pb-3">
                <button type="button" onClick={()=>setForm({...form, priority: 'NORMAL'})} className={`py-2 rounded-xl font-bold text-sm border-2 ${form.priority==='NORMAL'?'border-blue-500 bg-blue-50 text-blue-700':'border-slate-200 text-slate-400'}`}>Baja / Lenta</button>
                <button type="button" onClick={()=>setForm({...form, priority: 'HIGH'})} className={`py-2 rounded-xl font-bold text-sm border-2 ${form.priority==='HIGH'?'border-red-500 bg-red-50 text-red-700':'border-slate-200 text-slate-400'}`}>Urgente / Cortado</button>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setShowModal(false); setEditingId(null); setForm({ clientId: '', title: '', description: '', priority: 'NORMAL' }); }} className="flex-1 bg-white border border-slate-200 text-slate-600 px-4 py-3 rounded-xl font-bold">Cancelar</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-xl font-bold">{editingId ? 'Actualizar' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
