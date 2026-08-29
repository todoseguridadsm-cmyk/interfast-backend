import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserMinus, RotateCcw, Trash2, Search, AlertCircle, Power, Wifi, WifiOff, Calendar } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://interfast-backend-95ww.onrender.com/api';

export default function RetirosList() {
  const [bajas, setBajas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(null); // id del cliente en accion
  const [editingDate, setEditingDate] = useState(null);
  const [dateInput, setDateInput] = useState('');

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
      const res = await axios.get(`${API_URL}/clients/bajas`);
      setBajas(res.data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Error al cargar la lista de retiros.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableService = async (id) => {
    if (!window.confirm('¿Dar servicio de internet a este cliente SIN darlo de alta?')) return;
    try {
      setActionLoading(id);
      const res = await axios.put(`${API_URL}/clients/${id}/enable-service`);
      alert(`✅ ${res.data.message}`);
      fetchBajas();
    } catch (err) {
      console.error(err);
      alert('❌ Error al habilitar servicio: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisableService = async (id) => {
    if (!window.confirm('¿Cortar el servicio de internet a este cliente?')) return;
    try {
      setActionLoading(id);
      const res = await axios.put(`${API_URL}/clients/${id}/disable-service`);
      alert(`✅ ${res.data.message}`);
      fetchBajas();
    } catch (err) {
      console.error(err);
      alert('❌ Error al cortar servicio: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestore = async (id) => {
    if (!window.confirm('¿Dar de alta nuevamente a este cliente? Volverá a la sección principal como ACTIVO.')) return;
    try {
      await axios.put(`${API_URL}/clients/${id}/status`, { status: 'ACTIVE' });
      fetchBajas();
    } catch (err) {
      console.error(err);
      alert('Error al restablecer cliente');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar a este cliente DEFINITIVAMENTE? Esta acción no se puede deshacer.')) return;
    try {
      await axios.delete(`${API_URL}/clients/${id}`);
      fetchBajas();
    } catch (err) {
      console.error(err);
      alert('Error al eliminar');
    }
  };

  const handleSaveServiceDate = async (clientId) => {
    try {
      // Find the cancellationRequest for this client
      const client = bajas.find(c => c.id === clientId);
      const cr = client?.cancellationRequests?.[0];
      if (!cr) {
        alert('Este cliente no tiene solicitud de baja asociada. Creando una...');
        await axios.post(`${API_URL}/bajas`, {
          clientId: clientId,
          reason: 'Baja existente',
          keepServiceUntil: dateInput || null
        });
      } else {
        await axios.patch(`${API_URL}/bajas/${cr.id}/service-date`, {
          keepServiceUntil: dateInput || null
        });
      }
      setEditingDate(null);
      setDateInput('');
      fetchBajas();
    } catch (err) {
      console.error(err);
      alert('Error al guardar fecha');
    }
  };

  const filteredBajas = bajas.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.dni?.includes(searchTerm) ||
    c.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(c.id).includes(searchTerm)
  );

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando clientes inactivos...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <UserMinus className="text-orange-500" />
            Bajas / Retiros de Antena
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Base de datos de clientes inactivos o retirados. Podés dar o cortar servicio sin dar de alta.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">{filteredBajas.length} clientes</span>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nombre, DNI, N°..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none w-full md:w-64"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-500 uppercase tracking-wider">
              <th className="p-4 font-medium">N° / TK</th>
              <th className="p-4 font-medium">Cliente</th>
              <th className="p-4 font-medium hidden md:table-cell">Dirección</th>
              <th className="p-4 font-medium">Plan / IP</th>
              <th className="p-4 font-medium">Servicio hasta</th>
              <th className="p-4 font-medium text-center">Internet</th>
              <th className="p-4 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredBajas.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-slate-500">
                  <AlertCircle className="mx-auto text-slate-400 mb-2" size={32} />
                  No hay clientes en la lista de retiros.
                </td>
              </tr>
            ) : (
              filteredBajas.map((client) => {
                const cr = client.cancellationRequests?.[0];
                const keepUntil = cr?.keepServiceUntil ? new Date(cr.keepServiceUntil) : null;
                const serviceActive = keepUntil && keepUntil > new Date();
                return (
                  <tr key={client.id} className="transition-colors hover:bg-orange-50/20">
                    {/* N° Cliente + Tickets */}
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full w-fit">
                          #&nbsp;{client.id}
                        </span>
                        {client.tickets?.map(tk => (
                          <span key={tk.id} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full w-fit">
                            TK{tk.id} · {tk.title?.slice(0, 18)}{tk.title?.length > 18 ? '...' : ''}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Cliente */}
                    <td className="p-4">
                      <div className="font-medium text-slate-800">{client.name}</div>
                      <div className="text-xs text-slate-500">DNI: {client.dni} | Tel: {client.phone}</div>
                    </td>

                    {/* Dirección */}
                    <td className="p-4 hidden md:table-cell text-sm text-slate-600">
                      {client.address}, {client.city}
                    </td>

                    {/* Plan / IP */}
                    <td className="p-4 text-sm text-slate-600">
                      <div className="font-medium">{client.plan?.name || '-'}</div>
                      <div className="text-xs text-slate-500">{client.ipNumber || 'Sin IP'}</div>
                    </td>

                    {/* Servicio hasta */}
                    <td className="p-4">
                      {editingDate === client.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="date"
                            value={dateInput}
                            onChange={e => setDateInput(e.target.value)}
                            className="text-xs border border-slate-300 rounded px-2 py-1 w-32"
                          />
                          <button
                            onClick={() => handleSaveServiceDate(client.id)}
                            className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-xs font-bold"
                          >✓</button>
                          <button
                            onClick={() => { setEditingDate(null); setDateInput(''); }}
                            className="p-1 bg-slate-100 text-slate-500 rounded hover:bg-slate-200 text-xs font-bold"
                          >✕</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {keepUntil ? (
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${serviceActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                              {serviceActive ? <Wifi size={11} /> : <WifiOff size={11} />}
                              {keepUntil.toLocaleDateString('es-AR')}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">-</span>
                          )}
                          <button
                            onClick={() => {
                              setEditingDate(client.id);
                              setDateInput(keepUntil ? keepUntil.toISOString().split('T')[0] : '');
                            }}
                            className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                            title="Editar fecha de servicio"
                          >
                            <Calendar size={14} />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Botones Dar / Cortar servicio */}
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEnableService(client.id)}
                          disabled={actionLoading === client.id}
                          title="Dar Servicio (sin dar de alta)"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200 transition-colors disabled:opacity-50"
                        >
                          <Wifi size={14} /> Dar
                        </button>
                        <button
                          onClick={() => handleDisableService(client.id)}
                          disabled={actionLoading === client.id}
                          title="Cortar Servicio"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 transition-colors disabled:opacity-50"
                        >
                          <WifiOff size={14} /> Cortar
                        </button>
                      </div>
                    </td>

                    {/* Acciones */}
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        {canManageClients && (
                          <>
                            <button
                              onClick={() => handleRestore(client.id)}
                              title="Dar de alta nuevamente (ACTIVO)"
                              className="p-1.5 bg-emerald-100 text-emerald-600 hover:bg-emerald-200 rounded-lg transition-colors"
                            >
                              <RotateCcw size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(client.id)}
                              title="Eliminar Cliente"
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
