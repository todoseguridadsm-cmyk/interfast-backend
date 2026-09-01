import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Edit2, Server, Power } from 'lucide-react';

export default function NodesList() {
  const [nodes, setNodes] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: 8728,
    webPort: 80,
    user: '',
    password: '',
    isActive: true
  });

  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : { role: 'STAFF' };
  const isAdmin = user.role === 'ADMIN';

  useEffect(() => {
    fetchNodes();
  }, []);

  const fetchNodes = async () => {
    try {
      const res = await axios.get('https://interfast-backend-95ww.onrender.com/api/nodes');
      setNodes(res.data);
    } catch (error) {
      console.error('Error fetching nodes:', error);
    }
  };

  const handleOpenModal = (node = null) => {
    if (node) {
      setEditingNode(node);
      setFormData({
        name: node.name,
        host: node.host,
        port: node.port,
        webPort: node.webPort || 80,
        user: node.user,
        password: node.password,
        isActive: node.isActive
      });
    } else {
      setEditingNode(null);
      setFormData({ name: '', host: '', port: 8728, webPort: 80, user: '', password: '', isActive: true });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingNode(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingNode) {
        await axios.put(`https://interfast-backend-95ww.onrender.com/api/nodes/${editingNode.id}`, formData);
      } else {
        await axios.post('https://interfast-backend-95ww.onrender.com/api/nodes', formData);
      }
      closeModal();
      fetchNodes();
    } catch (error) {
      console.error(error);
      alert('Error al guardar el nodo. Verifica que el nombre no esté duplicado.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este nodo? Los clientes asociados perderán la conexión automática.')) return;
    try {
      await axios.delete(`https://interfast-backend-95ww.onrender.com/api/nodes/${id}`);
      fetchNodes();
    } catch (error) {
      console.error(error);
      alert('Error al eliminar');
    }
  };

  if (!isAdmin) {
    return <div className="p-8 text-center text-slate-400">Acceso Denegado</div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Server className="text-blue-600" />
            Nodos (Routers Mikrotik)
          </h2>
          <p className="text-slate-500 text-sm mt-1">Configura múltiples routers para el corte automático</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          Nuevo Nodo
        </button>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">Nombre (mainNode)</th>
                <th className="px-6 py-4 font-medium">Host / IP</th>
                <th className="px-6 py-4 font-medium">Puerto API</th>
                <th className="px-6 py-4 font-medium">Estado</th>
                <th className="px-6 py-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {nodes.map(node => (
                <tr key={node.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">{node.name}</td>
                  <td className="px-6 py-4 text-slate-600">{node.host}</td>
                  <td className="px-6 py-4 text-slate-600">{node.port}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${node.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {node.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <button onClick={() => window.location.assign(`winbox://${node.host}?user=${node.user}&pass=${node.password}`)} className="text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm border border-blue-200" title="Abrir en Winbox de Escritorio">
                      <img src="/winbox.jpg" alt="Winbox" className="w-5 h-5 inline-block mr-2 rounded-full" />
                      Winbox
                    </button>
                    <button onClick={() => handleOpenModal(node)} className="text-blue-500 hover:text-blue-700 transition-colors inline-flex items-center justify-center p-2 rounded-lg hover:bg-blue-50" title="Editar">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(node.id)} className="text-red-500 hover:text-red-700 transition-colors inline-flex items-center justify-center p-2 rounded-lg hover:bg-red-50" title="Eliminar">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {nodes.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                    No hay nodos registrados. Agrega uno nuevo para comenzar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">{editingNode ? 'Editar Nodo' : 'Nuevo Nodo'}</h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Exacto del Nodo (mainNode)*</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Ej: La Colonia"
                />
                <p className="text-xs text-slate-500 mt-1">Este nombre debe coincidir exactamente con el texto que tienen los clientes en su campo 'Nodo'.</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Host / Dirección (DNS o IP)*</label>
                <input 
                  type="text" 
                  required
                  value={formData.host}
                  onChange={e => setFormData({...formData, host: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Ej: e3220fe9b4c6.sn.mynetname.net"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Puerto de API*</label>
                <input 
                  type="number" 
                  required
                  value={formData.port}
                  onChange={e => setFormData({...formData, port: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="8728"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Puerto WebFig</label>
                <input 
                  type="number" 
                  required
                  value={formData.webPort}
                  onChange={e => setFormData({...formData, webPort: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="80"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Usuario de Mikrotik*</label>
                <input 
                  type="text" 
                  required
                  value={formData.user}
                  onChange={e => setFormData({...formData, user: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña*</label>
                <input 
                  type="password" 
                  required
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="isActive"
                  checked={formData.isActive}
                  onChange={e => setFormData({...formData, isActive: e.target.checked})}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-700">Nodo Activo (Conectar automáticamente)</label>
              </div>

              <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-100">
                <button type="button" onClick={closeModal} className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm">
                  Guardar Nodo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
