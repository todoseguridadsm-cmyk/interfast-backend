import { useState, useEffect } from 'react';
import axios from 'axios';
import { Wallet, ArrowDownCircle, ArrowUpCircle, PlusCircle, MonitorCheck, Filter, Calendar, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function DailyCash() {
  const [data, setData] = useState({ payments: [], movements: [] });
  const [loading, setLoading] = useState(true);
  
  const todayDateStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayDateStr);
  const [endDate, setEndDate] = useState(todayDateStr);

  const [filterType, setFilterType] = useState('ALL');
  const [filterUser, setFilterUser] = useState('ALL');

  const [showModal, setShowModal] = useState(false);
  const [type, setType] = useState('OUT');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');

  const fetchCash = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`https://interfast-backend-95ww.onrender.com/api/cash/daily?date=${startDate}&endDate=${endDate}`);
      setData(res.data);
    } catch(err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCash();
  }, [startDate, endDate]);

  const submitMovement = async (e) => {
    e.preventDefault();
    if(!amount || !desc) return alert('Por favor completa todos los campos.');
    try {
       await axios.post('https://interfast-backend-95ww.onrender.com/api/cash/movement', { type, amount, description: desc });
       setShowModal(false);
       setAmount(''); setDesc('');
       if(startDate === todayDateStr && endDate === todayDateStr) {
           fetchCash();
       } else {
           alert('Movimiento registrado en caja correctamente. Cambiá al día de hoy para verlo.');
       }
    } catch (err) {
       alert('Error: ' + (err.response?.data?.error || err.message));
    }
  };

  const baseItems = [
    ...data.payments.map(p => ({
      id: `P-${p.id}`,
      type: 'IN',
      source: 'FACTURACION',
      title: `Abono Internet: ${p.invoice.client?.name || 'Cliente'}`,
      amount: p.amountPaid,
      date: new Date(p.paymentDate),
      user: p.user?.username || 'Sistema'
    })),
    ...data.movements.map(m => ({
      id: `M-${m.id}`,
      type: m.type,
      source: 'MANUAL',
      title: m.description,
      amount: m.amount,
      date: new Date(m.createdAt),
      user: m.user?.username || 'GHOST'
    }))
  ];

  baseItems.sort((a,b) => b.date - a.date);

  // Apply visual filters
  let filteredItems = baseItems;
  if(filterType !== 'ALL') {
     filteredItems = filteredItems.filter(i => i.type === filterType);
  }
  if(filterUser !== 'ALL') {
     filteredItems = filteredItems.filter(i => i.user === filterUser);
  }

  const invoiceIn = filteredItems.filter(i => i.source === 'FACTURACION' && i.type === 'IN').reduce((acc, i) => acc + i.amount, 0);
  const manualIn = filteredItems.filter(i => i.source === 'MANUAL' && i.type === 'IN').reduce((acc, i) => acc + i.amount, 0);
  const manualOut = filteredItems.filter(i => i.source === 'MANUAL' && i.type === 'OUT').reduce((acc, i) => acc + i.amount, 0);
  const netTotal = (invoiceIn + manualIn) - manualOut;

  // Extract unique users
  const uniqueUsers = Array.from(new Set(baseItems.map(i => i.user)));

  const exportToExcel = () => {
    if (filteredItems.length === 0) return alert("No hay datos para exportar con estos filtros.");
    
    const dataForExcel = filteredItems.map(item => ({
      "Fecha": item.date.toLocaleDateString('es-AR'),
      "Hora": item.date.toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'}),
      "Tipo": item.type === 'IN' ? 'INGRESO' : 'EGRESO',
      "Flujo": item.source,
      "Concepto / Origen": item.title,
      "Operador": item.user,
      "Monto ($)": Number(item.amount.toFixed(2))
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Caja Diaria");
    
    XLSX.writeFile(workbook, `Arqueo_Caja_${startDate}_a_${endDate}.xlsx`);
  };

  return (
    <div className="space-y-6 relative">
      <header className="flex flex-col md:flex-row justify-between md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Wallet className="text-emerald-500" size={32} />
            Arqueo de Caja
          </h2>
          <p className="text-slate-500 mt-1 md:ml-11 text-sm">Auditoría estricta de ingresos y retiros físicos.</p>
        </div>
        
        <div className="flex justify-end gap-3 mt-4 md:mt-0">
          <button 
            onClick={exportToExcel}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl font-bold shadow-md shadow-emerald-200 transition-all active:scale-95 flex items-center gap-2 w-full md:w-auto"
            title="Descargar Reporte en CSV Excel"
          >
            <Download size={20} /> Exportar Excel
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-xl font-bold shadow-md shadow-slate-200 transition-all active:scale-95 flex items-center gap-2 w-full md:w-auto"
          >
            <PlusCircle size={20} /> Registrar Movimiento
          </button>
        </div>
      </header>

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4">
         <div className="flex flex-col">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1.5"><Calendar size={14}/> Desde</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
         </div>
         <div className="flex flex-col">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1.5"><Calendar size={14}/> Hasta</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
         </div>
         <div className="flex flex-col">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1.5"><Filter size={14}/> Flujo</label>
            <select 
               value={filterType}
               onChange={(e) => setFilterType(e.target.value)}
               className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            >
               <option value="ALL">Todos los Movimientos</option>
               <option value="IN">Solo Ingresos (+)</option>
               <option value="OUT">Solo Egresos (-)</option>
            </select>
         </div>
         <div className="flex flex-col">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1.5"><Filter size={14}/> Operador</label>
            <select 
               value={filterUser}
               onChange={(e) => setFilterUser(e.target.value)}
               className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            >
               <option value="ALL">Cualquier Empleado</option>
               {uniqueUsers.map((u, i) => (
                 <option key={i} value={u}>{u}</option>
               ))}
            </select>
         </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center transition-all hover:shadow-md">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Cobros Automáticos</p>
            <h4 className="text-2xl font-black text-slate-700">+${invoiceIn.toLocaleString('es-AR', {minimumFractionDigits:2})}</h4>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center transition-all hover:shadow-md">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Ingresos Extra</p>
            <h4 className="text-2xl font-black text-emerald-600">+${manualIn.toLocaleString('es-AR', {minimumFractionDigits:2})}</h4>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center transition-all hover:shadow-md">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Egresos / Retiros</p>
            <h4 className="text-2xl font-black text-red-500">-${manualOut.toLocaleString('es-AR', {minimumFractionDigits:2})}</h4>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 rounded-2xl shadow-lg shadow-emerald-200 text-white flex flex-col justify-center transform hover:-translate-y-1 transition-transform">
            <p className="text-xs font-bold text-emerald-100 uppercase tracking-wider mb-1">Caja Fuerte (Física)</p>
            <h4 className="text-3xl font-black">${netTotal.toLocaleString('es-AR', {minimumFractionDigits:2})}</h4>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
        {loading ? (
            <div className="p-16 text-center text-slate-400 animate-pulse flex flex-col items-center">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                Revisando bóveda electrónica...
            </div>
        ) : filteredItems.length === 0 ? (
            <div className="p-16 text-center text-slate-400 flex flex-col items-center">
                <Wallet size={48} className="opacity-20 mb-4"/>
                <p className="font-medium text-lg">No hay operaciones que coincidan con estos filtros.</p>
            </div>
        ) : (
            <div className="divide-y divide-slate-100">
                {filteredItems.map(item => (
                    <div key={item.id} className="p-4 px-6 flex items-center justify-between hover:bg-slate-50 transition-colors animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-5">
                            <div className={`p-3 rounded-2xl shadow-sm ${item.type === 'IN' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                {item.type === 'IN' ? <ArrowUpCircle size={28}/> : <ArrowDownCircle size={28} />}
                            </div>
                            <div>
                                <h4 className={`font-black text-base tracking-tight ${item.type === 'IN' ? 'text-slate-800' : 'text-red-700'}`}>{item.title}</h4>
                                <div className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-1">
                                    <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider"><MonitorCheck size={10}/> {item.source}</span>
                                    <span>•</span>
                                    <span>Resp: <strong className="text-slate-700 uppercase tracking-widest">{item.user}</strong></span>
                                    <span>•</span>
                                    <span>{item.date.toLocaleDateString('es-AR')} {item.date.toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'})}</span>
                                </div>
                            </div>
                        </div>
                        <div className={`text-xl font-black tracking-tight ${item.type === 'IN' ? 'text-emerald-500' : 'text-red-500'}`}>
                            {item.type === 'IN' ? '+' : '-'}${item.amount.toLocaleString('es-AR', {minimumFractionDigits: 2})}
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* Modal Egreso */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="bg-slate-50 p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">Cargar Movimiento</h3>
              <p className="text-sm text-slate-500 mt-1">Asienta ingresos externos o retiros de caja.</p>
            </div>
            <form onSubmit={submitMovement} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={()=>setType('OUT')} className={`py-3 rounded-2xl font-black uppercase text-sm border-2 transition-all ${type === 'OUT' ? 'border-red-500 bg-red-50 text-red-700 scale-100 shadow-sm' : 'border-slate-200 text-slate-400 hover:bg-slate-50 scale-95 opacity-70'}`}>
                  Egreso
                </button>
                <button type="button" onClick={()=>setType('IN')} className={`py-3 rounded-2xl font-black uppercase text-sm border-2 transition-all ${type === 'IN' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 scale-100 shadow-sm' : 'border-slate-200 text-slate-400 hover:bg-slate-50 scale-95 opacity-70'}`}>
                  Ingreso Libre
                </button>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider text-xs">Monto Físico ($)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">$</span>
                  <input 
                    type="number" step="0.01" required autoFocus
                    value={amount} onChange={e => setAmount(e.target.value)}
                    className="w-full bg-white border-2 border-slate-200 text-slate-900 text-2xl font-black rounded-xl py-4 pl-10 pr-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-center placeholder-slate-200"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider text-xs">Concepto</label>
                <input 
                  type="text" required
                  value={desc} onChange={e => setDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all"
                  placeholder="Ej: Retiro para cadetería"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 border-2 border-transparent hover:bg-slate-200 text-slate-500 px-4 py-4 rounded-xl font-bold transition-all uppercase text-xs">
                  Cancelar
                </button>
                <button type="submit" className="flex-[2] bg-slate-900 hover:bg-slate-800 text-white border-2 border-slate-900 px-4 py-4 rounded-xl font-bold shadow-xl shadow-slate-900/20 transition-all uppercase text-xs">
                  Impactar Caja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
