import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Plus, MessageCircle, X, Trash2, Edit2, Download, Check, Power, Activity, Loader2, Stethoscope, AlertTriangle, CheckCircle2, XCircle, Info, CreditCard, UserMinus, Server } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ClientsList() {
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : { role: 'STAFF' };
  const isAdmin = user.role === 'ADMIN';
  const canManageClients = isAdmin || (user.permissions && Array.isArray(user.permissions) && (user.permissions.includes('CLIENTES') || user.permissions.includes('ALL')));

  const [clients, setClients] = useState([]);
  const [plans, setPlans] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    dni: '', name: '', businessName: '', email: '', phone: '', phone2: '', observation: '', address: '', fiscalAddress: '', 
    city: '', province: '', zipCode: '', mainNode: '', panelId: '', ipNumber: '', planId: '',
    nodeRefId: '', panelRefId: '',
    cuit: '', taxCondition: 'CONSUMIDOR_FINAL', status: 'ACTIVE', hasRouter: false, hasMast: false, registrationDate: '', isVip: false
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [pingingId, setPingingId] = useState(null);
  const [diagnosingId, setDiagnosingId] = useState(null);
  const [diagModalData, setDiagModalData] = useState(null);

  const handlePing = async (client) => {
    if (!client.ipNumber || !client.mainNode) {
      alert('El cliente no tiene IP o Nodo configurado.');
      return;
    }
    setPingingId(client.id);
    try {
      const { data } = await axios.get(`https://interfast-backend-95ww.onrender.com/api/clients/${client.id}/ping`);
      if (data.success) {
        if (data.isOnline) {
          alert(`✅ Conexión Exitosa con ${client.name}\nLatencia: ${data.avgRtt}\nPérdida: ${data.packetLoss}%`);
        } else {
          alert(`❌ Cliente Offline\nPérdida de paquetes: ${data.packetLoss}%`);
        }
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error(error);
      alert('Error de conexión al intentar hacer ping.');
    } finally {
      setPingingId(null);
    }
  };

  const handleAdvancedDiag = async (client) => {
    if (!client.ipNumber || !client.mainNode) {
      alert('El cliente no tiene IP o Nodo configurado para el diagnóstico.');
      return;
    }
    setDiagnosingId(client.id);
    try {
      const { data } = await axios.get(`https://interfast-backend-95ww.onrender.com/api/clients/${client.id}/advanced-diagnosis`);
      if (data.success) {
        setDiagModalData(data);
      } else {
        alert('Error en diagnóstico: ' + (data.error || 'Desconocido'));
      }
    } catch (error) {
      console.error(error);
      alert('Error al conectar con el servidor para diagnóstico avanzado.');
    } finally {
      setDiagnosingId(null);
    }
  };

  const handleEdit = (client) => {
    setEditingId(client.id);
    setFormData({
      dni: client.dni || '',
      name: client.name || '',
      businessName: client.businessName || '',
      email: client.email || '',
      phone: client.phone || '',
      phone2: client.phone2 || '',
      observation: client.observation || '',
      address: client.address || '',
      fiscalAddress: client.fiscalAddress || '',
      city: client.city || '',
      province: client.province || '',
      zipCode: client.zipCode || '',
      mainNode: client.mainNode || '',
      nodeRefId: client.nodeRefId || '',
      panelRefId: client.panelRefId || '',
      panelId: client.panelId || '',
      ipNumber: client.ipNumber || '',
      planId: client.planId || '',
      cuit: client.cuit || '',
      taxCondition: client.taxCondition || 'CONSUMIDOR_FINAL',
      status: client.status || 'ACTIVE',
      hasRouter: client.hasRouter || false,
      hasMast: client.hasMast || false,
      registrationDate: client.registrationDate ? new Date(client.registrationDate).toISOString().split('T')[0] : '',
      isVip: client.isVip || false
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingId(null);
    setFormData({ dni: '', name: '', businessName: '', email: '', phone: '', phone2: '', observation: '', address: '', fiscalAddress: '', city: '', province: '', zipCode: '', mainNode: '', nodeRefId: '', panelRefId: '', panelId: '', ipNumber: '', planId: '', cuit: '', taxCondition: 'CONSUMIDOR_FINAL', status: 'ACTIVE', hasRouter: false, hasMast: false, registrationDate: '', isVip: false });
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

  const fetchNodes = () => {
    axios.get('https://interfast-backend-95ww.onrender.com/api/nodes')
      .then(res => setNodes(res.data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchClients();
    fetchPlans();
    fetchNodes();
  }, []);

// Replaced handleInputChange above

  const handleSubmit = (e) => {
    e.preventDefault();

    if (formData.dni && formData.dni.trim() !== '' && formData.dni !== '0' && formData.dni !== '11111111') {
      const duplicateDni = clients.find(c => c.dni === formData.dni && c.id !== editingId);
      if (duplicateDni) {
        if (!window.confirm(`¡Atención! El DNI ${formData.dni} ya está registrado a nombre de ${duplicateDni.name}. ¿Deseas guardar de todos modos?`)) {
          return;
        }
      }
    }

    if (formData.ipNumber && formData.ipNumber.trim() !== '') {
      const duplicateIp = clients.find(c => c.ipNumber === formData.ipNumber && c.id !== editingId);
      if (duplicateIp) {
        if (!window.confirm(`¡Atención! La IP ${formData.ipNumber} ya está asignada a ${duplicateIp.name}. ¿Deseas guardar de todos modos?`)) {
          return;
        }
      }
    }

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
    if (!window.confirm('¿Eliminar definitivamente el cliente?')) return;
    try {
      await axios.delete(`https://interfast-backend-95ww.onrender.com/api/clients/${id}`);
      fetchClients();
    } catch (error) {
      console.error(error);
      alert('Error al eliminar');
    }
  };

  const handleDarDeBaja = async (id) => {
    if (!window.confirm('¿Mover cliente a la sección de BAJAS / RETIROS? El cliente será removido de esta lista.')) return;
    try {
      await axios.put(`https://interfast-backend-95ww.onrender.com/api/clients/${id}/status`, { status: 'BAJA' });
      fetchClients();
    } catch (error) {
      console.error(error);
      alert('Error al dar de baja');
    }
  };

  const handleConfirm = async (id) => {
    if (!window.confirm('¿Confirmar el alta de este cliente y pasarlo a Activo?')) return;
    try {
      const client = clients.find(c => c.id === id);
      const payload = { ...client, status: 'ACTIVE' };
      await axios.put(`https://interfast-backend-95ww.onrender.com/api/clients/${id}`, payload);
      fetchClients();
    } catch (error) {
      console.error(error);
      alert('Error al confirmar el alta');
    }
  };

  const handlePauseBot = async (clientId) => {
    try {
      await axios.post('/api/bot/pausar-chat', { clientId }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert('Sofi ha sido pausada para este cliente por 2 horas.');
      fetchClients(); // Refrescamos la UI para que aparezca el badge rojo
    } catch (err) {
      alert('Error al intentar silenciar al bot.');
    }
  };

  const handleToggleStatus = async (client) => {
    if (!canManageClients) return;
    const newStatus = client.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    if (!window.confirm(`¿Estás seguro de cambiar el estado del cliente a ${newStatus}? Esto cortará o habilitará su servicio de internet en el router automáticamente.`)) return;
    
    try {
      await axios.put(`https://interfast-backend-95ww.onrender.com/api/clients/${client.id}/status`, { status: newStatus });
      fetchClients();
    } catch (error) {
      console.error(error);
      alert('Error al cambiar el estado del cliente');
    }
  };

  const handleToggleDebitoAutomatico = async (client) => {
    const newValue = !client.debitoAutomatico;
    const label = newValue ? 'activar el Débito Automático' : 'desactivar el Débito Automático';
    if (!window.confirm(`¿Confirmar ${label} para ${client.name}?`)) return;
    try {
      await axios.put(`https://interfast-backend-95ww.onrender.com/api/clients/${client.id}/debito-automatico`, {
        debitoAutomatico: newValue
      });
      fetchClients();
    } catch (error) {
      console.error(error);
      alert('Error al cambiar el débito automático');
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
      "Tel. Secundario": c.phone2 || '-',
      "Observaciones": c.observation || '-',
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
          phone2: row['Tel. Secundario'] ? String(row['Tel. Secundario']) : null,
          observation: row['Observaciones'] ? String(row['Observaciones']) : null,
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
    return (c.name || '').toLowerCase().includes(term) || 
           (c.dni || '').toLowerCase().includes(term) || 
           clientNum.includes(term) ||
           (c.ipNumber || '').toLowerCase().includes(term) ||
           (c.mainNode || '').toLowerCase().includes(term);
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
          {canManageClients && (
            <label className="bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer" title="Importar Planilla Excel">
              <Download className="rotate-180" size={16} />
              Importar
              <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
            </label>
          )}
          <button 
            onClick={exportToExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-1.5"
            title="Descargar Planilla Excel"
          >
            <Download size={16} />
            Excel
          </button>
          {canManageClients && (
            <button 
              onClick={() => { closeModal(); setIsModalOpen(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Plus size={16} />
              Nuevo Cliente
            </button>
          )}
        </div>
      </header>

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar por N°, DNI o Nombre..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow text-sm"
            />
          </div>
        </div>
        <div className="overflow-auto w-full max-h-[calc(100vh-240px)] custom-scrollbar">
          <table className="w-full text-left border-collapse ">
          <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="px-3 py-3 font-medium">N° Cliente</th>
              <th className="px-3 py-3 font-medium">Cliente</th>
              <th className="px-3 py-3 font-medium">DNI</th>
              <th className="px-3 py-3 font-medium">Plan Actual</th>
              <th className="px-3 py-3 font-medium">Red IP</th>
              <th className="px-3 py-3 font-medium">Billetera</th>
              <th className="px-3 py-3 font-medium">Estado</th>
              <th className="px-3 py-3 font-medium text-right">Acciones</th>
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
                  <td className="px-3 py-3 text-sm font-bold text-blue-600 tracking-wider">
                    {`TK${String(client.id).padStart(3, '0')}`}
                  </td>
                  <td className="px-3 py-3 font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      {client.name}
                      {client.isVip && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold uppercase rounded-full border border-amber-200" title="Cliente VIP - Exento de Cortes">VIP</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{client.dni}</td>
                  <td className="px-3 py-3 text-slate-600">{client.plan?.name || "Sin Plan"}</td>
                  <td className="px-3 py-3 text-xs font-mono text-slate-500">
                    <span className="font-bold block text-slate-700">{client.ipNumber || '---'}</span>
                    {client.mainNode && <span className="mt-1 block">{client.mainNode}</span>}
                    <div className="flex gap-1 mt-1">
                      {client.hasRouter && <span className="text-[9px] bg-blue-100 text-blue-700 px-1 rounded font-bold">RTR</span>}
                      {client.hasMast && <span className="text-[9px] bg-sky-100 text-sky-700 px-1 rounded font-bold">MST</span>}
                      {client.debitoAutomatico && <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5"><CreditCard size={8} /> DÉB.AUT.</span>}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {client.walletBalance > 0 ? (
                       <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-bold border border-emerald-200">
                         +${client.walletBalance.toLocaleString('es-AR', {minimumFractionDigits: 2})}
                       </span>
                    ) : ( <span className="text-slate-400 text-xs">$0.00</span> )}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${client.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : client.status === 'PENDING' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                      {client.status === 'PENDING' ? 'Pendiente' : client.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right flex justify-end gap-1 items-center">
                    {client.ipNumber && (
                      <button onClick={() => window.location.assign(`winbox://${client.ipNumber}`)} title="Abrir en Winbox" className="hover:opacity-80 transition-opacity ml-2">
                        <img src="/winbox.jpg" alt="Winbox" className="w-5 h-5 rounded-full" />
                      </button>
                    )}
                    
                    {client.status === 'PENDING' && canManageClients && (
                      <button onClick={() => handleConfirm(client.id)} className="text-emerald-600 hover:text-emerald-800 transition-colors inline-flex items-center justify-center p-1.5 rounded-lg hover:bg-emerald-50" title="Confirmar Alta">
                        <Check size={16} />
                      </button>
                    )}
                    {canManageClients && client.status !== 'BAJA' && client.status !== 'PENDING' && (
                      <button onClick={() => handleToggleStatus(client)} className={`transition-colors inline-flex items-center justify-center p-1.5 rounded-lg mr-1 ${client.status === 'ACTIVE' ? 'text-red-500 hover:text-red-700 hover:bg-red-50' : 'text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50'}`} title={client.status === 'ACTIVE' ? "Cortar Servicio (Suspender)" : "Habilitar Servicio (Activar)"}>
                        <Power size={16} />
                      </button>
                    )}
                    {canManageClients && (
                      <button onClick={() => handleEdit(client)} className="text-blue-500 hover:text-blue-700 transition-colors inline-flex items-center justify-center p-1.5 rounded-lg hover:bg-blue-50" title="Editar cliente">
                        <Edit2 size={16} />
                      </button>
                    )}
                    {canManageClients && (
                      <button onClick={() => handlePing(client)} disabled={pingingId === client.id || diagnosingId === client.id} className="text-purple-500 hover:text-purple-700 transition-colors inline-flex items-center justify-center p-1.5 rounded-lg hover:bg-purple-50 disabled:opacity-50" title="Hacer Ping a la Antena">
                        {pingingId === client.id ? <Loader2 size={16} className="animate-spin" /> : <Activity size={16} />}
                      </button>
                    )}
                    {canManageClients && (
                      <button onClick={() => handleAdvancedDiag(client)} disabled={diagnosingId === client.id || pingingId === client.id} className="text-indigo-600 hover:text-indigo-800 transition-colors inline-flex items-center justify-center p-1.5 rounded-lg hover:bg-indigo-50 disabled:opacity-50" title="Diagnóstico Avanzado de Telemetría">
                        {diagnosingId === client.id ? <Loader2 size={16} className="animate-spin" /> : <Stethoscope size={16} />}
                      </button>
                    )}
                    {canManageClients && (
                      <button
                        onClick={() => handleToggleDebitoAutomatico(client)}
                        className={`transition-colors inline-flex items-center justify-center p-1.5 rounded-lg ${
                          client.debitoAutomatico
                            ? 'text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 bg-indigo-50'
                            : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                        }`}
                        title={client.debitoAutomatico ? 'Débito Automático ACTIVO — clic para desactivar' : 'Activar Débito Automático'}
                      >
                        <CreditCard size={16} />
                      </button>
                    )}
                    <button className="text-green-600 hover:text-green-800 transition-colors inline-flex items-center justify-center p-1.5 rounded-lg hover:bg-green-50 mr-2" title="Enviar WhatsApp">
                      <MessageCircle size={16} />
                    </button>
                    {canManageClients && (
                      <>
                        <button onClick={() => handleDarDeBaja(client.id)} className="text-orange-500 hover:text-orange-700 transition-colors inline-flex items-center justify-center p-1.5 rounded-lg hover:bg-orange-50 mr-1" title="Dar de baja / Mover a Retiros">
                          <UserMinus size={16} />
                        </button>
                        <button onClick={() => handleDelete(client.id)} className="text-red-500 hover:text-red-700 transition-colors inline-flex items-center justify-center p-1.5 rounded-lg hover:bg-red-50" title="Eliminar cliente">
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
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
                        <option value="PENDING" className="text-blue-600">Pendiente de Alta</option>
                        <option value="ACTIVE" className="text-emerald-700">Activo</option>
                        <option value="SUSPENDED" className="text-orange-600">Suspendido</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Categoría</label>
                      <select name="isVip" value={formData.isVip} onChange={(e) => setFormData({ ...formData, isVip: e.target.value === 'true' })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white font-bold">
                        <option value="false">Clásico</option>
                        <option value="true" className="text-amber-600">VIP - Sin Cortes</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Contact and Address */}
                <div className="md:col-span-12 border-t border-slate-100 pt-3 mt-1">
                  <h4 className="text-sm font-bold text-slate-800 mb-3 text-slate-500 uppercase tracking-wider text-xs">Contacto y Ubicación</h4>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-4">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                      <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="correo@ejemplo.com" />
                    </div>
                    <div className="md:col-span-4">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono Principal</label>
                      <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="1122334455" />
                    </div>
                    <div className="md:col-span-4">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono Secundario</label>
                      <input type="text" name="phone2" value={formData.phone2} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="Opcional..." />
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
                    <div className="md:col-span-12">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones (Máx. 100 caracteres)</label>
                      <textarea name="observation" value={formData.observation} onChange={handleInputChange} maxLength="100" rows="2" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none" placeholder="Notas sobre el cliente..."></textarea>
                    </div>
                  </div>
                </div>
                
                {/* Hardware Grid Panel */}
                <div className="md:col-span-12 border-t border-slate-100 pt-3 mt-1">
                  <h4 className="text-sm font-bold text-slate-800 mb-3 text-slate-500 uppercase tracking-wider text-xs">Datos de Conexión (Red)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-4">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Nodo Matriz</label>
                      <select 
                        name="nodeRefId" 
                        value={formData.nodeRefId || ''} 
                        onChange={(e) => {
                          setFormData({ ...formData, nodeRefId: parseInt(e.target.value), panelRefId: '' });
                        }} 
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                      >
                        <option value="">Seleccione un nodo...</option>
                        {nodes.map(node => (
                          <option key={node.id} value={node.id}>{node.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-4">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Panel Sectorial</label>
                      <select 
                        name="panelRefId" 
                        value={formData.panelRefId || ''} 
                        onChange={(e) => setFormData({ ...formData, panelRefId: parseInt(e.target.value) })} 
                        disabled={!formData.nodeRefId} 
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-slate-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Seleccione un panel...</option>
                        {/* Se asume que la variable 'panels' está en el estado superior */}
                        {(window.panels || []).filter(p => p.nodeId === formData.nodeRefId).map(panel => (
                          <option key={panel.id} value={panel.id}>{panel.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-4">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Número de IP Asignada</label>
                      <input type="text" name="ipNumber" value={formData.ipNumber} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-sm font-bold border-l-4 border-l-blue-500" placeholder="192.168.1.50" />
                    </div>
                  </div>
                  
                  {/* Integración Winbox/WebFig para acceso rápido al Panel (Regla 8) */}
                  {formData.panelRef && (
                    <div className="flex flex-wrap items-center gap-3 mt-4">
                      <a 
                        href={`winbox://${formData.panelRef.ipAddress}?user=${formData.panelRef.user}&pass=${formData.panelRef.password}`}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
                        title="Lanzar aplicación nativa Winbox"
                      >
                        <img src="/winbox.jpg" alt="Winbox" className="w-5 h-5 inline-block mr-2 rounded-full" />
                        Abrir en Winbox
                      </a>
                      <a 
                        href={`http://${formData.panelRef.ipAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
                        title="Abrir interfaz web del equipo"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="2" y1="12" x2="22" y2="12"></line>
                          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                        </svg>
                        WebFig
                      </a>
                    </div>
                  )}
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

      {/* Modal Diagnóstico Avanzado */}
      {diagModalData && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className={`flex justify-between items-center p-5 border-b ${
              diagModalData.overallStatus === 'OPTIMO' ? 'bg-emerald-50 border-emerald-100 text-emerald-900' :
              diagModalData.overallStatus === 'OBSERVADO' ? 'bg-amber-50 border-amber-100 text-amber-900' :
              'bg-red-50 border-red-100 text-red-900'
            }`}>
              <div className="flex items-center gap-3">
                {diagModalData.overallStatus === 'OPTIMO' && <CheckCircle2 size={28} className="text-emerald-600" />}
                {diagModalData.overallStatus === 'OBSERVADO' && <AlertTriangle size={28} className="text-amber-600" />}
                {diagModalData.overallStatus === 'CRITICO' && <XCircle size={28} className="text-red-600" />}
                <div>
                  <h3 className="text-xl font-bold">Diagnóstico Avanzado de Telemetría</h3>
                  <p className="text-sm opacity-80">{diagModalData.clientName} ({diagModalData.ipNumber}) - Nodo {diagModalData.nodeName}</p>
                </div>
              </div>
              <button onClick={() => setDiagModalData(null)} className="p-1 rounded-full hover:bg-black/5 transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Body - Tarjetas Semáforo */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Tarjeta 1: Conexión e Internet (Ping 5 paquetes) */}
              <div className={`p-4 rounded-xl border ${
                diagModalData.pingStats.status === 'OPTIMO' ? 'bg-emerald-50/50 border-emerald-200' :
                diagModalData.pingStats.status === 'OBSERVADO' ? 'bg-amber-50/50 border-amber-200' :
                'bg-red-50/50 border-red-200'
              }`}>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-3 h-3 rounded-full ${
                      diagModalData.pingStats.status === 'OPTIMO' ? 'bg-emerald-500' :
                      diagModalData.pingStats.status === 'OBSERVADO' ? 'bg-amber-500' :
                      'bg-red-500 animate-pulse'
                    }`}></span>
                    <h4 className="font-bold text-slate-800">Calidad de Conexión y Latencia</h4>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                    diagModalData.pingStats.status === 'OPTIMO' ? 'bg-emerald-100 text-emerald-800' :
                    diagModalData.pingStats.status === 'OBSERVADO' ? 'bg-amber-100 text-amber-800' :
                    'bg-red-100 text-red-800'
                  }`}>{diagModalData.pingStats.status}</span>
                </div>
                <p className="text-sm text-slate-600 mt-2 font-medium">{diagModalData.pingStats.message}</p>
                <div className="flex gap-4 mt-3 text-xs bg-white p-1.5.5 rounded-lg border border-slate-100 text-slate-700">
                  <div><strong>Estado:</strong> {diagModalData.pingStats.isOnline ? 'Online 🟢' : 'Offline 🔴'}</div>
                  <div><strong>Latencia (RTT):</strong> {diagModalData.pingStats.avgRtt}</div>
                  <div><strong>Pérdida Paquetes:</strong> {diagModalData.pingStats.packetLoss}%</div>
                </div>
              </div>

              {/* Tarjeta 2: Enlace Capa 2 / ARP / Puerto */}
              <div className={`p-4 rounded-xl border ${
                diagModalData.arpStats.layer2Status === 'OPTIMO' ? 'bg-emerald-50/50 border-emerald-200' :
                'bg-red-50/50 border-red-200'
              }`}>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-3 h-3 rounded-full ${
                      diagModalData.arpStats.layer2Status === 'OPTIMO' ? 'bg-emerald-500' :
                      'bg-red-500 animate-pulse'
                    }`}></span>
                    <h4 className="font-bold text-slate-800">Enlace Físico y Capa 2 (ARP/MAC)</h4>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                    diagModalData.arpStats.layer2Status === 'OPTIMO' ? 'bg-emerald-100 text-emerald-800' :
                    'bg-red-100 text-red-800'
                  }`}>{diagModalData.arpStats.layer2Status}</span>
                </div>
                <p className="text-sm text-slate-600 mt-2 font-medium">{diagModalData.arpStats.message}</p>
                <div className="flex gap-4 mt-3 text-xs bg-white p-1.5.5 rounded-lg border border-slate-100 text-slate-700">
                  <div><strong>MAC Address:</strong> {diagModalData.arpStats.macAddress}</div>
                  <div><strong>Interfaz Nodo:</strong> {diagModalData.arpStats.interface}</div>
                  <div><strong>Estado ARP:</strong> {diagModalData.arpStats.status}</div>
                </div>
              </div>

              {/* Tarjeta 3: DHCP & Conflictos */}
              <div className={`p-4 rounded-xl border ${
                diagModalData.dhcpStats.status === 'OPTIMO' ? 'bg-emerald-50/50 border-emerald-200' :
                'bg-amber-50/50 border-amber-200'
              }`}>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-3 h-3 rounded-full ${
                      diagModalData.dhcpStats.status === 'OPTIMO' ? 'bg-emerald-500' :
                      'bg-amber-500'
                    }`}></span>
                    <h4 className="font-bold text-slate-800">Estado de Red y DHCP</h4>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                    diagModalData.dhcpStats.status === 'OPTIMO' ? 'bg-emerald-100 text-emerald-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>{diagModalData.dhcpStats.status}</span>
                </div>
                <p className="text-sm text-slate-600 mt-2 font-medium">{diagModalData.dhcpStats.message}</p>
              </div>

              {/* Tarjeta 4: Señal Inalámbrica y Cable UTP */}
              <div className="p-4 rounded-xl border bg-slate-50 border-slate-200">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-1.5">
                    <Info size={16} className="text-slate-500" />
                    <h4 className="font-bold text-slate-700">Señal Inalámbrica (-dBm) y Cable UTP</h4>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-slate-200 text-slate-700">INFO</span>
                </div>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  {diagModalData.wirelessStats.message} Para extraer telemetría de señal (-68 dBm) o tasa del cable ethernet domiciliario (10/100Mbps), el operador debe consultar directamente la antena CPE en la red local.
                </p>
              </div>

              {/* Recomendación de Soporte */}
              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-950">
                <h5 className="font-bold text-sm mb-1">💡 Recomendación para Soporte Técnico:</h5>
                <p className="text-xs leading-relaxed">
                  {diagModalData.overallStatus === 'OPTIMO' && "El enlace de telemetría desde el nodo principal hasta el equipo está en condiciones ideales. Si el cliente manifiesta lentitud o cortes, indicar reinicio eléctrico del router domiciliario (TP-Link/Mercusys) o verificar si hay interferencia wifi interna en su domicilio."}
                  {diagModalData.overallStatus === 'OBSERVADO' && "La conexión muestra latencia elevated o posible duplicidad de MAC/IP. Sugerir al técnico revisar si hay micro-cortes, saturación en el nodo o routers mal configurados (Doble NAT) en la instalación."}
                  {diagModalData.overallStatus === 'CRITICO' && "El equipo presenta pérdida de paquetes o se encuentra desconectado de la tabla ARP del nodo. Es prioritario enviar un técnico para verificar alimentación POE, conectores RJ45, cableado exterior o alineación física de la antena."}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setDiagModalData(null)}
                className="px-5 py-2 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors shadow-sm"
              >
                Cerrar Diagnóstico
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
