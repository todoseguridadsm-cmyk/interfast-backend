import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Plus, MessageCircle, X, Trash2, Edit2, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ClientsList() {
  const [clients, setClients] = useState([]);
  const [plans, setPlans] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    dni: '', name: '', email: '', phone: '', address: '', 
    city: '', province: '', mainNode: '', panelId: '', ipNumber: '', planId: '',
    cuit: '', taxCondition: 'CONSUMIDOR_FINAL'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);

  const handleEdit = (client) => {
    setEditingId(client.id);
    setFormData({
      dni: client.dni || '',
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      city: client.city || '',
      province: client.province || '',
      mainNode: client.mainNode || '',
      panelId: client.panelId || '',
      ipNumber: client.ipNumber || '',
      planId: client.planId || '',
      cuit: client.cuit || '',
      taxCondition: client.taxCondition || 'CONSUMIDOR_FINAL'
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingId(null);
    setFormData({ dni: '', name: '', email: '', phone: '', address: '', city: '', province: '', mainNode: '', panelId: '', ipNumber: '', planId: '', cuit: '', taxCondition: 'CONSUMIDOR_FINAL' });
    setIsModalOpen(false);
  };

  const fetchClients = () => {
    axios.get('https://interfast-backend-95ww.onrender.com/api/clients')
      .then(res => setClients(res.data))
      .catch(err => console.error(err));
  };

  const fetchPlans = () => {
    axios.get('https://interfast-backend-95ww.onrender.com/api/plans')
      .then(res => setPlans(res.data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchClients();
    fetchPlans();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      planId: formData.planId ? parseInt(formData.planId) : null
    };

    const request = editingId 
      ? axios.put(`https://interfast-backend-95ww.onrender.com/api/clients/${editingId}`, payload)
      : axios.post('https://interfast-backend-95ww.onrender.com/api/clients', payload);

    request.then(() => {
      closeModal();
      fetchClients();
    })
    .catch(err => alert('Error al guardar el cliente'));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este cliente?')) return;
    try {
      await axios.delete(`https://interfast-backend-95ww.onrender.com/api/clients/${id}`);
      fetchClients();
    } catch (error) {
      console.error(error);
      alert('Error al eliminar');
    }
  };

  const exportToExcel = () => {
    if (clients.length === 0) return alert("No hay clientes para exportar.");
    
    // Filtramos si hay una búsqueda activa
    const term = searchTerm.toLowerCase();
    const dataToExport = clients.filter(c => {
      const clientNum = `tk${String(c.id).padStart(3, '0')}`;
      return c.name.toLowerCase().includes(term) || c.dni.includes(term) || clientNum.includes(term);
    }).map(c => ({
      "N° Cliente": `TK${String(c.id).padStart(3, '0')}`,
      "Nombre Completo": c.name,
      "DNI": c.dni,
      "CUIT / CUIL": c.cuit || '-',
      "Condición AFIP": c.taxCondition,
      "Plan (Contratado)": c.plan?.name || 'Sin Plan',
      "Saldo a Favor": `$${(c.walletBalance || 0).toFixed(2)}`,
      "Estado": c.status,
      "Email": c.email || '-',
      "Teléfono": c.phone || '-',
      "Dirección": c.address || '-',
      "Localidad": `${c.city || ''} ${c.province || ''}`.trim() || '-',
      "Nodo Principal": c.mainNode || '-',
      "Panel": c.panelId || '-',
      "IP Asignada": c.ipNumber || '-'
    }));

    if (dataToExport.length === 0) return alert("La búsqueda actual no tiene resultados para exportar.");

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes_Abonados");
    XLSX.writeFile(workbook, `Base_Clientes_INTERFAST.xlsx`);
  };

  return (
    <div className="space-y-6 relative">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Clientes</h2>
          <p className="text-slate-500 mt-1">Gestión de abonados y números de cliente (TK000).</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={exportToExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2"
            title="Descargar Planilla Excel"
          >
            <Download size={18} />
            Excel
          </button>
          <button 
            onClick={() => { closeModal(); setIsModalOpen(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Nuevo Cliente
          </button>
        </div>
      </header>

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por N°, DNI o Nombre..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow text-sm"
            />
          </div>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-medium">N° Cliente</th>
              <th className="px-6 py-4 font-medium">Cliente</th>
              <th className="px-6 py-4 font-medium">DNI</th>
              <th className="px-6 py-4 font-medium">Plan Actual</th>
              <th className="px-6 py-4 font-medium">Red IP</th>
              <th className="px-6 py-4 font-medium">Billetera</th>
              <th className="px-6 py-4 font-medium">Estado</th>
              <th className="px-6 py-4 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {clients.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                  No hay clientes registrados en el sistema.
                </td>
              </tr>
            ) : (
              clients.filter(c => {
                const term = searchTerm.toLowerCase();
                const clientNum = `tk${String(c.id).padStart(3, '0')}`;
                return c.name.toLowerCase().includes(term) || 
                       c.dni.includes(term) || 
                       clientNum.includes(term);
              }).map(client => (
                <tr key={client.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-blue-600 tracking-wider">
                    {`TK${String(client.id).padStart(3, '0')}`}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">{client.name}</td>
                  <td className="px-6 py-4 text-slate-600">{client.dni}</td>
                  <td className="px-6 py-4 text-slate-600">{client.plan?.name || "Sin Plan"}</td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-500">
                    <span className="font-bold block text-slate-700">{client.ipNumber || '---'}</span>
                    {client.mainNode && <span className="mt-1 block">{client.mainNode}</span>}
                  </td>
                  <td className="px-6 py-4">
                    {client.walletBalance > 0 ? (
                       <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-bold border border-emerald-200">
                         +${client.walletBalance.toLocaleString('es-AR', {minimumFractionDigits: 2})}
                       </span>
                    ) : ( <span className="text-slate-400 text-xs">$0.00</span> )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${client.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {client.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleEdit(client)} className="text-blue-500 hover:text-blue-700 transition-colors inline-flex items-center justify-center p-2 rounded-lg hover:bg-blue-50 mr-2" title="Editar cliente">
                      <Edit2 size={18} />
                    </button>
                    <button className="text-green-600 hover:text-green-800 transition-colors inline-flex items-center justify-center p-2 rounded-lg hover:bg-green-50 mr-2" title="Enviar WhatsApp">
                      <MessageCircle size={18} />
                    </button>
                    <button onClick={() => handleDelete(client.id)} className="text-red-500 hover:text-red-700 transition-colors inline-flex items-center justify-center p-2 rounded-lg hover:bg-red-50" title="Eliminar cliente">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Nuevo Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto pt-10 pb-10">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">
                {editingId 
                  ? `Editar Cliente (TK${String(editingId).padStart(3, '0')})` 
                  : 'Agregar Nuevo Cliente'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto max-h-[80vh] custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                
                {/* Personal Data */}
                <div className="md:col-span-8">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                  <input required type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="Ej: Juan Pérez" />
                </div>
                <div className="md:col-span-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">DNI</label>
                  <input required type="text" name="dni" value={formData.dni} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="12345678" />
                </div>

                {/* Tax Data */}
                <div className="md:col-span-12 border-t border-slate-100 pt-3 mt-1">
                  <h4 className="text-sm font-bold text-slate-800 mb-3 text-slate-500 uppercase tracking-wider text-xs">Datos Impositivos (AFIP)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">C.U.I.T / C.U.I.L</label>
                      <input type="text" name="cuit" value={formData.cuit} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Opcional..." />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Condición Frente al IVA</label>
                      <select name="taxCondition" value={formData.taxCondition} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white">
                        <option value="CONSUMIDOR_FINAL">Consumidor Final</option>
                        <option value="RESPONSABLE_INSCRIPTO">Responsable Inscripto</option>
                        <option value="MONOTRIBUTISTA">Monotributista</option>
                        <option value="EXENTO">Exento</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Contact and Address */}
                <div className="md:col-span-12 border-t border-slate-100 pt-3 mt-1">
                  <h4 className="text-sm font-bold text-slate-800 mb-3 text-slate-500 uppercase tracking-wider text-xs">Contacto y Ubicación</h4>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-6">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                      <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="correo@ejemplo.com" />
                    </div>
                    <div className="md:col-span-6">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                      <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="1122334455" />
                    </div>
                    <div className="md:col-span-6">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Dirección Física</label>
                      <input type="text" name="address" value={formData.address} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Calle Falsa 123" />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Ciudad</label>
                      <input type="text" name="city" value={formData.city} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Ciudad" />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Provincia</label>
                      <input type="text" name="province" value={formData.province} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Provincia" />
                    </div>
                  </div>
                </div>
                
                {/* Hardware Grid Panel */}
                <div className="md:col-span-12 border-t border-slate-100 pt-3 mt-1">
                  <h4 className="text-sm font-bold text-slate-800 mb-3 text-slate-500 uppercase tracking-wider text-xs">Datos de Conexión (Red)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-4">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Nodo Principal (Torre)</label>
                      <input type="text" name="mainNode" value={formData.mainNode} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Ej: Nodo Central 1" />
                    </div>
                    <div className="md:col-span-4">
                      <label className="block text-xs font-medium text-slate-500 mb-1">ID del Panel Sectorial</label>
                      <input type="text" name="panelId" value={formData.panelId} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Ej: P-04" />
                    </div>
                    <div className="md:col-span-4">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Número de IP Asignada</label>
                      <input type="text" name="ipNumber" value={formData.ipNumber} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm font-bold border-l-4 border-l-blue-500" placeholder="192.168.1.50" />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-12 border-t border-slate-100 pt-3 mt-1">
                  <label className="block text-sm font-bold text-slate-800 mb-2">Plan de Internet Asociado</label>
                  <select name="planId" value={formData.planId} onChange={handleInputChange} className="w-full px-4 py-3 border border-slate-300 font-medium rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-blue-50 text-blue-900">
                    <option value="">-- Sin Plan Seleccionado --</option>
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.megas} MB) - ${p.price}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="pt-6 mt-4 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white">
                <button type="button" onClick={closeModal} className="px-5 py-2.5 text-slate-600 hover:text-slate-800 font-medium bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-colors text-sm">
                  {editingId ? 'Actualizar Cliente' : 'Guardar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
