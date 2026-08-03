import { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart3, Download, TrendingUp, AlertTriangle, Users, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Reports() {
  const [data, setData] = useState({ metrics: {}, payments: [] });
  const [loading, setLoading] = useState(true);
  
  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`https://interfast-backend-95ww.onrender.com/api/reports/sales`);
      setData(res.data);
    } catch(err) {
      console.error("Error loading metrics:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const exportSalesExcel = () => {
    if (!data.payments || data.payments.length === 0) return alert('No hay cobros en este mes para exportar.');
    
    const rows = data.payments.map(p => ({
      'ID de Recibo': p.id,
      'Fecha Cobro': new Date(p.paymentDate).toLocaleDateString('es-AR'),
      'Nombre Cliente': p.invoice.client?.name || 'Cliente Borrado',
      'DNI': p.invoice.client?.dni || '',
      'Período Facturado': `${String(p.invoice.month).padStart(2,'0')}/${p.invoice.year}`,
      'Abono Base ($)': p.invoice.originalAmount,
      'Mora Aplicada ($)': p.lateFeeApplied,
      'Total Pagado Bruto ($)': p.amountPaid,
      'Comisión MP ($)': p.mpFee || 0,
      'Impuestos MP ($)': p.mpTax || 0,
      'Total Neto ($)': p.amountPaid - (p.mpFee || 0) - (p.mpTax || 0),
      'Método de Pago': p.method
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Cobranzas");
    XLSX.writeFile(workbook, `Reporte_Caja_${month}-${year}.xlsx`);
  };

  const exportClientsExcel = async () => {
    try {
      const res = await axios.get('https://interfast-backend-95ww.onrender.com/api/clients');
      const clients = res.data;
      if (!clients || clients.length === 0) return alert('No hay clientes.');

      const rows = clients.map(c => ({
        'N° Cliente': `TK${String(c.id).padStart(3, '0')}`,
        'Nombre': c.name,
        'DNI': c.dni,
        'Teléfono': c.phone,
        'Dirección': c.address,
        'Ciudad': c.city || '',
        'Provincia': c.province || '',
        'Nodo Red': c.mainNode || '',
        'Panel': c.panelId || '',
        'IP Asignada': c.ipNumber || '',
        'Plan Mbps': c.plan?.name || 'Sin Plan',
        'Estado': c.status
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Padron Clientes");
      XLSX.writeFile(workbook, `Padron_Clientes_Activos.xlsx`);
    } catch(err) {
      alert("Error al obtener padrón general");
    }
  };

  const originalM = data.metrics || {};
  // Caja Bruta = todos los ingresos - egresos manuales (comisiones MP van a sección Conciliación MP)
  // Caja Neta Histórica = totalNeto calculado en el backend (incluye todo)
  const m = {
    ...originalM
  };


  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <BarChart3 className="text-blue-600" size={32} />
            Reportes e Histórico General
          </h2>
          <p className="text-slate-500 mt-1 ml-11">Historial infinito de cobros, movimientos de caja y balances.</p>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-2xl shadow-lg shadow-emerald-200 text-white hover:scale-105 transition-transform cursor-default">
          <div className="flex items-start justify-between">
            <div className="w-full">
              <p className="text-emerald-100 font-medium mb-1 flex justify-between items-center w-full pr-4">
                <span>Caja Neta Histórica Total</span>
                <span className="text-xs bg-emerald-700/50 px-2 py-1 rounded-full border border-emerald-400/30">Bruta: ${m.totalBruto?.toLocaleString('es-AR', {minimumFractionDigits: 0}) || '0'}</span>
              </p>
              <h3 className="text-4xl font-black">${(m.totalNeto || m.totalCollected)?.toLocaleString('es-AR', {minimumFractionDigits: 2}) || '0'}</h3>
              <p className="text-sm text-emerald-100 mt-2 flex items-center gap-1"><TrendingUp size={14}/> {m.paymentsCount || 0} Pagos procesados (Global)</p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm"><Download size={24} /></div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-rose-500 to-red-600 p-6 rounded-2xl shadow-lg shadow-red-200 text-white hover:scale-105 transition-transform cursor-default">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-red-100 font-medium mb-1">Deuda Total Pendiente</p>
              <h3 className="text-4xl font-black">${m.pendingAmount?.toLocaleString('es-AR') || '0'}</h3>
              <p className="text-sm text-red-100 mt-2 flex items-center gap-1"><AlertTriangle size={14}/> {m.pendingCount || 0} Deudores actuales</p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm"><AlertTriangle size={24} /></div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl shadow-lg shadow-blue-200 text-white hover:scale-105 transition-transform cursor-default">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-blue-100 font-medium mb-1">Mora Histórica Recolectada</p>
              <h3 className="text-4xl font-black">${m.totalLateFees?.toLocaleString('es-AR') || '0'}</h3>
              <p className="text-sm text-blue-100 mt-2 flex items-center gap-1"><Users size={14}/> Base Activa: {m.activeClients || 0}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm"><Users size={24} /></div>
          </div>
        </div>
      </div>

      {/* Export Modules */}
      <h3 className="text-xl font-bold text-slate-800 mt-8 mb-4 flex items-center gap-2">
        <FileSpreadsheet className="text-emerald-500" /> Exportación de Datos Estructurados (Excel)
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-emerald-100 p-6 rounded-2xl shadow-sm hover:shadow-lg transition-all group">
          <div className="flex gap-4 items-start">
            <div className="bg-emerald-100 text-emerald-600 p-4 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-colors"><FileSpreadsheet size={32} /></div>
            <div className="flex-1">
              <h4 className="font-bold text-lg text-slate-800">Hoja de Cobranzas</h4>
              <p className="text-sm text-slate-500 mt-1 mb-4">Arqueo de caja detallado de este mes con impuestos, DNI y estado.</p>
              <button onClick={exportSalesExcel} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-md shadow-emerald-200 transition-colors text-sm hover:-translate-y-0.5 active:translate-y-0">
                Descargar Flujo Monetario (.XLSX)
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white border border-blue-100 p-6 rounded-2xl shadow-sm hover:shadow-lg transition-all group">
          <div className="flex gap-4 items-start">
            <div className="bg-blue-100 text-blue-600 p-4 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors"><FileSpreadsheet size={32} /></div>
            <div className="flex-1">
              <h4 className="font-bold text-lg text-slate-800">Padrón de Abonados Global</h4>
              <p className="text-sm text-slate-500 mt-1 mb-4">Todos los clientes activos en la red, Direcciones fìsicas, Ips, Nodos y Planes.</p>
              <button onClick={exportClientsExcel} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-md shadow-blue-200 transition-colors text-sm hover:-translate-y-0.5 active:translate-y-0">
                Descargar Info Padrón (.XLSX)
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
