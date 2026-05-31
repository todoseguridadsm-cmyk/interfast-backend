import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Plus, MessageCircle, X, Trash2, Edit2, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ClientsList() {
  const [clients, setClients] = useState([]);
  const [plans, setPlans] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    dni: '', name: '', businessName: '', email: '', phone: '', address: '', fiscalAddress: '', 
    city: '', province: '', zipCode: '', mainNode: '', panelId: '', ipNumber: '', planId: '',
    cuit: '', taxCondition: 'CONSUMIDOR_FINAL', status: 'ACTIVE', hasRouter: false, hasMast: false, registrationDate: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);

  const handleEdit = (client) => {
    setEditingId(client.id);
    setFormData({
      dni: client.dni || '',
      name: client.name || '',
      businessName: client.businessName || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      fiscalAddress: client.fiscalAddress || '',
      city: client.city || '',
      province: client.province || '',
      zipCode: client.zipCode || '',
      mainNode: client.mainNode || '',
      panelId: client.panelId || '',
      ipNumber: client.ipNumber || '',
      planId: client.planId || '',
      cuit: client.cuit || '',
      taxCondition: client.taxCondition || 'CONSUMIDOR_FINAL',
      status: client.status || 'ACTIVE',
      hasRouter: client.hasRouter || false,
      hasMast: client.hasMast || false,
      registrationDate: client.registrationDate ? new Date(client.registrationDate).toISOString().split('T')[0] : ''
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingId(null);
    setFormData({ dni: '', name: '', businessName: '', email: '', phone: '', address: '', fiscalAddress: '', city: '', province: '', zipCode: '', mainNode: '', panelId: '', ipNumber: '', planId: '', cuit: '', taxCondition: 'CONSUMIDOR_FINAL', status: 'ACTIVE', hasRouter: false, hasMast: false, registrationDate: '' });
    setIsModalOpen(false);
  };

  const handleInputChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
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

// Replaced handleInputChange above

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
      "Nombre": c.name,
      "Razón Social": c.businessName || '-',
      "DNI": c.dni,
      "Nº CUIT": c.cuit || '-',
      "Condición IVA": c.taxCondition === 'RESPONSABLE_INSCRIPTO' ? 'Responsable Inscripto' : (c.taxCondition === 'MONOTRIBUTISTA' ? 'Monotributista' : (c.taxCondition === 'EXENTO' ? 'Exento' : 'Consumidor Final')),
      "Plan (Contratado)": c.plan?.name || 'Sin Plan',
      "Saldo a Favor": `$${(c.walletBalance || 0).toFixed(2)}`,
      "Estado": c.status === 'ACTIVE' ? 'Activo' : (c.status === 'SUSPENDED' ? 'Suspendido' : 'Baja'),
      "Fecha de Alta": c.registrationDate ? new Date(c.registrationDate).toLocaleDateString('es-AR') : '-',
      "e-mail": c.email || '-',
      "Tel. Particular": c.phone || '-',
      "Dirección": c.address || '-',
      "Dirección Fiscal": c.fiscalAddress || '-',
      "Localidad": c.city || '-',
      "Provincia": c.province || '-',
      "Cód.Pos": c.zipCode || '-',
      "Grupo": c.mainNode || '-',
      "Panel": c.panelId || '-',
      "Campo Libre": c.ipNumber || '-',
      "Router Entregado": c.hasRouter ? 'Sí' : 'No',
      "Mástil Entregado": c.hasMast ? 'Sí' : 'No'
    }));

    if (dataToExport.length === 0) return alert("La búsqueda actual no tiene resultados para exportar.");

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes_Abonados");
    XLSX.writeFile(workbook, `Base_Clientes_INTERFAST.xlsx`);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target.result;
      const workbook = XLSX.read(bstr, { type: 'binary' });
      const wsname = workbook.SheetNames[0];
      const ws = workbook.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      const mappedClients = data.map(row => {
        let parsedDate = null;
        if (row['Fecha de Alta']) {
          const parts = String(row['Fecha de Alta']).split('/');
          if (parts.length === 3) {
            parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00Z`);
          }
        }
        return {
          name: String(row['Nombre'] || ''),
          businessName: row['Razón Social'] ? String(row['Razón Social']) : null,
          address: row['Dirección'] ? String(row['Dirección']) : null,
          fiscalAddress: row['Dirección Fiscal'] ? String(row['Dirección Fiscal']) : null,
          city: row['Localidad'] ? String(row['Localidad']) : null,
          zipCode: row['Cód.Pos'] ? String(row['Cód.Pos']) : null,
          province: row['Provincia'] ? String(row['Provincia']) : null,
          phone: row['Tel. Particular'] ? String(row['Tel. Particular']) : null,
          status: row['Estado'] === 'Baja' ? 'BAJA' : (row['Estado'] === 'Suspendido' ? 'SUSPENDED' : 'ACTIVE'),
          registrationDate: parsedDate,
          taxCondition: row['Condición IVA'] === 'Responsable Inscripto' ? 'RESPONSABLE_INSCRIPTO' : (row['Condición IVA'] === 'Monotributista' ? 'MONOTRIBUTISTA' : (row['Condición IVA'] === 'Exento' ? 'EXENTO' : 'CONSUMIDOR_FINAL')),
          cuit: row['Nº CUIT'] ? String(row['Nº CUIT']) : null,
          dni: row['DNI'] ? String(row['DNI']) : (row['Nº CUIT'] ? String(row['Nº CUIT']) : '0'),
          email: row['e-mail'] ? String(row['e-mail']) : null,
          mainNode: row['Grupo'] ? String(row['Grupo']) : null,
          ipNumber: row['Campo Libre'] ? String(row['Campo Libre']) : null
        };
      });

      try {
        const res = await axios.post('https://interfast-backend-95ww.onrender.com/api/clients/bulk', { clients: mappedClients });
        alert(res.data.message);
        fetchClients();
      } catch (err) {
        console.error(err);
        alert('Error al importar clientes masivamente.');
      }
    };
    reader.readAsBinaryString(file);
    // Reset the input value so we can upload the same file again if needed
    e.target.value = '';
  };

  const filteredClients = clients.filter(c => {
    const term = searchTerm.toLowerCase();
    const clientNum = `tk${String(c.id).padStart(3, '0')}`;
    return c.name.toLowerCase().includes(term) || 
           c.dni.includes(term) || 
           clientNum.includes(term);
  });

  return (
    <div className="space-y-6 relative">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            Clientes
            <span className="text-sm font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded-full mt-1 ml-2">
              {filteredClients.length} {filteredClients.length === 1 ? 'Cliente' : 'Clientes'}
            </span>
          </h2>
          <p className="text-slate-500 mt-1">Gestión de abonados y números de cliente (TK000).</p>
        </div>
        <div className="flex gap-3">
          <label className="bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2 cursor-pointer" title="Importar Planilla Excel">
            <Download className="rotate-180" size={18} />
            Importar
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
          </label>
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
              [...filteredClients].sort((a, b) => a.name.localeCompare(b.name)).map(client => (
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
                    <div className="flex gap-1 mt-1">
                      {client.hasRouter && <span className="text-[9px] bg-blue-100 text-blue-700 px-1 rounded font-bold">RTR</span>}
                      {client.hasMast && <span className="text-[9px] bg-sky-100 text-sky-700 px-1 rounded font-bold">MST</span>}
                    </div>
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
                
                {formData.taxCondition === 'RESPONSABLE_INSCRIPTO' && (
                  <div className="md:col-span-12">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Razón Social</label>
                    <input type="text" name="businessName" value={formData.businessName} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="Ej: Empresa S.A." />
                  </div>
                )}

                {/* Tax Data */}
                <div className="md:col-span-12 border-t border-slate-100 pt-3 mt-1">
                  <h4 className="text-sm font-bold text-slate-800 mb-3 text-slate-500 uppercase tracking-wider text-xs">Datos Impositivos (AFIP)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Estado de la Cuenta</label>
                      <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white font-bold">
                        <option value="ACTIVE" className="text-emerald-700">Activo</option>
                        <option value="SUSPENDED" className="text-orange-600">Suspendido</option>
                        <option value="BAJA" className="text-red-600">Baja (No factura)</option>
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
                    <div className="md:col-span-6">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Dirección Fiscal</label>
                      <input type="text" name="fiscalAddress" value={formData.fiscalAddress} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Ej: Av. San Martín 456" />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Ciudad</label>
                      <input type="text" name="city" value={formData.city} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Ciudad" />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Cód. Postal</label>
                      <input type="text" name="zipCode" value={formData.zipCode} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="5570" />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Provincia</label>
                      <input type="text" name="province" value={formData.province} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Provincia" />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Alta</label>
                      <input type="date" name="registrationDate" value={formData.registrationDate} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
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
                  <h4 className="text-sm font-bold text-slate-800 mb-3 text-slate-500 uppercase tracking-wider text-xs">Inventario Entregado (Equipos de la Empresa)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-sky-50 p-4 border border-sky-100 rounded-xl">
                    <label className="flex items-center gap-3 cursor-pointer text-sm font-semibold text-slate-700">
                      <input type="checkbox" name="hasRouter" checked={formData.hasRouter} onChange={handleInputChange} className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300" />
                      Se le entregó Router Wi-Fi
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer text-sm font-semibold text-slate-700">
                      <input type="checkbox" name="hasMast" checked={formData.hasMast} onChange={handleInputChange} className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300" />
                      Se le entregó Mástil / Antena
                    </label>
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
