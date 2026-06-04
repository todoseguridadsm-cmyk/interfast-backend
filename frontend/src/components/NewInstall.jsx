import { useState, useEffect } from 'react';
import axios from 'axios';
import { UserPlus } from 'lucide-react';

export default function NewInstall() {
  const [plans, setPlans] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  const initialFormState = {
    dni: '', name: '', businessName: '', email: '', phone: '', address: '', fiscalAddress: '', 
    city: '', province: '', zipCode: '', mainNode: '', panelId: '', ipNumber: '', planId: '',
    cuit: '', taxCondition: 'CONSUMIDOR_FINAL', status: 'PENDING', hasRouter: false, hasMast: false, 
    registrationDate: new Date().toISOString().split('T')[0]
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    axios.get('https://interfast-backend-95ww.onrender.com/api/plans')
      .then(res => setPlans(res.data))
      .catch(err => console.error(err));
      
    axios.get('https://interfast-backend-95ww.onrender.com/api/nodes')
      .then(res => setNodes(res.data))
      .catch(err => console.error(err));
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    
    const payload = {
      ...formData,
      planId: formData.planId ? parseInt(formData.planId) : null
    };

    try {
      await axios.post('https://interfast-backend-95ww.onrender.com/api/clients', payload);
      setSuccessMsg('¡Cliente registrado exitosamente en el sistema!');
      setFormData(initialFormState); // Reset form
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      alert('Error al guardar el cliente. Verifique los datos o intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
          <UserPlus className="text-emerald-600" size={32} />
          Alta Rápida de Cliente
        </h2>
        <p className="text-slate-500 mt-1 ml-11">
          Formulario para técnicos e instaladores. Complete los datos para registrar un nuevo abonado en la base central.
        </p>
      </header>

      {successMsg && (
        <div className="bg-emerald-100 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl mb-6 font-medium text-center">
          {successMsg}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Personal Data */}
            <div className="md:col-span-8">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
              <input required type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" placeholder="Ej: Juan Pérez" />
            </div>
            <div className="md:col-span-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">DNI</label>
              <input required type="text" name="dni" value={formData.dni} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" placeholder="12345678" />
            </div>
            
            {formData.taxCondition === 'RESPONSABLE_INSCRIPTO' && (
              <div className="md:col-span-12">
                <label className="block text-sm font-medium text-slate-700 mb-1">Razón Social</label>
                <input type="text" name="businessName" value={formData.businessName} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" placeholder="Ej: Empresa S.A." />
              </div>
            )}

            {/* Tax Data */}
            <div className="md:col-span-12 border-t border-slate-100 pt-5 mt-2">
              <h4 className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-wider">Datos Impositivos (AFIP)</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">C.U.I.T / C.U.I.L</label>
                  <input type="text" name="cuit" value={formData.cuit} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm" placeholder="Opcional..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Condición Frente al IVA</label>
                  <select name="taxCondition" value={formData.taxCondition} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm bg-white">
                    <option value="CONSUMIDOR_FINAL">Consumidor Final</option>
                    <option value="RESPONSABLE_INSCRIPTO">Responsable Inscripto</option>
                    <option value="MONOTRIBUTISTA">Monotributista</option>
                    <option value="EXENTO">Exento</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Estado de la Cuenta</label>
                  <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm bg-white font-bold">
                    <option value="PENDING" className="text-blue-600">Pendiente de Alta</option>
                    <option value="ACTIVE" className="text-emerald-700">Activo</option>
                    <option value="SUSPENDED" className="text-orange-600">Suspendido</option>
                    <option value="BAJA" className="text-red-600">Baja (No factura)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Contact and Address */}
            <div className="md:col-span-12 border-t border-slate-100 pt-5 mt-2">
              <h4 className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-wider">Contacto y Ubicación</h4>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                <div className="md:col-span-6">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" placeholder="correo@ejemplo.com" />
                </div>
                <div className="md:col-span-6">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono Móvil (WhatsApp)</label>
                  <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" placeholder="1122334455" />
                </div>
                <div className="md:col-span-6">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Dirección de Instalación</label>
                  <input type="text" name="address" value={formData.address} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500" placeholder="Calle Falsa 123" />
                </div>
                <div className="md:col-span-6">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Dirección Fiscal</label>
                  <input type="text" name="fiscalAddress" value={formData.fiscalAddress} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500" placeholder="Ej: Av. San Martín 456" />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ciudad / Localidad</label>
                  <input type="text" name="city" value={formData.city} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500" placeholder="Ciudad" />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cód. Postal</label>
                  <input type="text" name="zipCode" value={formData.zipCode} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500" placeholder="5570" />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Provincia</label>
                  <input type="text" name="province" value={formData.province} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500" placeholder="Provincia" />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Alta</label>
                  <input type="date" name="registrationDate" value={formData.registrationDate} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm" />
                </div>
              </div>
            </div>
            
            {/* Hardware Grid Panel */}
            <div className="md:col-span-12 border-t border-slate-100 pt-5 mt-2">
              <h4 className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-wider">Datos de Conexión (Red)</h4>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Nodo Principal (Torre)</label>
                  <select name="mainNode" value={formData.mainNode} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm bg-white">
                    <option value="">Seleccione un nodo...</option>
                    {nodes.map(node => (
                      <option key={node.id} value={node.name}>{node.name}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-slate-500 mb-1">ID del Panel Sectorial</label>
                  <input type="text" name="panelId" value={formData.panelId} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm" placeholder="Ej: P-04" />
                </div>
                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Número de IP Asignada</label>
                  <input type="text" name="ipNumber" value={formData.ipNumber} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono text-sm font-bold border-l-4 border-l-emerald-500" placeholder="192.168.1.50" />
                </div>
              </div>
            </div>

            <div className="md:col-span-12 border-t border-slate-100 pt-5 mt-2">
              <h4 className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-wider">Inventario Entregado (Equipos de la Empresa)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-emerald-50 p-5 border border-emerald-100 rounded-xl">
                <label className="flex items-center gap-3 cursor-pointer text-sm font-semibold text-slate-700">
                  <input type="checkbox" name="hasRouter" checked={formData.hasRouter} onChange={handleInputChange} className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300" />
                  Se instaló Router Wi-Fi
                </label>
                <label className="flex items-center gap-3 cursor-pointer text-sm font-semibold text-slate-700">
                  <input type="checkbox" name="hasMast" checked={formData.hasMast} onChange={handleInputChange} className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300" />
                  Se instaló Mástil / Antena Ext.
                </label>
              </div>
            </div>

            <div className="md:col-span-12 border-t border-slate-100 pt-5 mt-2 mb-2">
              <label className="block text-sm font-bold text-slate-800 mb-2">Asignar Plan de Internet</label>
              <select name="planId" value={formData.planId} onChange={handleInputChange} className="w-full px-4 py-3 border border-slate-300 font-medium rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-slate-50 text-slate-900">
                <option value="">-- Sin Plan Seleccionado (Dejar en blanco para asignar luego) --</option>
                {plans.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.megas} MB) - ${p.priceV1 || p.totalPrice}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="pt-6 mt-4 border-t border-slate-100 flex justify-end">
            <button 
              type="submit" 
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold shadow-md shadow-emerald-200 transition-all text-base w-full md:w-auto"
            >
              {loading ? 'Guardando en el servidor...' : 'Completar Alta de Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
