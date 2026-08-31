import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Clock } from 'lucide-react';

export default function BroadcastPanel() {
  const [scope, setScope] = useState('ALL');
  const [targetId, setTargetId] = useState('');
  const [message, setMessage] = useState('');
  const [nodes, setNodes] = useState([]);
  const [panels, setPanels] = useState([]);
  const [allClients, setAllClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [selectedClientIds, setSelectedClientIds] = useState(new Set());
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const [resNodes, resPanels, resClients] = await Promise.all([
          axios.get('/api/nodes', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/api/panels', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/api/clients', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setNodes(resNodes.data);
        setPanels(resPanels.data);
        setAllClients(resClients.data.filter(c => c.status === 'ACTIVE' && c.phone && c.phone.length > 8));
      } catch (error) { console.error("Error cargando datos", error); }
    };
    fetchData();
  }, []);

  useEffect(() => {
    let currentFilter = [...allClients];
    if (scope === 'NODE' && targetId) currentFilter = currentFilter.filter(c => c.nodeRefId === parseInt(targetId));
    else if (scope === 'PANEL' && targetId) currentFilter = currentFilter.filter(c => c.panelRefId === parseInt(targetId));
    else if (scope !== 'ALL') currentFilter = [];
    
    setFilteredClients(currentFilter);
    setSelectedClientIds(new Set(currentFilter.map(c => c.id)));
  }, [scope, targetId, allClients]);

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

  const estimatedClients = selectedClientIds.size;
  const estimateTimeStr = () => {
    if (estimatedClients === 0) return '0 minutos';
    const totalSeconds = (estimatedClients * 20) + (Math.floor(estimatedClients / 40) * 90);
    const mins = Math.floor(totalSeconds / 60);
    return mins < 1 ? 'Menos de 1 minuto' : mins > 60 ? `~${(mins / 60).toFixed(1)} horas` : `~${mins} minutos`;
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!message.trim()) return alert("Mensaje vacío.");
    if (estimatedClients === 0) return alert("Selecciona un destinatario.");
    if (!window.confirm(`¿Confirmar envíos para ${estimatedClients} clientes?`)) return;
    setIsSending(true);
    try {
      await axios.post('/api/bot/broadcast-segmented', { clientIds: Array.from(selectedClientIds), message }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      alert('¡Campaña iniciada!');
      setMessage(''); setScope('ALL'); setTargetId('');
    } catch (error) { alert('Error al enviar'); } 
    finally { setIsSending(false); }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-slate-200">
      <form onSubmit={handleBroadcast} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700">Segmentación</label>
            <select value={scope} onChange={(e) => {setScope(e.target.value); setTargetId('');}} className="w-full p-3 border rounded-xl mb-2">
              <option value="ALL">Toda la Red</option>
              <option value="NODE">Por Nodo</option>
              <option value="PANEL">Por Panel</option>
            </select>
            {scope === 'NODE' && <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="w-full p-3 border rounded-xl"><option value="">Seleccionar Nodo...</option>{nodes.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}</select>}
            {scope === 'PANEL' && <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="w-full p-3 border rounded-xl"><option value="">Seleccionar Panel...</option>{panels.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}
          </div>
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700">Mensaje a Enviar</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="w-full p-3 border rounded-xl h-32" placeholder="Escribe el mensaje..."></textarea>
          </div>
        </div>

        {filteredClients.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-inner shadow-slate-50">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-700">Destinatarios Finales ({selectedClientIds.size}/{filteredClients.length})</span>
              <button type="button" onClick={toggleAll} className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded">
                {selectedClientIds.size === filteredClients.length ? 'Desmarcar Todos' : 'Marcar Todos'}
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {filteredClients.map(client => (
                <label key={client.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={selectedClientIds.has(client.id)} onChange={() => toggleClientSelection(client.id)} className="w-4 h-4 text-emerald-600 rounded cursor-pointer" />
                  <span className={`text-sm truncate ${selectedClientIds.has(client.id) ? 'text-slate-800 font-bold' : 'text-slate-400 line-through opacity-70'}`}>{client.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
          <span className="text-sm text-slate-600 flex items-center gap-2"><Clock size={16}/> Tiempo est.: <b>{estimateTimeStr()}</b></span>
          <button type="submit" disabled={isSending || estimatedClients === 0} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">
            {isSending ? 'Enviando...' : 'Iniciar Difusión'}
          </button>
        </div>
      </form>
    </div>
  );
}
