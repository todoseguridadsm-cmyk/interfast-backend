import { useState, useEffect } from 'react';
import axios from 'axios';
import { Megaphone, Server, Send, Users, Loader2 } from 'lucide-react';

export default function BroadcastList() {
  const [clients, setClients] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch nodes and clients
    axios.get('https://interfast-backend-95ww.onrender.com/api/nodes')
      .then(res => setNodes(res.data))
      .catch(err => console.error('Error fetching nodes:', err));

    axios.get('https://interfast-backend-95ww.onrender.com/api/clients')
      .then(res => setClients(res.data))
      .catch(err => console.error('Error fetching clients:', err));
  }, []);

  const filteredClients = clients.filter(c => c.mainNode === selectedNode && c.status === 'ACTIVE' && c.phone);

  const handleSendBroadcast = async () => {
    if (!selectedNode) return alert('Por favor, selecciona un nodo primero.');
    if (!message.trim()) return alert('Por favor, escribe un mensaje.');
    if (filteredClients.length === 0) return alert('No hay clientes activos con teléfono en este nodo.');

    const confirmMsg = `¿Estás seguro de enviar esta difusión a los ${filteredClients.length} clientes del nodo ${selectedNode}?`;
    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    try {
      const payload = {
        nodeName: selectedNode,
        message: message,
        clients: filteredClients.map(c => ({
          id: c.id,
          name: c.name,
          phone: c.phone
        }))
      };

      const res = await axios.post('https://interfast-backend-95ww.onrender.com/api/bot/broadcast-n8n', payload);
      alert(res.data.message || 'Difusión enviada correctamente.');
      setMessage('');
    } catch (error) {
      console.error(error);
      alert('Hubo un error al enviar la difusión: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <Megaphone className="text-indigo-600" size={32} />
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Difusión por Nodos</h2>
          <p className="text-slate-500 mt-1">Envía mensajes masivos vía Sofi a todos los clientes de un nodo específico.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Controles y Mensaje */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Server size={20} className="text-slate-400" />
              Seleccionar Nodo
            </h3>
            <select
              value={selectedNode}
              onChange={(e) => setSelectedNode(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
            >
              <option value="">-- Elige un Nodo --</option>
              {nodes.map(n => (
                <option key={n.id} value={n.name}>{n.name}</option>
              ))}
            </select>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Megaphone size={20} className="text-slate-400" />
              Mensaje a Enviar
            </h3>
            <p className="text-xs text-slate-500 mb-3">El mensaje se enviará tal cual a todos los clientes de la lista.</p>
            <textarea
              rows="6"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hola! Te informamos que hoy de 15 a 17 hs habrá un corte programado..."
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
            ></textarea>

            <button
              onClick={handleSendBroadcast}
              disabled={loading || !selectedNode || !message.trim() || filteredClients.length === 0}
              className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
              {loading ? 'Enviando...' : `Enviar a ${filteredClients.length} clientes`}
            </button>
          </div>
        </div>

        {/* Columna Derecha: Lista de Clientes */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Users size={20} className="text-slate-400" />
                Clientes Activos del Nodo ({filteredClients.length})
              </h3>
            </div>
            
            {selectedNode ? (
              filteredClients.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                        <th className="px-4 py-3 font-semibold">Cliente</th>
                        <th className="px-4 py-3 font-semibold">Teléfono</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredClients.map(client => (
                        <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">{client.name}</div>
                            <div className="text-xs text-slate-500">TK{String(client.id).padStart(3, '0')}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {client.phone}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                  <Users size={48} className="mb-4 opacity-20" />
                  <p>No se encontraron clientes activos con teléfono en el nodo {selectedNode}.</p>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                <Server size={48} className="mb-4 opacity-20" />
                <p>Selecciona un nodo para ver los clientes.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
