import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserMinus, Check, RotateCcw, Trash2, Search, AlertCircle, Edit2, Power } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://interfast-backend-95ww.onrender.com/api';

export default function RetirosList() {
  const [bajas, setBajas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : { role: 'STAFF' };
  const isAdmin = user.role === 'ADMIN';
  const canManageClients = isAdmin || (user.permissions && Array.isArray(user.permissions) && (user.permissions.includes('CLIENTES') || user.permissions.includes('ALL')));

  useEffect(() => {
    fetchBajas();
  }, []);

  const fetchBajas = async () => {
    try {
      setLoading(true);
      const res = await axios.get(${API_URL}/clients/bajas);
      setBajas(res.data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Error al cargar la lista de retiros.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id) => {
    if (!window.confirm('¿Estás seguro de dar de alta nuevamente a este cliente? Volverá a la sección principal.')) return;
    try {
      await axios.put(${API_URL}/clients//status, { status: 'ACTIVE' });
      fetchBajas();
    } catch (err) {
      console.error(err);
      alert('Error al restablecer cliente');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar a este cliente DEFINITIVAMENTE? Esta acción no se puede deshacer.')) return;
    try {
      await axios.delete(${API_URL}/clients/);
      fetchBajas();
    } catch (err) {
      console.error(err);
      alert('Error al eliminar');
    }
  };

  const handleCutoff = async (id) => {
    if (!window.confirm('¿Estás seguro de CORTAR el servicio a este cliente en el Router Mikrotik?')) return;
    try {
      await axios.put(${API_URL}/clients//status, { status: 'BAJA' });
      alert('Comando de corte enviado al Mikrotik.');
      fetchBajas();
    } catch (err) {
      console.error(err);
      alert('Error al cortar servicio');
    }
  };

  const filteredBajas = bajas.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.dni?.includes(searchTerm) || 
    c.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className=""p-8 text-center text-slate-500"">Cargando clientes inactivos...</div>;
  if (error) return <div className=""p-8 text-center text-red-500"">{error}</div>;

  return (
    <div className=""bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"">
      <div className=""p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4"">
        <div>
          <h2 className=""text-xl font-bold text-slate-800 flex items-center gap-2"">
            <UserMinus className=""text-orange-500"" />
            Bajas / Retiros de Equipos
          </h2>
          <p className=""text-sm text-slate-500 mt-1"">
            Base de datos de clientes inactivos o retirados.
          </p>
        </div>
        
        <div className=""relative"">
          <Search className=""absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"" size={18} />
          <input 
            type=""text"" 
            placeholder=""Buscar por nombre, DNI o dir..."" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className=""pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none w-full md:w-64""
          />
        </div>
      </div>

      <div className=""overflow-x-auto"">
        <table className=""w-full text-left border-collapse"">
          <thead>
            <tr className=""bg-slate-50 border-b border-slate-200 text-sm text-slate-500 uppercase tracking-wider"">
              <th className=""p-4 font-medium"">Cliente</th>
              <th className=""p-4 font-medium hidden md:table-cell"">Dirección</th>
              <th className=""p-4 font-medium"">Plan / IP</th>
              <th className=""p-4 font-medium text-right"">Acciones</th>
            </tr>
          </thead>
          <tbody className=""divide-y divide-slate-200"">
            {filteredBajas.length === 0 ? (
              <tr>
                <td colSpan=""4"" className=""p-8 text-center text-slate-500"">
                  <AlertCircle className=""mx-auto text-slate-400 mb-2"" size={32} />
                  No hay clientes en la lista de retiros.
                </td>
              </tr>
            ) : (
              filteredBajas.map((client) => (
                <tr key={client.id} className=""transition-colors hover:bg-orange-50/20"">
                  <td className=""p-4"">
                    <div className=""font-medium text-slate-800"">{client.name}</div>
                    <div className=""text-xs text-slate-500"">DNI: {client.dni} | Tel: {client.phone}</div>
                  </td>
                  <td className=""p-4 hidden md:table-cell text-sm text-slate-600"">
                    {client.address}, {client.city}
                  </td>
                  <td className=""p-4 text-sm text-slate-600"">
                    <div className=""font-medium"">{client.plan?.name || '-'}</div>
                    <div className=""text-xs text-slate-500"">{client.ipNumber || 'Sin IP'}</div>
                  </td>
                  <td className=""p-4 text-right"">
                    <div className=""flex justify-end gap-2"">
                      {canManageClients && (
                        <>
                          <button 
                            onClick={() => handleCutoff(client.id)}
                            title=""Cortar Servicio (Mikrotik)""
                            className=""p-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors""
                          >
                            <Power size={18} />
                          </button>
                          <button 
                            onClick={() => handleRestore(client.id)}
                            title=""Dar de alta nuevamente""
                            className=""p-1.5 bg-emerald-100 text-emerald-600 hover:bg-emerald-200 rounded-lg transition-colors""
                          >
                            <RotateCcw size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(client.id)}
                            title=""Eliminar Cliente""
                            className=""p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-lg transition-colors""
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
