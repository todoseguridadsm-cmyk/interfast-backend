import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, CheckCircle, Smartphone } from 'lucide-react';

export default function WhatsAppControlCenter() {
  const [status, setStatus] = useState('DISCONNECTED');
  const [qrCode, setQrCode] = useState(null);
  const [isRestarting, setIsRestarting] = useState(false);

  useEffect(() => {
    // Polling al backend para pedir el estado actual
    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/whatsapp/status?t=${Date.now()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStatus(res.data.status);
        if (res.data.status === 'QR_READY') {
          setQrCode(res.data.qrCode); // Imagen Base64
        }
      } catch (e) {
        console.error(e);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleRestart = async () => {
    if (!window.confirm("¿Forzar el cierre de la sesión actual y generar un QR nuevo?")) return;
    setIsRestarting(true);
    try {
      await axios.post('/api/whatsapp/restart', {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setQrCode(null);
      setStatus('DISCONNECTED');
    } catch (err) {
      alert('Error reiniciando el servicio.');
    } finally {
      setIsRestarting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Centro de Control WhatsApp (Motor Local)</h2>
          <p className="text-sm text-slate-500">Módulo exclusivo para envíos masivos y Difusión Anti-Ban</p>
        </div>
        
        {/* BOTÓN DE REINICIO FORZADO */}
        <button 
          onClick={handleRestart}
          disabled={isRestarting}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold text-sm transition-colors"
        >
          <RefreshCw size={16} className={isRestarting ? 'animate-spin' : ''} />
          {isRestarting ? 'Purgando...' : 'Forzar Reinicio'}
        </button>
      </div>

      <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-xl border border-slate-200 border-dashed min-h-[300px]">
        
        {/* RENDERIZADO CONDICIONAL DE LA UI */}
        {status === 'CONNECTED' ? (
          
          <div className="text-center animate-fade-in">
            <CheckCircle size={64} className="text-emerald-500 mx-auto mb-4" />
            <h3 className="text-2xl font-black text-slate-800 mb-2">Conexión Establecida</h3>
            <p className="text-slate-600 mb-4 max-w-sm mx-auto">
              El motor local está vinculado a tu teléfono y listo para procesar campañas de difusión.
            </p>
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full font-bold text-sm">
              <Smartphone size={16} /> Dispositivo Sincronizado
            </div>
          </div>
          
        ) : status === 'QR_READY' && qrCode ? (
          
          <div className="text-center animate-fade-in">
            <div className="bg-white p-4 rounded-xl shadow-sm inline-block mb-4">
              <img src={qrCode} alt="Código QR" style={{ width: '300px', height: '300px', objectFit: 'contain', backgroundColor: 'white', padding: '10px', borderRadius: '8px' }} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Escaneá este código</h3>
            <p className="text-sm text-slate-500 mt-1">Abre WhatsApp en tu teléfono {'>'} Dispositivos Vinculados</p>
          </div>
          
        ) : (
          
          <div className="text-center text-slate-400">
            <RefreshCw size={48} className="animate-spin mx-auto mb-4 opacity-50" />
            <p className="font-medium">Iniciando motor de encriptación...</p>
            <p className="text-xs mt-1">Aguardá unos segundos mientras se genera el código.</p>
          </div>
          
        )}

      </div>
    </div>
  );
}
