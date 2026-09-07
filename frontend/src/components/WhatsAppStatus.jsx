import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, CheckCircle, Smartphone, Radio, ShieldAlert, Cpu, Activity, Zap, QrCode } from 'lucide-react';

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
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in text-slate-100">
      {/* HEADER FUTURISTA */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#061e16] via-[#092b1e] to-[#04140e] border border-emerald-500/30 p-6 md:p-8 shadow-[0_0_35px_rgba(16,185,129,0.15)]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-xs font-mono uppercase tracking-widest mb-3">
              <Radio size={14} className="animate-pulse text-emerald-400" />
              WhatsApp Node Engine v3.4 • Local Gateway
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Smartphone className="text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]" size={32} />
              Centro de Control WhatsApp
            </h2>
            <p className="text-slate-400 text-sm mt-1 max-w-xl">
              Módulo de conexión de socket directo para transmisiones masivas, notificaciones automatizadas y difusión con control anti-ban por colas adaptativas.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* BOTÓN DE REINICIO FORZADO */}
            <button 
              onClick={handleRestart}
              disabled={isRestarting}
              className="flex items-center justify-center gap-2 bg-slate-900/90 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 px-4 py-3 rounded-2xl font-mono text-xs uppercase tracking-wider border border-slate-700/80 hover:border-rose-500/50 shadow-lg transition-all disabled:opacity-50"
            >
              <RefreshCw size={15} className={`text-rose-400 ${isRestarting ? 'animate-spin' : ''}`} />
              {isRestarting ? 'Purgando...' : 'Forzar Reinicio'}
            </button>
          </div>
        </div>
      </div>

      {/* PANEL PRINCIPAL DE ESTADO / QR / CONEXIÓN */}
      <div className="relative bg-slate-900/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-emerald-500/30 p-8 overflow-hidden">
        {/* TELEMETRÍA SUPERIOR */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-6 mb-8 border-b border-emerald-500/20 text-xs font-mono">
          <div className="flex items-center gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
            <Activity size={18} className="text-emerald-400" />
            <div>
              <span className="text-slate-500 block text-[10px]">ESTADO SOCKET</span>
              <span className={`font-bold ${status === 'CONNECTED' ? 'text-emerald-400' : status === 'QR_READY' ? 'text-cyan-400' : 'text-amber-400'}`}>
                {status === 'CONNECTED' ? 'EN LÍNEA (CONECTADO)' : status === 'QR_READY' ? 'ESPERANDO ESCANEO' : 'INICIALIZANDO...'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
            <ShieldAlert size={18} className="text-cyan-400" />
            <div>
              <span className="text-slate-500 block text-[10px]">PROTECCIÓN ANTI-BAN</span>
              <span className="text-cyan-300 font-bold">ALGORITMO COOLDOWN ACTIVO</span>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
            <Cpu size={18} className="text-emerald-400" />
            <div>
              <span className="text-slate-500 block text-[10px]">ENCRIPTACIÓN</span>
              <span className="text-slate-300 font-bold">E2E PROTOCOL BUFFER</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center p-8 bg-slate-950/80 rounded-2xl border border-emerald-500/20 min-h-[360px] relative">
          
          {/* RENDERIZADO CONDICIONAL DE LA UI */}
          {status === 'CONNECTED' ? (
            
            <div className="text-center animate-fade-in space-y-4 max-w-md">
              <div className="relative inline-block">
                <div className="w-24 h-24 rounded-3xl bg-emerald-500/10 border-2 border-emerald-400/50 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                  <CheckCircle size={48} className="text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center">
                  <Zap size={12} className="text-slate-950 fill-slate-950" />
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-black text-white tracking-wide">Sesión de WhatsApp En Línea</h3>
                <p className="text-slate-400 text-sm mt-2">
                  El motor local está vinculado correctamente a tu dispositivo celular y listo para procesar difusiones y avisos de cobro en tiempo real.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-center gap-2 font-mono text-xs">
                <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                  <Smartphone size={14} /> Dispositivo Sincronizado
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Polling Activo (3s)
                </span>
              </div>
            </div>
            
          ) : status === 'QR_READY' && qrCode ? (
            
            <div className="text-center animate-fade-in space-y-6">
              {/* Holographic Frame for QR */}
              <div className="relative inline-block p-4 rounded-2xl bg-white/95 border-2 border-cyan-400/50 shadow-[0_0_35px_rgba(6,182,212,0.35)]">
                {/* Reticle corner marks */}
                <div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-2 border-l-2 border-cyan-400"></div>
                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-2 border-r-2 border-cyan-400"></div>
                <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-2 border-l-2 border-cyan-400"></div>
                <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-2 border-r-2 border-cyan-400"></div>

                <img 
                  src={qrCode} 
                  alt="Código QR WhatsApp" 
                  style={{ width: '260px', height: '260px', objectFit: 'contain', backgroundColor: 'white', borderRadius: '8px' }} 
                />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-mono uppercase tracking-widest">
                  <QrCode size={14} /> Escaneo Requerido
                </div>
                <h3 className="text-xl font-bold text-white tracking-wide">Vinculá tu dispositivo</h3>
                <p className="text-slate-400 text-xs font-mono max-w-sm mx-auto">
                  Abre WhatsApp en tu teléfono {'>'} Ajustes / Menú {'>'} Dispositivos Vinculados {'>'} Vincular un Dispositivo.
                </p>
              </div>
            </div>
            
          ) : (
            
            <div className="text-center text-slate-400 space-y-4 py-8">
              <div className="w-20 h-20 rounded-2xl bg-slate-900 border border-cyan-500/30 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(6,182,212,0.15)]">
                <RefreshCw size={36} className="animate-spin text-cyan-400" />
              </div>
              <div>
                <p className="font-mono text-sm text-cyan-300 font-bold tracking-wide">Iniciando motor de encriptación WhatsApp...</p>
                <p className="text-xs text-slate-500 mt-1 font-mono">Aguardá unos instantes mientras se genera el handshake de socket seguro.</p>
              </div>
            </div>
            
          )}

        </div>
      </div>
    </div>
  );
}

