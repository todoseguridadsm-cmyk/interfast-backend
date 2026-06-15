import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2, CheckCircle, Clock, Phone, User, MessageSquare } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://interfast-backend-95ww.onrender.com/api';

export default function AltasWebList() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = async () => {
    try {
      const response = await axios.get(`${API_URL}/leads`);
      setLeads(response.data);
    } catch (error) {
      console.error('Error fetching leads:', error);
      alert('Error al cargar las altas web');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.put(`${API_URL}/leads/${id}`, { status: newStatus });
      fetchLeads();
    } catch (error) {
      alert('Error al actualizar el estado');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este prospecto?')) return;
    try {
      await axios.delete(`${API_URL}/leads/${id}`);
      fetchLeads();
    } catch (error) {
      alert('Error al eliminar');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'NEW':
        return <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold">NUEVO</span>;
      case 'CONTACTED':
        return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">CONTACTADO</span>;
      case 'CONVERTED':
        return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">CONVERTIDO</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <span className="text-blue-600">Altas</span> Web / Agente IA
          </h1>
          <p className="text-slate-500 mt-1">Gestiona los prospectos que llegan desde la Landing Page y N8N</p>
        </div>
        <button onClick={fetchLeads} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors">
          Actualizar
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Cargando prospectos...</div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No hay altas web registradas.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                  <th className="p-4 font-semibold">Cliente</th>
                  <th className="p-4 font-semibold">Contacto</th>
                  <th className="p-4 font-semibold">Mensaje</th>
                  <th className="p-4 font-semibold">Fecha</th>
                  <th className="p-4 font-semibold">Estado</th>
                  <th className="p-4 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                          <User size={18} />
                        </div>
                        <div className="font-semibold text-slate-800">{lead.name}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Phone size={14} />
                          <a href={`https://wa.me/${lead.phone}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                            {lead.phone}
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 max-w-xs">
                      <div className="flex gap-2">
                        <MessageSquare size={16} className="text-slate-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-slate-600 line-clamp-2" title={lead.notes}>{lead.notes || '-'}</p>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-500">
                      <div className="flex items-center gap-2">
                        <Clock size={14} />
                        {new Date(lead.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(lead.status)}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        {lead.status === 'NEW' && (
                          <button onClick={() => handleStatusChange(lead.id, 'CONTACTED')} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg" title="Marcar como Contactado">
                            <CheckCircle size={18} />
                          </button>
                        )}
                        {lead.status === 'CONTACTED' && (
                          <button onClick={() => handleStatusChange(lead.id, 'CONVERTED')} className="p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg" title="Marcar como Convertido">
                            <CheckCircle size={18} />
                          </button>
                        )}
                        <button onClick={() => handleDelete(lead.id)} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg" title="Eliminar">
                          <Trash2 size={18} />
                        </button>
                      </div>
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
