import { useState, useEffect } from 'react';
import axios from 'axios';
import { Wallet, ArrowDownCircle, ArrowUpCircle, PlusCircle, Filter, Calendar, Download, TrendingDown, User, Landmark } from 'lucide-react';
import * as XLSX from 'xlsx';

const API = 'https://interfast-backend-95ww.onrender.com';

export default function DailyCash() {
  const [data, setData] = useState({ payments: [], movements: [] });
  const [loading, setLoading] = useState(true);

  // Fecha inicio predeterminada al 31/07/2026 para incluir saldos iniciales de Roela y MP
  const todayDateStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState('2026-07-31');
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
  const [sourceBox, setSourceBox] = useState('BANCO_ROELA');

  // Obtener usuario logueado
  const userStr = localStorage.getItem('user');
  const loggedUser = userStr ? JSON.parse(userStr) : { username: 'sistema' };
  const rawUser = (loggedUser.username || '').toUpperCase();
  const operatorName = (rawUser === 'TKIP' || rawUser.includes('MATIAS') || rawUser.includes('MATÍAS'))
    ? 'MATIAS'
    : (rawUser.includes('VICTOR') || rawUser.includes('VÍCTOR') ? 'VICTOR' : (rawUser.includes('HUMBERTO') ? 'HUMBERTO' : rawUser));

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
      const selectedOperator = needsSocio
        ? targetSocio
        : (type === 'OUT' ? sourceBox : operatorName);

      const boxTag = type === 'OUT' ? sourceBox : (needsSocio ? targetSocio : operatorName);
      const socioText = needsSocio ? ` Retiro de socio ${targetSocio} -` : '';
      const prefixedDesc = `[CAJA: ${boxTag}]${socioText} ${desc}`;

      await axios.post(`${API}/api/cash/movement`, {
        type,
        amount,
        category,
        description: prefixedDesc,
        operator: selectedOperator
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
    const methodUpper = (p.method || '').toUpperCase();
    const isCash = methodUpper.startsWith('CASH');
    const isRoela = methodUpper.includes('ROELA');
    const isMp = methodUpper.includes('MERCADO') || methodUpper.includes('MP') || methodUpper.includes('TRANSFER') || methodUpper.includes('DEBITO') || methodUpper.includes('RAPIPAGO');

    let source = 'MANUAL';
    let paymentOperator = 'SISTEMA';
    let category = 'INGRESO_MANUAL';

    if (isCash) {
      source = 'CASH_POS';
      category = 'INGRESO_EFECTIVO';
      paymentOperator = methodUpper.includes('_') ? methodUpper.split('_')[1] : (p.user?.username || 'SISTEMA').toUpperCase();
    } else if (isRoela) {
      source = 'BANCO_ROELA';
      category = 'INGRESO_ROELA';
      paymentOperator = 'BANCO_ROELA';
    } else if (isMp) {
      source = 'MERCADOPAGO';
      category = 'INGRESO_MP';
      paymentOperator = 'MERCADOPAGO';
    }

    if (paymentOperator === 'TKIP') paymentOperator = 'MATIAS';

    baseItems.push({
      id: `P-${p.id}`,
      type: 'IN',
      source,
      category,
      title: `Abono Internet: ${p.invoice?.client?.name || 'Cliente'}`,
      amount: p.amountPaid,
      date: new Date(p.paymentDate),
      user: paymentOperator,
      operator: null
    });
  });

  (data.movements || []).forEach(m => {
    const descMatch = m.description.match(/^\[CAJA:\s*([^\]]+)\]\s*(.*)$/);
    const opUpper = (m.operator || '').toUpperCase();
    const boxFromDesc = descMatch ? descMatch[1].trim().toUpperCase() : '';

    let source = 'MANUAL';
    let movementOperator = opUpper || 'SISTEMA';

    if (boxFromDesc === 'MERCADOPAGO' || opUpper === 'MERCADOPAGO') {
      source = 'MERCADOPAGO';
      if (!opUpper) movementOperator = 'MERCADOPAGO';
    } else if (boxFromDesc === 'BANCO_ROELA' || opUpper === 'BANCO_ROELA') {
      source = 'BANCO_ROELA';
      if (!opUpper) movementOperator = 'BANCO_ROELA';
    } else if (boxFromDesc === 'VICTOR' || boxFromDesc === 'HUMBERTO' || boxFromDesc === 'MATIAS' || opUpper === 'VICTOR' || opUpper === 'HUMBERTO' || opUpper === 'MATIAS') {
      source = 'CASH_POS';
      if (boxFromDesc) movementOperator = boxFromDesc;
    }

    if (movementOperator === 'TKIP') movementOperator = 'MATIAS';
    const displayDescription = descMatch ? descMatch[2].trim() : m.description;
    const normalizedType = (m.type === 'INGRESO' || m.type === 'IN') ? 'IN' : 'OUT';

    baseItems.push({
      id: `M-${m.id}`,
      type: normalizedType,
      category: m.category || 'GASTOS_VARIOS',
      source,
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

  // ─── Cálculos de caja con lógica real ────────────────────────────────────
  const all = filteredItems;

  // Ingresos por canal
  const totalCashIn   = all.filter(i => i.source === 'CASH_POS' && i.type === 'IN').reduce((s, i) => s + i.amount, 0);
  const totalMpIn     = all.filter(i => i.source === 'MERCADOPAGO' && i.type === 'IN').reduce((s, i) => s + i.amount, 0);
  const totalRoelaIn  = all.filter(i => i.source === 'BANCO_ROELA' && i.type === 'IN').reduce((s, i) => s + i.amount, 0);
  const totalManualIn = all.filter(i => i.source === 'MANUAL' && i.type === 'IN').reduce((s, i) => s + i.amount, 0);

  // Egresos por origen específico
  const egresoMp     = all.filter(i => i.source === 'MERCADOPAGO' && i.type === 'OUT').reduce((s, i) => s + i.amount, 0);
  const egresoRoela  = all.filter(i => i.source === 'BANCO_ROELA' && i.type === 'OUT').reduce((s, i) => s + i.amount, 0);

  // Egresos generales
  const totalRetiro  = all.filter(i => i.category === 'RETIRO_SOCIO').reduce((s, i) => s + i.amount, 0);
  const totalAbono   = all.filter(i => i.category === 'ABONO_INTERNET').reduce((s, i) => s + i.amount, 0);
  const totalGastos  = all.filter(i => i.category === 'GASTOS_VARIOS').reduce((s, i) => s + i.amount, 0);
  const totalSueldo  = all.filter(i => i.category === 'SUELDO').reduce((s, i) => s + i.amount, 0);

  const saldoMp = totalMpIn - egresoMp;
  const saldoRoela = totalRoelaIn - egresoRoela;

  const totalIngreso  = totalCashIn + totalMpIn + totalRoelaIn + totalManualIn;
  const cajaGeneral   = totalIngreso - totalRetiro - totalAbono - totalGastos;

  // Caja por socio: cobros físicos propios + retiros del socio (positivo) - sueldo (negativo)
  const getSocioCaja = (socioName) => {
    const sn = socioName.toUpperCase();
    const snNorm = sn.replace('Í', 'I');
    const cashIn = all.filter(i => i.source === 'CASH_POS' && (i.user === sn || i.user === snNorm) && i.type === 'IN').reduce((s, i) => s + i.amount, 0);
    const egresoFisico = all.filter(i => (i.user === sn || i.user === snNorm) && i.type === 'OUT' && i.category !== 'SUELDO' && i.category !== 'RETIRO_SOCIO').reduce((s, i) => s + i.amount, 0);
    const retiro = all.filter(i => i.category === 'RETIRO_SOCIO' && (
      i.operator === sn || i.operator === snNorm ||
      i.user === sn || i.user === snNorm ||
      i.title.toUpperCase().includes(sn) || i.title.toUpperCase().includes(snNorm)
    )).reduce((s, i) => s + i.amount, 0);
    const sueldo = all.filter(i => i.category === 'SUELDO' && (
      i.operator === sn || i.operator === snNorm ||
      i.user === sn || i.user === snNorm ||
      i.title.toUpperCase().includes(sn) || i.title.toUpperCase().includes(snNorm)
    )).reduce((s, i) => s + i.amount, 0);
    
    // Balance = cobros físicos - egresos físicos + retiros - sueldo
    return { cashIn, egresoFisico, retiro, sueldo, balance: cashIn - egresoFisico + retiro - sueldo };
  };

  const cajaMATIAS   = getSocioCaja('MATIAS');
  const cajaVICTOR   = getSocioCaja('VICTOR');
  const cajaHUMBERTO = getSocioCaja('HUMBERTO');

  const uniqueOperators = ['TODOS', 'MERCADOPAGO', 'BANCO_ROELA', ...Array.from(new Set(all.map(i => i.user))).filter(u => u && u !== 'MERCADOPAGO' && u !== 'BANCO_ROELA').sort()];

  const exportToExcel = () => {
    if (filteredItems.length === 0) return alert('No hay datos para exportar.');
    const rows = filteredItems.map(item => ({
      'Fecha':    item.date.toLocaleDateString('es-AR'),
      'Hora':     item.date.toLocaleTimeString('es-AR', { hour:'2-digit', minute:'2-digit' }),
      'Tipo':     item.type === 'IN' ? 'INGRESO' : 'EGRESO',
      'Categoría': item.category,
      'Concepto': item.title,
      'Origen/Operador': item.user,
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
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} min="2026-07-31"
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
            <option value="INGRESOS">Ingresos (Todos)</option>
            <option value="EGRESOS">Egresos (Todos)</option>
            <option value="SUELDO">Sueldos</option>
            <option value="RETIRO_SOCIO">Retiros de Socios</option>
            <option value="ABONO_INTERNET">Abono Internet</option>
            <option value="GASTOS_VARIOS">Gastos Varios</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1"><User size={12}/> Caja / Operador</label>
          <select value={filterOperador} onChange={e => setFilterOperador(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm">
            {uniqueOperators.map((u, i) => <option key={i} value={u}>{u === 'TODOS' ? 'Cualquier Caja / Operador' : u}</option>)}
          </select>
        </div>
      </div>

      {/* ── CAJA GENERAL ── */}
      <div>
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">💼 Caja General del Negocio</h3>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cobros Físicos</p>
            <p className="text-xl lg:text-2xl font-black text-emerald-600 truncate">+${fmt(totalCashIn)}</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mercado Pago</p>
            <p className="text-xl lg:text-2xl font-black text-blue-600 truncate">${fmt(saldoMp)}</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Banco Roela</p>
            <p className="text-xl lg:text-2xl font-black text-indigo-600 truncate">${fmt(saldoRoela)}</p>
          </div>
          <div className={`rounded-2xl p-4 shadow-lg text-white flex flex-col justify-between transform hover:-translate-y-0.5 transition-transform ${cajaGeneral >= 0 ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-emerald-200' : 'bg-gradient-to-br from-red-500 to-red-700 shadow-red-200'}`}>
            <p className="text-[10px] font-bold opacity-80 uppercase tracking-wider mb-1">CAJA GENERAL</p>
            <p className="text-2xl lg:text-3xl font-black truncate">${fmt(cajaGeneral)}</p>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sueldos</p>
            <p className="text-lg lg:text-xl font-black text-red-500 truncate">-${fmt(totalSueldo)}</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Retiros Socios</p>
            <p className="text-lg lg:text-xl font-black text-red-500 truncate">-${fmt(totalRetiro)}</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Abono Internet</p>
            <p className="text-lg lg:text-xl font-black text-red-500 truncate">-${fmt(totalAbono)}</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Gastos Varios</p>
            <p className="text-lg lg:text-xl font-black text-red-500 truncate">-${fmt(totalGastos)}</p>
          </div>
        </div>
      </div>

      {/* ── CAJAS POR SOCIO ── */}
      <div>
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">👤 Caja Fuerte por Socio (Cobros Físicos)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: 'MATÍAS', key: 'MATIAS', data: cajaMATIAS },
            { name: 'VÍCTOR', key: 'VICTOR', data: cajaVICTOR },
            { name: 'HUMBERTO', key: 'HUMBERTO', data: cajaHUMBERTO }
          ].map(socio => (
            <div key={socio.name} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 border-b border-slate-100 px-5 py-4 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Caja Personal</p>
                  <h4 className="text-lg font-black text-slate-800">{socio.name}</h4>
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase">Período activo</span>
              </div>

              <div className="p-5 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                    Cobros Físicos
                  </span>
                  <span className="font-black text-emerald-600">+${fmt(socio.data.cashIn)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
                    Retiros
                  </span>
                  <span className="font-black text-blue-600">+${fmt(socio.data.retiro)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-400 inline-block"></span>
                    Sueldo
                  </span>
                  <span className="font-black text-red-500">-${fmt(socio.data.sueldo)}</span>
                </div>
              </div>

              <div className={`mx-4 mb-4 rounded-xl p-3 flex justify-between items-center ${socio.data.balance >= 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                <span className={`text-xs font-black uppercase tracking-wider ${socio.data.balance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  Balance del período
                </span>
                <span className={`text-xl font-black ${socio.data.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {socio.data.balance >= 0 ? '+' : '-'}${fmt(Math.abs(socio.data.balance))}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── LISTADO DE MOVIMIENTOS EN PANTALLA ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mt-6">
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center">
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">📋 Detalle de Movimientos</h3>
          <span className="text-xs font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200">
            {filteredItems.length} registros
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Concepto / Cliente</th>
                <th className="px-6 py-4">Origen / Caja</th>
                <th className="px-6 py-4 text-right">Monto ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-400 font-medium text-sm">
                    No hay movimientos para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-slate-700">{item.date.toLocaleDateString('es-AR')}</div>
                      <div className="text-xs text-slate-400 font-medium">{item.date.toLocaleTimeString('es-AR', { hour:'2-digit', minute:'2-digit' })}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        item.type === 'IN' 
                          ? (item.source === 'MERCADOPAGO' ? 'bg-blue-50 text-blue-700' : (item.source === 'BANCO_ROELA' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'))
                          : 'bg-red-50 text-red-700'
                      }`}>
                        {item.type === 'IN' ? 'INGRESO' : 'EGRESO'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-slate-800">{item.title}</div>
                      <div className="text-xs font-medium text-slate-400 uppercase mt-0.5">{item.category.replace('_', ' ')}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded inline-block">
                        {item.user}
                      </div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-black ${item.type === 'IN' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {item.type === 'IN' ? '+' : '-'}${fmt(item.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md my-auto max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="bg-slate-50 p-6 border-b border-slate-100 shrink-0">
              <h3 className="text-xl font-bold text-slate-800">Cargar Movimiento</h3>
              <p className="text-sm text-slate-500 mt-1">Operador: <strong className="text-blue-600">{operatorName}</strong></p>
            </div>
            <form onSubmit={submitMovement} className="p-6 space-y-4 overflow-y-auto">

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

              {/* Selector de Caja de Origen (solo para EGRESOS) */}
              {type === 'OUT' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Caja / Cuenta de Origen del Egreso</label>
                  <select 
                    value={sourceBox} 
                    onChange={e => setSourceBox(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all cursor-pointer"
                  >
                    <option value="BANCO_ROELA">🏦 Banco Roela</option>
                    <option value="MERCADOPAGO">💙 Mercado Pago</option>
                    <option value="VICTOR">💵 Cobro Físico - Víctor</option>
                    <option value="HUMBERTO">💵 Cobro Físico - Humberto</option>
                    <option value="MATIAS">💵 Cobro Físico - Matías</option>
                  </select>
                </div>
              )}

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

