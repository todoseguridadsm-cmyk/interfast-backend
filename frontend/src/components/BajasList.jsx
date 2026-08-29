import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserMinus, Check, RotateCcw, Trash2, Search, AlertCircle, Wifi, WifiOff, Calendar } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://interfast-backend-95ww.onrender.com/api';

export default function BajasList() {
  const [bajas, setBajas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingServiceDate, setEditingServiceDate] = useState(null); // id of baja being edited
  const [serviceDateInput, setServiceDateInput] = useState('');

  useEffect(() => {
    fetchBajas();
  }, []);

  const fetchBajas = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/bajas`);
      setBajas(res.data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Error al cargar las solicitudes de baja.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (id) => {
    if (!window.confirm('¿Confirmar esta baja? El cliente pasará a estado inactivo (BAJA). El servicio de internet NO se cortará automáticamente.')) return;
    try {
      await axios.put(`${API_URL}/bajas/${id}/confirm`);
      fetchBajas();
    } catch (err) {
      console.error(err);
      alert('Error al confirmar la baja');
    }
  };

  const handleRestore = async (id) => {
    if (!window.confirm('¿Restablecer esta cuenta? El cliente volverá a estar ACTIVO.')) return;
    try {
      await axios.put(`${API_URL}/bajas/${id}/restore`);
      fetchBajas();
    } catch (err) {
      console.error(err);
      alert('Error al restablecer');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este registro definitivamente?')) return;
    try {
      await axios.delete(`${API_URL}/bajas/${id}`);
      fetchBajas();
    } catch (err) {
      console.error(err);
      alert('Error al eliminar');
    }
  };

  const handleSaveServiceDate = async (id) => {
    try {
      await axios.patch(`${API_URL}/bajas/${id}/service-date`, {
        keepServiceUntil: serviceDateInput || null
      });
      setEditingServiceDate(null);
      setServiceDateInput('');
      fetchBajas();
    } catch (err) {
      console.error(err);
      alert('Error al guardar fecha de servicio');
    }
  };

  const filteredBajas = bajas.filter(b =>
    b.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.client?.dni?.includes(searchTerm)
  );

  const sortedBajas = [...filteredBajas].sort((a, b) => {
    if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
    if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
    return new Date(b.requestedAt) - new Date(a.requestedAt);
  });

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando solicitudes de baja...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <UserMinus className="text-red-500" />
            Solicitudes de Baja / Retiro de Antena
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Gestiona los clientes que solicitaron cancelar su servicio. El corte de internet es manual y opcional.
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nombre o DNI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none w-full md:w-64"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-500 uppercase tracking-wider">
              <th className="p-4 font-medium">N° / TK</th>
              <th className="p-4 font-medium">Cliente</th>
              <th className="p-4 font-medium hidden md:table-cell">Motivo</th>
              <th className="p-4 font-medium">Servicio hasta</th>
              <th className="p-4 font-medium">Fecha Solicitud</th>
              <th className="p-4 font-medium">Estado</th>
              <th className="p-4 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sortedBajas.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-slate-500">
                  <AlertCircle className="mx-auto text-slate-400 mb-2" size={32} />
                  No hay solicitudes de baja registradas.
                </td>
              </tr>
            ) : (
              sortedBajas.map((baja) => {
                const isConfirmed = baja.status === 'CONFIRMED';
                const keepUntil = baja.keepServiceUntil ? new Date(baja.keepServiceUntil) : null;
                const serviceActive = keepUntil && keepUntil > new Date();
                return (
                  <tr key={baja.id} className={`transition-colors hover:bg-slate-50/50 ${isConfirmed ? 'bg-slate-100/50 text-slate-500' : ''}`}>

                    {/* N° Cliente + Tickets */}
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full w-fit">
                          #&nbsp;{baja.client?.id || '?'}
                        </span>
                        {baja.client?.tickets?.slice(0, 3).map(tk => (
                          <span key={tk.id} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full w-fit">
                            TK{tk.id} · {tk.title?.slice(0, 18)}{tk.title?.length > 18 ? '...' : ''}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Nombre + DNI */}
                    <td className="p-4">
                      <div className="font-medium text-slate-800">{baja.client?.name || 'Cliente Eliminado'}</div>
                      <div className="text-xs text-slate-500">{baja.client?.dni || ''}</div>
                    </td>

                    {/* Motivo */}
                    <td className="p-4 hidden md:table-cell max-w-xs truncate" title={baja.reason}>
                      {baja.reason || '-'}
                    </td>

                    {/* Servicio hasta (keepServiceUntil) */}
                    <td className="p-4">
                      {editingServiceDate === baja.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="date"
                            value={serviceDateInput}
                            onChange={e => setServiceDateInput(e.target.value)}
                            className="text-xs border border-slate-300 rounded px-2 py-1 w-32"
                          />
                          <button
                            onClick={() => handleSaveServiceDate(baja.id)}
                            className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                            title="Guardar"
                          >✓</button>
                          <button
                            onClick={() => { setEditingServiceDate(null); setServiceDateInput(''); }}
                            className="p-1 bg-slate-100 text-slate-500 rounded hover:bg-slate-200"
                            title="Cancelar"
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
                            <span className="text-xs text-slate-400 italic">Sin fecha</span>
                          )}
                          <button
                            onClick={() => {
                              setEditingServiceDate(baja.id);
                              setServiceDateInput(keepUntil ? keepUntil.toISOString().split('T')[0] : '');
                            }}
                            className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                            title="Editar fecha de servicio"
                          >
                            <Calendar size={14} />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Fecha solicitud */}
                    <td className="p-4 text-sm text-slate-600">
                      {new Date(baja.requestedAt).toLocaleDateString('es-AR')}
                    </td>

                    {/* Estado */}
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        baja.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                        baja.status === 'CONFIRMED' ? 'bg-slate-200 text-slate-600 border border-slate-300' :
                        'bg-blue-100 text-blue-700 border border-blue-200'
                      }`}>
                        {baja.status === 'PENDING' ? 'Pendiente' : baja.status === 'CONFIRMED' ? 'Confirmada (Baja)' : 'Restablecido'}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        {baja.status === 'PENDING' && (
                          <button
                            onClick={() => handleConfirm(baja.id)}
                            title="Confirmar Baja (sin cortar servicio)"
                            className="p-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors"
                          >
                            <Check size={18} />
                          </button>
                        )}
                        {baja.status === 'CONFIRMED' && (
                          <button
                            onClick={() => handleRestore(baja.id)}
                            title="Restablecer"
                            className="p-1.5 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-lg transition-colors"
                          >
                            <RotateCcw size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(baja.id)}
                          title="Eliminar Registro"
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
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
