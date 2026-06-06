import { useState, useEffect } from 'react';
import axios from 'axios';
import { Radio, Download, RefreshCw, Server, Search } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ActiveConnections() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const res = await axios.get('https://interfast-backend-95ww.onrender.com/api/mikrotik/active-clients');
      setData(res.data);
    } catch(err) {
      console.error("Error cargando conexiones:", err);
      alert("Hubo un error al obtener las conexiones en vivo.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const exportExcel = () => {
    if (data.length === 0) return alert('No hay conexiones activas para exportar.');
    
    const rows = data.map(c => ({
      'Estado': c.matched ? 'Registrado en CRM' : 'Desconocido',
      'Nombre del Cliente': c.clientName,
      'DNI': c.clientDni || '',
      'IP Asignada': c.ip,
      'Dirección MAC / Usuario': c.mac,
      'Tipo de Conexión': c.type,
      'Nodo Conectado': c.nodeName,
      'Panel (Antena)': c.panel,
      'Plan Asignado': c.planName,
      'Tiempo Online (Uptime)': c.uptime
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Conexiones en Vivo");
    XLSX.writeFile(workbook, `Conexiones_En_Vivo_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filtered = data.filter(c => 
    (c.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.ip || '').includes(searchTerm) ||
    (c.nodeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.panel || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <div className="relative">
              <Radio className="text-blue-600" size={32} />
              <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
              <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full"></span>
            </div>
            Conexiones en Vivo
          </h2>
          <p className="text-slate-500 mt-1 ml-11">Visor en tiempo real de los dispositivos conectados a los Nodos.</p>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={fetchConnections}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            {loading ? "Escanenando..." : "Actualizar Escaneo"}
          </button>
          
          <button 
            onClick={exportExcel}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-md shadow-emerald-200 transition-colors"
          >
            <Download size={18} />
            Exportar a Excel
          </button>
        </div>
      </header>

      {/* KPI Stats */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
              <Radio size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Conectados</p>
              <h3 className="text-2xl font-black text-slate-800">{data.length}</h3>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
              <Server size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Reconocidos (CRM)</p>
              <h3 className="text-2xl font-black text-slate-800">{data.filter(d=>d.matched).length}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center">
              <Server size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Desconocidos</p>
              <h3 className="text-2xl font-black text-slate-800">{data.filter(d=>!d.matched).length}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-full flex items-center justify-center">
              <Search size={24} />
            </div>
            <div className="w-full">
              <p className="text-sm font-medium text-slate-500 mb-1">Filtrar tabla</p>
              <input 
                type="text" 
                placeholder="Buscar cliente, IP..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full text-sm font-bold border-b-2 border-slate-200 outline-none focus:border-blue-500 pb-1"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center">
            <RefreshCw size={48} className="animate-spin mb-4 text-blue-500 opacity-50" />
            <h3 className="text-xl font-bold text-slate-700">Conectando a los Mikrotiks...</h3>
            <p className="mt-2 text-sm">Estamos descargando las tablas ARP, DHCP y PPPoE en tiempo real. Por favor espere unos segundos.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            No se encontraron conexiones activas con los filtros actuales.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="p-4 font-bold">Estado</th>
                  <th className="p-4 font-bold">Cliente en CRM</th>
                  <th className="p-4 font-bold">Dirección IP</th>
                  <th className="p-4 font-bold">MAC / Usuario</th>
                  <th className="p-4 font-bold">Nodo</th>
                  <th className="p-4 font-bold">Panel Asignado</th>
                  <th className="p-4 font-bold text-right">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      {c.matched ? (
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">Validado</span>
                      ) : (
                        <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">Desconocido</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className={`text-sm font-bold ${c.matched ? 'text-slate-900' : 'text-slate-400 italic'}`}>
                        {c.clientName}
                      </div>
                      {c.clientDni && <div className="text-xs text-slate-500 font-mono mt-0.5">{c.clientDni}</div>}
                    </td>
                    <td className="p-4 font-mono text-sm font-bold text-blue-600">
                      {c.ip}
                    </td>
                    <td className="p-4 font-mono text-xs text-slate-500">
                      {c.mac}
                    </td>
                    <td className="p-4">
                      <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md text-xs font-bold uppercase">
                        {c.nodeName}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-bold text-slate-700">{c.panel}</div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="text-xs font-bold text-slate-400 uppercase">{c.type}</div>
                      {c.uptime !== 'N/A' && <div className="text-[10px] text-slate-400 mt-0.5">UP: {c.uptime}</div>}
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
