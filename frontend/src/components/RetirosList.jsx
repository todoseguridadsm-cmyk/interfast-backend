import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  UserMinus, RotateCcw, Trash2, Search, AlertCircle, 
  Wifi, WifiOff, Calendar, Clock, X, CheckSquare, Square, PlusCircle
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://interfast-backend-95ww.onrender.com/api';

export default function RetirosList() {
  const [bajas, setBajas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [editingDate, setEditingDate] = useState(null);
  const [dateInput, setDateInput] = useState('');
  const [serviceStatus, setServiceStatus] = useState({}); // { clientId: true(cortado)/false(activo) }

  // Estado para el modal de agendamiento de retiro
  const [scheduleModalClient, setScheduleModalClient] = useState(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Estado para el modal de nuevo cliente para retiro manual
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientDni, setNewClientDni] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [newClientCity, setNewClientCity] = useState('San Martín');
  const [newClientNode, setNewClientNode] = useState('');
  const [newClientIp, setNewClientIp] = useState('');
  const [newClientObservation, setNewClientObservation] = useState('');
  const [newClientScheduleDate, setNewClientScheduleDate] = useState('');
  const [savingNewClient, setSavingNewClient] = useState(false);

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
      fetchServiceStatus();
    } catch (err) {
      console.error(err);
      setError('Error al cargar la lista de bajas y retiros.');
    } finally {
      setLoading(false);
    }
  };

  const fetchServiceStatus = async () => {
    try {
      const res = await axios.get(`${API_URL}/clients/bajas/service-status`);
      setServiceStatus(res.data);
    } catch (err) {
      console.error('Error al consultar estado de servicios:', err);
    }
  };

  const handleEnableService = async (id) => {
    if (!window.confirm('¿Dar servicio de internet a este cliente en Mikrotik?')) return;
    try {
      setActionLoading(id);
      const res = await axios.put(`${API_URL}/clients/${id}/enable-service`);
      alert(`✅ ${res.data.message}`);
      setServiceStatus(prev => ({ ...prev, [id]: false }));
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
      setServiceStatus(prev => ({ ...prev, [id]: true }));
    } catch (err) {
      console.error(err);
      alert('❌ Error al cortar servicio: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleAntenna = async (clientId, currentVal) => {
    try {
      const newVal = !currentVal;
      await axios.patch(`${API_URL}/clients/${clientId}/baja-details`, {
        antennaRetrieved: newVal
      });
      setBajas(prev => prev.map(c => {
        if (c.id === clientId) {
          const reqs = c.cancellationRequests || [];
          const updatedReqs = reqs.length > 0 
            ? [{ ...reqs[0], antennaRetrieved: newVal }]
            : [{ antennaRetrieved: newVal }];
          return { ...c, cancellationRequests: updatedReqs };
        }
        return c;
      }));
    } catch (err) {
      console.error(err);
      alert('Error al actualizar estado de la antena');
    }
  };

  const handleSaveServiceDate = async (clientId) => {
    try {
      await axios.patch(`${API_URL}/clients/${clientId}/baja-details`, {
        keepServiceUntil: dateInput || null
      });
      setEditingDate(null);
      setDateInput('');
      fetchBajas();
    } catch (err) {
      console.error(err);
      alert('Error al guardar fecha de servicio');
    }
  };

  const handleOpenScheduleModal = (client) => {
    setScheduleModalClient(client);
    const cr = client.cancellationRequests?.[0];
    if (cr?.scheduledRemovalAt) {
      const d = new Date(cr.scheduledRemovalAt);
      const pad = (n) => String(n).padStart(2, '0');
      const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      setScheduleDate(formatted);
    } else {
      setScheduleDate('');
    }
    setScheduleNotes(cr?.scheduledRemovalNotes || '');
  };

  const handleSaveSchedule = async () => {
    if (!scheduleModalClient) return;
    try {
      setSavingSchedule(true);
      await axios.patch(`${API_URL}/clients/${scheduleModalClient.id}/baja-details`, {
        scheduledRemovalAt: scheduleDate ? new Date(scheduleDate) : null,
        scheduledRemovalNotes: scheduleNotes
      });
      setScheduleModalClient(null);
      fetchBajas();
    } catch (err) {
      console.error(err);
      alert('Error al guardar agendamiento de retiro');
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleCreateManualBaja = async (e) => {
    e.preventDefault();
    if (!newClientName.trim()) {
      alert('Por favor ingresa el nombre del cliente');
      return;
    }
    try {
      setSavingNewClient(true);
      const res = await axios.post(`${API_URL}/clients/bajas/manual`, {
        name: newClientName,
        dni: newClientDni,
        phone: newClientPhone,
        address: newClientAddress,
        city: newClientCity,
        mainNode: newClientNode,
        ipNumber: newClientIp,
        observation: newClientObservation,
        scheduledRemovalAt: newClientScheduleDate || null,
        scheduledRemovalNotes: newClientObservation || null
      });
      alert(`✅ Retiro registrado correctamente (${res.data.client?.name})`);
      setShowAddModal(false);
      // Reset form
      setNewClientName('');
      setNewClientDni('');
      setNewClientPhone('');
      setNewClientAddress('');
      setNewClientNode('');
      setNewClientIp('');
      setNewClientObservation('');
      setNewClientScheduleDate('');
      fetchBajas();
    } catch (err) {
      console.error(err);
      alert('❌ Error al agregar cliente para retiro: ' + (err.response?.data?.error || err.message));
    } finally {
      setSavingNewClient(false);
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
    if (!window.confirm('¿Eliminar a este cliente DEFINITIVAMENTE? Se borrará de la base de datos y de la lista de cortes.')) return;
    try {
      await axios.delete(`${API_URL}/clients/${id}`);
      fetchBajas();
    } catch (err) {
      console.error(err);
      alert('Error al eliminar');
    }
  };

  const filteredBajas = bajas.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.dni?.includes(searchTerm) ||
    c.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(c.id).includes(searchTerm) ||
    `TK${String(c.id).padStart(3, '0')}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium text-xs">Cargando lista de bajas...</div>;
  if (error) return <div className="p-8 text-center text-red-500 text-xs">{error}</div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full">
      {/* Header */}
      <div className="p-4 md:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <UserMinus className="text-orange-500" size={20} />
            Bajas / Retiros de Antena
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Base de datos de clientes inactivos y gestión de visitas para retiro de equipamiento.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {canManageClients && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white transition-colors shadow-2xs whitespace-nowrap cursor-pointer"
              title="Cargar un cliente que no está en la base pero requiere retiro de antena"
            >
              <PlusCircle size={15} />
              <span>+ Cargar Retiro de Antena</span>
            </button>
          )}

          <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 whitespace-nowrap">
            {filteredBajas.length} clientes
          </span>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Buscar nombre, DNI, TK..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1 border border-slate-200 bg-slate-50 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 w-full md:w-48 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Tabla Adaptada al Ancho Completo sin Scroll */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse table-auto">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
              <th className="py-2.5 px-3 whitespace-nowrap">N° TK</th>
              <th className="py-2.5 px-3">Cliente</th>
              <th className="py-2.5 px-3 hidden lg:table-cell">Dirección</th>
              <th className="py-2.5 px-3">IP / Nodo</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Servicio Hasta</th>
              <th className="py-2.5 px-2 text-center whitespace-nowrap">Internet</th>
              <th className="py-2.5 px-2 text-center whitespace-nowrap">Retiro Antena</th>
              <th className="py-2.5 px-2 text-center whitespace-nowrap">Agendar Visita</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredBajas.length === 0 ? (
              <tr>
                <td colSpan="9" className="p-8 text-center text-slate-400">
                  <AlertCircle className="mx-auto text-slate-300 mb-2" size={24} />
                  No hay clientes en la lista de bajas.
                </td>
              </tr>
            ) : (
              filteredBajas.map((client) => {
                const cr = client.cancellationRequests?.[0];
                const keepUntil = cr?.keepServiceUntil ? new Date(cr.keepServiceUntil) : null;
                const serviceActive = keepUntil && keepUntil > new Date();
                const isCut = serviceStatus[client.id] === true;
                const isAntennaRetrieved = Boolean(cr?.antennaRetrieved);
                const scheduledDate = cr?.scheduledRemovalAt ? new Date(cr.scheduledRemovalAt) : null;
                const tkCode = `TK${String(client.id).padStart(3, '0')}`;

                return (
                  <tr key={client.id} className="transition-colors hover:bg-slate-50/70">
                    {/* Código TK único */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded shadow-2xs">
                        {tkCode}
                      </span>
                    </td>

                    {/* Cliente */}
                    <td className="py-2.5 px-3">
                      <div className="text-xs font-semibold text-slate-800 leading-tight">{client.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">DNI: {client.dni} {client.phone ? `| ${client.phone}` : ''}</div>
                    </td>

                    {/* Dirección */}
                    <td className="py-2.5 px-3 hidden lg:table-cell text-slate-600 max-w-[140px] truncate">
                      <div className="text-[11px] truncate" title={`${client.address || ''} - ${client.city || ''}`}>{client.address || '-'}</div>
                      <div className="text-[10px] text-slate-400 truncate">{client.city || ''}</div>
                    </td>

                    {/* IP / Nodo */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-mono text-[11px] font-medium text-slate-700">{client.ipNumber || '-'}</div>
                      <div className="text-[9px] text-slate-400 truncate max-w-[90px]">{client.mainNode || ''}</div>
                    </td>

                    {/* Servicio Hasta */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {editingDate === client.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="date"
                            value={dateInput}
                            onChange={e => setDateInput(e.target.value)}
                            className="text-[11px] border border-slate-300 rounded px-1.5 py-0.5 w-26 bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                          <button onClick={() => handleSaveServiceDate(client.id)} className="p-0.5 px-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded text-[10px] font-bold">✓</button>
                          <button onClick={() => { setEditingDate(null); setDateInput(''); }} className="p-0.5 px-1 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded text-[10px] font-bold">✕</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          {keepUntil ? (
                            <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${serviceActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                              {keepUntil.toLocaleDateString('es-AR')}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px] italic">Sin fecha</span>
                          )}
                          <button
                            onClick={() => { setEditingDate(client.id); setDateInput(keepUntil ? keepUntil.toISOString().split('T')[0] : ''); }}
                            className="p-1 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                            title="Editar fecha de corte programado"
                          >
                            <Calendar size={12} />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Internet (WiFi + Botones) */}
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <div 
                          title={isCut ? "Servicio Cortado en Mikrotik" : "Servicio Activo en Mikrotik"}
                          className={`p-1 rounded border flex items-center justify-center ${
                            isCut 
                              ? 'bg-red-50 text-red-600 border-red-200' 
                              : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                          }`}
                        >
                          {isCut ? <WifiOff size={13} /> : <Wifi size={13} />}
                        </div>

                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => handleEnableService(client.id)}
                            disabled={actionLoading === client.id}
                            title="Dar servicio"
                            className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            Dar
                          </button>
                          <button
                            onClick={() => handleDisableService(client.id)}
                            disabled={actionLoading === client.id}
                            title="Cortar servicio"
                            className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            Cortar
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Retiro de Antena */}
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleToggleAntenna(client.id, isAntennaRetrieved)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all cursor-pointer ${
                          isAntennaRetrieved 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                        title="Alternar estado de retiro"
                      >
                        {isAntennaRetrieved ? (
                          <>
                            <CheckSquare size={11} className="text-emerald-600" />
                            <span>Retirada</span>
                          </>
                        ) : (
                          <>
                            <Square size={11} className="text-slate-400" />
                            <span>Pendiente</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Agendar Retiro */}
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleOpenScheduleModal(client)}
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border transition-colors cursor-pointer ${
                          scheduledDate 
                            ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' 
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                        }`}
                        title="Agendar visita técnica"
                      >
                        <Clock size={11} className={scheduledDate ? 'text-blue-600' : 'text-slate-400'} />
                        {scheduledDate ? (
                          <span>
                            {scheduledDate.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}{' '}
                            {scheduledDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}hs
                          </span>
                        ) : (
                          <span>Agendar</span>
                        )}
                      </button>
                    </td>

                    {/* Acciones */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1">
                        {canManageClients && (
                          <>
                            <button 
                              onClick={() => handleRestore(client.id)} 
                              title="Restablecer cliente a ACTIVO" 
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded border border-transparent hover:border-emerald-200 transition-colors cursor-pointer"
                            >
                              <RotateCcw size={14} />
                            </button>
                            <button 
                              onClick={() => handleDelete(client.id)} 
                              title="Eliminar definitivamente" 
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                            >
                              <Trash2 size={14} />
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

      {/* Modal para Agendar Retiro con Fecha, Horario y Notas */}
      {scheduleModalClient && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="text-blue-600" size={16} />
                Agendar Retiro de Antena (TK{String(scheduleModalClient.id).padStart(3, '0')})
              </h3>
              <button 
                onClick={() => setScheduleModalClient(null)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-3.5 space-y-3">
              <div>
                <span className="text-[11px] text-slate-500">Cliente:</span>
                <p className="text-xs font-semibold text-slate-800">{scheduleModalClient.name}</p>
                <p className="text-[11px] text-slate-500">{scheduleModalClient.address}, {scheduleModalClient.city}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Fecha y Horario de Visita Técnica
                </label>
                <input
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Observaciones / Franja horaria para el Técnico
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Pasar de 15:00 a 18:00hs. Atiende en el domicilio."
                  value={scheduleNotes}
                  onChange={(e) => setScheduleNotes(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setScheduleModalClient(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingSchedule}
                onClick={handleSaveSchedule}
                className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1 cursor-pointer"
              >
                {savingSchedule ? 'Guardando...' : 'Guardar Agenda'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Cargar Cliente Directamente a Retiro de Antena */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-5 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <PlusCircle className="text-orange-600" size={18} />
                Cargar Retiro de Antena (Cliente no registrado / Histórico)
              </h3>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateManualBaja} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nombre y Apellido *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Pepa María Laura"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    DNI (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 30551482"
                    value={newClientDni}
                    onChange={(e) => setNewClientDni(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Teléfono / Celular
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 2634513527"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Dirección (Domicilio de Retiro)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: B° Trebol M D / C 22"
                    value={newClientAddress}
                    onChange={(e) => setNewClientAddress(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Localidad
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: San Martín"
                    value={newClientCity}
                    onChange={(e) => setNewClientCity(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nodo / Zona (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Borde / Vialidad"
                    value={newClientNode}
                    onChange={(e) => setNewClientNode(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    IP Asignada (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 192.168.20.96"
                    value={newClientIp}
                    onChange={(e) => setNewClientIp(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Fecha y Hora de Visita Técnica (Opcional)
                </label>
                <input
                  type="datetime-local"
                  value={newClientScheduleDate}
                  onChange={(e) => setNewClientScheduleDate(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Notas / Observaciones del Retiro
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Antena en mástil de 6 metros. El cliente avisa que está por la tarde."
                  value={newClientObservation}
                  onChange={(e) => setNewClientObservation(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingNewClient}
                  className="px-4 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors shadow-2xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {savingNewClient ? 'Guardando...' : 'Guardar y Registrar Retiro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
