import { useState, useEffect } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { Bot, CheckCircle, RefreshCw } from 'lucide-react';

export default function WhatsAppStatus() {
  const [waData, setWaData] = useState({ status: 'DISCONNECTED', qr: null });

  const fetchStatus = async () => {
    try {
      const res = await axios.get('https://interfast-backend-95ww.onrender.com/api/whatsapp/status');
      if (res.data) setWaData(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col items-center">
      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
        <Bot className="text-blue-600" />
        Estado del Robot WhatsApp
      </h3>
      
      {waData.status === 'CONNECTED' ? (
        <div className="flex flex-col items-center text-emerald-600 gap-2">
          <CheckCircle size={48} />
          <p className="font-medium text-center">¡Robot conectado y listo para notificar masivamente!</p>
        </div>
      ) : waData.status === 'QR_READY' && waData.qr ? (
        <div className="flex flex-col items-center">
          <div className="p-3 bg-white rounded-xl shadow-lg mb-3">
            <QRCodeSVG value={waData.qr} size={200} />
          </div>
          <p className="text-sm font-medium text-slate-600 text-center">
            Abre WhatsApp en el celular que quieras usar como originador y escanea este código.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center text-slate-400 gap-2">
          <RefreshCw size={32} className="animate-spin" />
          <p className="text-sm">Iniciando el motor de WhatsApp...</p>
        </div>
      )}
    </div>
  );
}
