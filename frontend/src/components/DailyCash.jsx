import { useState, useEffect } from 'react';
import axios from 'axios';
import { Wallet, ArrowDownCircle, ArrowUpCircle, PlusCircle, Filter, Calendar, Download, TrendingDown, User } from 'lucide-react';
import * as XLSX from 'xlsx';

const API = 'https://interfast-backend-95ww.onrender.com';

export default function DailyCash() {
  const [data, setData] = useState({ payments: [], movements: [] });
  const [loading, setLoading] = useState(true);

  // Fecha inicio fija: 02/08/2026 según requerimiento
  const todayDateStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState('2026-08-02');
  const [endDate, setEndDate] = useState(todayDateStr);

  const [filterFlujo, setFilterFlujo] = useState('TODOS');
  const [filterOperador, setFilterOperador] = useState('TODOS');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [type, setType] = useState('OUT');
  const [category, setCategory] = useState('GASTOS_VARIOS');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [targetSocio, setTargetSocio] = useState('MATIAS');

  // Obtener usuario logueado
  const userStr = localStorage.getItem('user');
  const loggedUser = userStr ? JSON.parse(userStr) : { username: 'sistema' };
  const operatorName = loggedUser.username.toUpperCase();

  const fetchCash = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/cash/daily?date=${startDate}&endDate=${endDate}`);
      setData(res.data);
    } catch(err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCash(); }, [startDate, endDate]);

  const submitMovement = async (e) => {
    e.preventDefault();
    if(!amount || !desc) return alert('Por favor completa todos los campos.');
    try {
      const needsSocio = category === 'SUELDO' || category === 'RETIRO_SOCIO';
      const prefixedDesc = `[CAJA: ${operatorName}] ${desc}`;

      await axios.post(`${API}/api/cash/movement`, {
        type,
        amount,
        category,
        description: prefixedDesc,
        operator: needsSocio ? targetSocio : operatorName
      });
      setShowModal(false);
      setAmount(''); setDesc(''); setCategory('GASTOS_VARIOS');
      fetchCash();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    }
  };

  // ─── Construcción de items base ───────────────────────────────────────────
  const baseItems = [];

  (data.payments || []).forEach(p => {
    const isCash = p.method.startsWith('CASH');
    const paymentOperator = isCash
      ? (p.method.includes('_') ? p.method.split('_')[1] : (p.user?.username || 'SISTEMA')).toUpperCase()
      : 'MERCADOPAGO';

    baseItems.push({
      id: `P-${p.id}`,
      type: 'IN',
      source: isCash ? 'CASH_POS' : 'MERCADOPAGO',
      category: isCash ? 'INGRESO_EFECTIVO' : 'INGRESO_MP',
      title: `Abono Internet: ${p.invoice?.client?.name || 'Cliente'}`,
      amount: p.amountPaid,
      date: new Date(p.paymentDate),
      user: paymentOperator,
      operator: null
    });
  });

  (data.movements || []).forEach(m => {
    const descMatch = m.description.match(/^\[CAJA:\s*([^\]]+)\]\s*(.*)$/);
    const movementOperator = descMatch
      ? descMatch[1].trim().toUpperCase()
      : (m.user?.username || 'SISTEMA').toUpperCase();
    const displayDescription = descMatch ? descMatch[2].trim() : m.description;

    baseItems.push({
      id: `M-${m.id}`,
      type: m.type,
      category: m.category || 'GASTOS_VARIOS',
      source: 'MANUAL',
      title: displayDescription,
      amount: m.amount,
      date: new Date(m.createdAt),
      user: movementOperator,
      operator: m.operator ? m.operator.toUpperCase() : null
    });
  });

  baseItems.sort((a, b) => b.date - a.date);

  // ─── Filtros visuales ─────────────────────────────────────────────────────
  let filteredItems = [...baseItems];

  if (filterFlujo !== 'TODOS') {
    switch(filterFlujo) {
      case 'INGRESOS':
        filteredItems = filteredItems.filter(i => i.type === 'IN');
        break;
      case 'EGRESOS':
        filteredItems = filteredItems.filter(i => i.type === 'OUT');
        break;
      case 'SUELDO':
        filteredItems = filteredItems.filter(i => i.category === 'SUELDO');
        break;
      case 'RETIRO_SOCIO':
        filteredItems = filteredItems.filter(i => i.category === 'RETIRO_SOCIO');
        break;
      case 'ABONO_INTERNET':
        filteredItems = filteredItems.filter(i => i.category === 'ABONO_INTERNET');
        break;
      case 'GASTOS_VARIOS':
        filteredItems = filteredItems.filter(i => i.category === 'GASTOS_VARIOS');
        break;
      default: break;
    }
  }

  if (filterOperador !== 'TODOS') {
    filteredItems = filteredItems.filter(i => i.user === filterOperador);
  }

  // ─── Cálculos de caja — $0 hasta nuevo aviso ─────────────────────────────
  const totalCashIn   = 0;
  const totalMpIn     = 0;
  const totalManualIn = 0;
  const totalSueldo   = 0;
  const totalRetiro   = 0;
  const totalAbono    = 0;
  const totalGastos   = 0;
  const totalIngreso  = 0;
  const totalEgresos  = 0;
  const cajaGeneral   = 0;

  const cajaMATIAS   = { cashIn: 0, retiro: 0, sueldo: 0, net: 0 };
  const cajaVICTOR   = { cashIn: 0, retiro: 0, sueldo: 0, net: 0 };
  const cajaHUMBERTO = { cashIn: 0, retiro: 0, sueldo: 0, net: 0 };

  const all = baseItems;
  const uniqueOperators = ['TODOS', ...Array.from(new Set(all.map(i => i.user))).filter(Boolean).sort()];

  const exportToExcel = () => {
    if (filteredItems.length === 0) return alert('No hay datos para exportar.');
    const rows = filteredItems.map(item => ({
      'Fecha':    item.date.toLocaleDateString('es-AR'),
      'Hora':     item.date.toLocaleTimeString('es-AR', { hour:'2-digit', minute:'2-digit' }),
      'Tipo':     item.type === 'IN' ? 'INGRESO' : 'EGRESO',
      'Categoría': item.category,
      'Concepto': item.title,
      'Operador': item.user,
      'Socio Afectado': item.operator || '-',
      'Monto ($)': Number(item.amount.toFixed(2))
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Arqueo de Caja');
    XLSX.writeFile(wb, `Arqueo_${startDate}_a_${endDate}.xlsx`);
  };

  const fmt = (n) => n.toLocaleString('es-AR', { minimumFractionDigits: 2 });

  return (
    <div className="space-y-6 relative">
      {/* ── HEADER ── */}
      <header className="flex flex-col md:flex-row justify-between md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Wallet className="text-emerald-500" size={32} />
            Arqueo de Caja
          </h2>
          <p className="text-slate-500 mt-1 md:ml-11 text-sm">
            Operador activo: <strong className="text-blue-600 uppercase">{operatorName}</strong>
          </p>
        </div>
        <div className="flex gap-3 flex-wrap justify-end">
          <button onClick={exportToExcel} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl font-bold shadow-md shadow-emerald-200 transition-all active:scale-95 flex items-center gap-2">
            <Download size={18} /> Exportar Excel
          </button>
          <button onClick={() => setShowModal(true)} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-xl font-bold shadow-md transition-all active:scale-95 flex items-center gap-2">
            <PlusCircle size={18} /> Registrar Movimiento
          </button>
        </div>
      </header>

      {/* ── FILTROS ── */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1"><Calendar size={12}/> Desde</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1"><Calendar size={12}/> Hasta</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1"><Filter size={12}/> Flujo</label>
          <select value={filterFlujo} onChange={e => setFilterFlujo(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm">
            <option value="TODOS">Todos los Movimientos</option>
            <option value="INGRESOS">Ingresos (MP + Efectivo)</option>
            <option value="EGRESOS">Egresos (Todos)</option>
            <option value="SUELDO">Sueldos</option>
            <option value="RETIRO_SOCIO">Retiros de Socios</option>
            <option value="ABONO_INTERNET">Abono Internet</option>
            <option value="GASTOS_VARIOS">Gastos Varios</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1"><User size={12}/> Operador</label>
          <select value={filterOperador} onChange={e => setFilterOperador(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm">
            {uniqueOperators.map((u, i) => <option key={i} value={u}>{u === 'TODOS' ? 'Cualquier Operador' : u}</option>)}
          </select>
        </div>
      </div>

      {/* ── CAJA GENERAL ── */}
      <div>
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">💼 Caja General del Negocio</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Cobros Físicos</p>
            <p className="text-lg font-black text-emerald-600">+${fmt(totalCashIn)}</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Mercado Pago</p>
            <p className="text-lg font-black text-blue-600">+${fmt(totalMpIn)}</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Sueldos</p>
            <p className="text-lg font-black text-red-500">-${fmt(totalSueldo)}</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Retiros Socios</p>
            <p className="text-lg font-black text-red-500">-${fmt(totalRetiro)}</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Abono Internet</p>
            <p className="text-lg font-black text-red-500">-${fmt(totalAbono)}</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Gastos Varios</p>
            <p className="text-lg font-black text-red-500">-${fmt(totalGastos)}</p>
          </div>
          <div className={`rounded-2xl p-4 shadow-lg text-white flex flex-col justify-center transform hover:-translate-y-1 transition-transform col-span-2 md:col-span-1 ${cajaGeneral >= 0 ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-emerald-200' : 'bg-gradient-to-br from-red-500 to-red-700 shadow-red-200'}`}>
            <p className="text-[10px] font-bold opacity-80 uppercase mb-1">CAJA GENERAL</p>
            <p className="text-2xl font-black">${fmt(cajaGeneral)}</p>
          </div>
        </div>
      </div>

      {/* ── CAJAS POR SOCIO ── */}
      <div>
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">👤 Caja Fuerte por Socio</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: 'MATÍAS', data: cajaMATIAS, color: 'blue' },
            { name: 'VÍCTOR', data: cajaVICTOR, color: 'indigo' },
            { name: 'HUMBERTO', data: cajaHUMBERTO, color: 'violet' }
          ].map(socio => (
            <div key={socio.name} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Socio</p>
                  <h4 className="text-lg font-black text-slate-800">{socio.name}</h4>
                </div>
                <span className={`bg-${socio.color}-100 text-${socio.color}-700 text-2xl font-black px-3 py-1 rounded-xl`}>
                  ${fmt(socio.data.net)}
                </span>
              </div>
              <div className="border-t border-slate-100 pt-3 space-y-1 text-xs font-bold text-slate-500">
                <div className="flex justify-between"><span>Cobros Físicos:</span> <span className="text-emerald-600">+${fmt(socio.data.cashIn)}</span></div>
                <div className="flex justify-between"><span>Retiros:</span> <span className="text-blue-600">+${fmt(socio.data.retiro)}</span></div>
                <div className="flex justify-between"><span>Sueldo:</span> <span className="text-red-500">-${fmt(socio.data.sueldo)}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="bg-slate-50 p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">Cargar Movimiento</h3>
              <p className="text-sm text-slate-500 mt-1">Operador: <strong className="text-blue-600">{operatorName}</strong></p>
            </div>
            <form onSubmit={submitMovement} className="p-6 space-y-4">

              {/* Tipo */}
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => { setType('OUT'); setCategory('GASTOS_VARIOS'); }}
                  className={`py-3 rounded-2xl font-black uppercase text-sm border-2 transition-all ${type === 'OUT' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 text-slate-400 hover:bg-slate-50 opacity-70'}`}>
                  Egreso
                </button>
                <button type="button" onClick={() => { setType('IN'); setCategory('INGRESO_MANUAL'); }}
                  className={`py-3 rounded-2xl font-black uppercase text-sm border-2 transition-all ${type === 'IN' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-400 hover:bg-slate-50 opacity-70'}`}>
                  Ingreso
                </button>
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Categoría</label>
                <select value={category} onChange={e => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all">
                  {type === 'OUT' ? (
                    <>
                      <option value="GASTOS_VARIOS">Gastos Varios del Sistema</option>
                      <option value="SUELDO">Sueldo de Socio</option>
                      <option value="RETIRO_SOCIO">Retiro de Socio</option>
                      <option value="ABONO_INTERNET">Abono Internet (Proveedor)</option>
                    </>
                  ) : (
                    <option value="INGRESO_MANUAL">Ingreso Manual / Otros</option>
                  )}
                </select>
              </div>

              {/* Selector de socio (solo para SUELDO y RETIRO_SOCIO) */}
              {(category === 'SUELDO' || category === 'RETIRO_SOCIO') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                    {category === 'SUELDO' ? '¿A quién se le paga el sueldo?' : '¿Quién realiza el retiro?'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['MATIAS', 'VICTOR', 'HUMBERTO'].map(s => (
                      <button type="button" key={s} onClick={() => setTargetSocio(s)}
                        className={`py-2 rounded-xl font-bold text-xs border-2 transition-all ${targetSocio === s ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-400 hover:bg-slate-50'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Monto */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Monto ($)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">$</span>
                  <input type="number" step="0.01" required autoFocus
                    value={amount} onChange={e => setAmount(e.target.value)}
                    className="w-full bg-white border-2 border-slate-200 text-slate-900 text-2xl font-black rounded-xl py-4 pl-10 pr-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-center placeholder-slate-200"
                    placeholder="0.00" />
                </div>
              </div>

              {/* Concepto */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Concepto</label>
                <input type="text" required
                  value={desc} onChange={e => setDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all"
                  placeholder={type === 'OUT' ? 'Ej: Pago de FITER mes agosto' : 'Ej: Ingreso por venta de router'} />
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-500 px-4 py-4 rounded-xl font-bold transition-all uppercase text-xs">
                  Cancelar
                </button>
                <button type="submit"
                  className="flex-[2] bg-slate-900 hover:bg-slate-800 text-white px-4 py-4 rounded-xl font-bold shadow-xl transition-all uppercase text-xs">
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
