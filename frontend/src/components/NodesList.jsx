import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Server, 
  Wifi, 
  Radio, 
  Cpu, 
  Zap, 
  Plus, 
  Trash2, 
  Edit2, 
  Search, 
  ExternalLink, 
  Layers, 
  LayoutGrid, 
  List, 
  Activity,
  ShieldCheck,
  Power
} from 'lucide-react';

export default function NodesList() {
  const [nodes, setNodes] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('GRID'); // 'GRID' | 'TABLE'
  
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
    if (!window.confirm('¿Estás seguro de eliminar este nodo? Los clientes asociados perderán la sincronización de cortes.')) return;
    try {
      await axios.delete(`https://interfast-backend-95ww.onrender.com/api/nodes/${id}`);
      fetchNodes();
    } catch (error) {
      console.error(error);
      alert('Error al eliminar nodo');
    }
  };

  const openWinbox = (node) => {
    window.location.assign(`winbox://${node.host}?user=${node.user}&pass=${node.password}`);
  };

  const filteredNodes = useMemo(() => {
    return nodes.filter(n => 
      n.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.host.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [nodes, searchTerm]);

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#040814] text-slate-400 p-8 rounded-3xl border border-cyan-500/20">
        <div className="text-center">
          <ShieldCheck size={48} className="mx-auto text-cyan-500 mb-3 opacity-50" />
          <h3 className="text-xl font-bold text-white">Acceso Restringido</h3>
          <p className="text-sm mt-1">Se requieren privilegios de Administrador para gestionar la infraestructura de Nodos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#040814] text-slate-100 p-4 md:p-8 rounded-3xl overflow-hidden border border-cyan-500/20 shadow-2xl">
      
      {/* Background Cyber Glow Texture */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-0" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(#00f0ff_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.04] pointer-events-none" />

      {/* Cyber Header */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b border-cyan-500/20 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-400/40 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.25)] flex items-center justify-center">
            <Server className="text-cyan-400" size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest font-black text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-500/30">
                MIKROTIK CORE NETWORK
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> {nodes.length} Nodos Activos
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white mt-1 drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]">
              Nodos de Red & Routers Mikrotik
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-0.5">
              Haz clic sobre cualquier nodo holográfico para acceder de inmediato por Winbox
            </p>
          </div>
        </div>

        {/* Action Buttons & View Mode */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* View Mode Toggle */}
          <div className="bg-[#091224] border border-cyan-500/30 p-1 rounded-xl flex items-center gap-1">
            <button
              onClick={() => setViewMode('GRID')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'GRID' ? 'bg-cyan-500 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white'
              }`}
              title="Vista Matriz Holográfica"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'TABLE' ? 'bg-cyan-500 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white'
              }`}
              title="Vista Tabla Técnica"
            >
              <List size={18} />
            </button>
          </div>

          <button 
            onClick={() => handleOpenModal()}
            className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.5)] flex items-center gap-2 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus size={16} />
            <span>Nuevo Nodo</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="relative z-10 mb-6 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar nodo por nombre o dirección IP/Host..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#070f20]/90 border border-cyan-500/30 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all shadow-inner"
          />
        </div>

        <div className="text-xs text-slate-400 hidden sm:block">
          Mostrando <span className="font-bold text-cyan-400">{filteredNodes.length}</span> de <span className="font-bold text-white">{nodes.length}</span> nodos
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* VISTA 1: MATRIZ HOLOGRÁFICA DE NODOS (GRID FUTURISTA) */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'GRID' && (
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNodes.map(node => (
            <div 
              key={node.id}
              className="group relative bg-[#070f20]/90 border border-cyan-500/30 hover:border-cyan-400 rounded-3xl p-6 shadow-xl backdrop-blur-md transition-all duration-300 hover:shadow-[0_0_35px_rgba(6,182,212,0.35)] flex flex-col justify-between overflow-hidden"
            >
              {/* Corner Circuit Accents */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-bl-full pointer-events-none" />

              <div>
                {/* Node Header & Holographic Badge (Click to launch Winbox) */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div 
                    onClick={() => openWinbox(node)}
                    className="flex items-center gap-3 cursor-pointer group/title"
                    title="Haz clic para abrir en Winbox"
                  >
                    {/* Hologram Circle Icon */}
                    <div className="relative p-3.5 bg-[#030814] border border-cyan-500/50 group-hover:border-cyan-400 rounded-2xl shadow-[0_0_15px_rgba(6,182,212,0.25)] flex items-center justify-center transition-transform group-hover:scale-105">
                      <Wifi className="text-cyan-400" size={24} />
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#070f20] shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                    </div>

                    <div>
                      <h3 className="font-black text-lg text-white group-hover/title:text-cyan-300 transition-colors tracking-tight flex items-center gap-2">
                        {node.name}
                      </h3>
                      <span className="text-[11px] font-mono text-cyan-400/80 block truncate max-w-[170px]">
                        {node.host}
                      </span>
                    </div>
                  </div>

                  {/* Edit / Delete Icons */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleOpenModal(node)}
                      className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/60 rounded-lg transition-colors cursor-pointer"
                      title="Editar parámetros del nodo"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(node.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/60 rounded-lg transition-colors cursor-pointer"
                      title="Eliminar nodo"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Technical Node Telemetry Grid */}
                <div className="grid grid-cols-2 gap-2.5 my-4 p-3 bg-[#030814]/80 border border-cyan-500/20 rounded-2xl text-xs font-mono">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Puerto API</span>
                    <span className="text-cyan-300 font-bold">{node.port || 8728}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Puerto WebFig</span>
                    <span className="text-cyan-300 font-bold">{node.webPort || 80}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Usuario Mikrotik</span>
                    <span className="text-slate-200 font-bold truncate block">{node.user}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Estado de Enlace</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Activo
                    </span>
                  </div>
                </div>
              </div>

              {/* Direct Access Buttons Deck */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2">
                {/* Winbox Direct Button */}
                <button 
                  onClick={() => openWinbox(node)}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:shadow-[0_0_20px_rgba(37,99,235,0.7)] flex items-center justify-center gap-2 cursor-pointer"
                  title="Lanzar aplicación nativa Winbox"
                >
                  <img src="/winbox.jpg" alt="Winbox" className="w-4 h-4 rounded-full inline" />
                  <span>Abrir Winbox</span>
                </button>

                {/* WebFig Direct Button */}
                <a 
                  href={`http://${node.host}:${node.webPort || 80}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 bg-[#030814] hover:bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 hover:text-cyan-200 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  title="Abrir interfaz web WebFig"
                >
                  <ExternalLink size={14} />
                  <span>WebFig</span>
                </a>
              </div>
            </div>
          ))}

          {filteredNodes.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-500 bg-[#070f20]/90 border border-cyan-500/20 rounded-3xl">
              <Server size={48} className="mx-auto mb-3 text-cyan-500 opacity-40" />
              <p className="text-sm font-bold text-white">No se encontraron nodos registrados.</p>
              <p className="text-xs text-slate-400 mt-1">Presiona "Nuevo Nodo" para dar de alta tu primer router Mikrotik.</p>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VISTA 2: TABLA TÉCNICA AVANZADA */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'TABLE' && (
        <div className="relative z-10 bg-[#070f20]/90 border border-cyan-500/30 rounded-3xl overflow-hidden shadow-xl backdrop-blur-md">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-[#030814] text-cyan-300 text-[11px] uppercase tracking-wider border-b border-cyan-500/20">
                  <th className="px-6 py-4 font-bold">Nombre del Nodo</th>
                  <th className="px-6 py-4 font-bold">Host / Dirección</th>
                  <th className="px-6 py-4 font-bold">Puertos (API / Web)</th>
                  <th className="px-6 py-4 font-bold">Usuario</th>
                  <th className="px-6 py-4 font-bold">Estado</th>
                  <th className="px-6 py-4 font-bold text-right">Acciones Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-xs">
                {filteredNodes.map(node => (
                  <tr key={node.id} className="hover:bg-[#09162e]/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-white flex items-center gap-2.5">
                      <button 
                        onClick={() => openWinbox(node)}
                        className="p-1.5 bg-[#030814] border border-cyan-500/40 rounded-lg text-cyan-400 hover:text-white transition-colors cursor-pointer"
                        title="Abrir en Winbox"
                      >
                        <Wifi size={16} />
                      </button>
                      <span 
                        onClick={() => openWinbox(node)} 
                        className="cursor-pointer hover:text-cyan-300 transition-colors"
                      >
                        {node.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-cyan-300">{node.host}</td>
                    <td className="px-6 py-4 font-mono text-slate-400">
                      API: <span className="text-white font-bold">{node.port || 8728}</span> | Web: <span className="text-white font-bold">{node.webPort || 80}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-300">{node.user}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Activo
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <button 
                          onClick={() => openWinbox(node)} 
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer text-xs"
                          title="Lanzar Winbox"
                        >
                          <img src="/winbox.jpg" alt="Winbox" className="w-3.5 h-3.5 rounded-full inline" />
                          <span>Winbox</span>
                        </button>
                        <button 
                          onClick={() => handleOpenModal(node)} 
                          className="p-1.5 bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 rounded-lg transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button 
                          onClick={() => handleDelete(node.id)} 
                          className="p-1.5 bg-slate-900 border border-slate-700 hover:border-red-400 text-slate-300 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL NUEVO / EDITAR NODO (CYBER DARK GLASSMORPHISM) */}
      {/* ------------------------------------------------------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#030712]/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-[#070f20] border border-cyan-500/40 rounded-3xl w-full max-w-lg shadow-[0_0_50px_rgba(6,182,212,0.3)] overflow-hidden">
            
            <div className="px-6 py-4 border-b border-cyan-500/20 flex justify-between items-center bg-[#030814]">
              <div className="flex items-center gap-2.5">
                <Server size={20} className="text-cyan-400" />
                <h3 className="text-base font-bold text-white">
                  {editingNode ? `Editar Nodo: ${editingNode.name}` : 'Registrar Nuevo Router Mikrotik'}
                </h3>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-cyan-300 uppercase tracking-wider mb-1.5">
                  Nombre Exacto del Nodo (mainNode)*
                </label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-[#030814] border border-cyan-500/30 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  placeholder="Ej: La Colonia"
                />
                <p className="text-[11px] text-slate-400 mt-1">Debe coincidir exactamente con el campo 'Nodo' asignado a los clientes.</p>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-cyan-300 uppercase tracking-wider mb-1.5">
                  Host / Dirección IP o DNS Mikrotik (Cloud DNS)*
                </label>
                <input 
                  type="text" 
                  required
                  value={formData.host}
                  onChange={e => setFormData({...formData, host: e.target.value})}
                  className="w-full px-4 py-2.5 bg-[#030814] border border-cyan-500/30 rounded-xl text-xs font-mono text-cyan-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  placeholder="Ej: e3220fe9b4c6.sn.mynetname.net"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-cyan-300 uppercase tracking-wider mb-1.5">
                    Puerto API Mikrotik*
                  </label>
                  <input 
                    type="number" 
                    required
                    value={formData.port}
                    onChange={e => setFormData({...formData, port: parseInt(e.target.value)})}
                    className="w-full px-4 py-2.5 bg-[#030814] border border-cyan-500/30 rounded-xl text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    placeholder="8728"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-cyan-300 uppercase tracking-wider mb-1.5">
                    Puerto WebFig
                  </label>
                  <input 
                    type="number" 
                    required
                    value={formData.webPort}
                    onChange={e => setFormData({...formData, webPort: parseInt(e.target.value)})}
                    className="w-full px-4 py-2.5 bg-[#030814] border border-cyan-500/30 rounded-xl text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    placeholder="80"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-cyan-300 uppercase tracking-wider mb-1.5">
                    Usuario Mikrotik*
                  </label>
                  <input 
                    type="text" 
                    required
                    value={formData.user}
                    onChange={e => setFormData({...formData, user: e.target.value})}
                    className="w-full px-4 py-2.5 bg-[#030814] border border-cyan-500/30 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    placeholder="admin"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-cyan-300 uppercase tracking-wider mb-1.5">
                    Contraseña*
                  </label>
                  <input 
                    type="password" 
                    required
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full px-4 py-2.5 bg-[#030814] border border-cyan-500/30 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={closeModal} 
                  className="px-5 py-2.5 text-xs font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 text-xs font-black text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.5)] cursor-pointer uppercase tracking-wider"
                >
                  {editingNode ? 'Actualizar Nodo' : 'Guardar Nodo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
