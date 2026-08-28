import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MessageSquare, Send, Bot, Check, Users, Search, Loader2, RefreshCw } from 'lucide-react';

export default function ChatCRM() {
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState({});
  const [messageInput, setMessageInput] = useState('');
  const [sofiEnabled, setSofiEnabled] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchSofiStatus();
    fetchContacts();

    // Refrescar lista de contactos cada 15 segundos para reordenar por recientes y mostrar nuevos
    const contactsInterval = setInterval(() => {
      fetchContacts(true); // silent fetch
    }, 15000);

    return () => clearInterval(contactsInterval);
  }, []);

  useEffect(() => {
    if (selectedContact) {
      // Fetch immediately
      fetchMessages(selectedContact.phone);
      // Poll every 5 seconds
      const intervalId = setInterval(() => fetchMessages(selectedContact.phone, true), 5000);
      return () => clearInterval(intervalId);
    }
  }, [selectedContact]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedContact]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchSofiStatus = async () => {
    try {
      const { data } = await axios.get('https://interfast-backend-95ww.onrender.com/api/bot/status');
      setSofiEnabled(data.enabled);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSofi = async () => {
    try {
      const newState = !sofiEnabled;
      setSofiEnabled(newState);
      await axios.post('https://interfast-backend-95ww.onrender.com/api/bot/toggle-sofi', { enabled: newState });
    } catch (err) {
      console.error(err);
      setSofiEnabled(sofiEnabled);
      alert('Error cambiando el estado de Sofi');
    }
  };

  const fetchContacts = async () => {
    try {
      const { data } = await axios.get('https://interfast-backend-95ww.onrender.com/api/chat/contacts');
      setContacts(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMessages = async (phone, isPolling = false) => {
    if (!isPolling) setLoadingHistory(true);
    try {
      const { data } = await axios.get(`https://interfast-backend-95ww.onrender.com/api/chat/messages/${phone}`);
      setMessages(prev => ({
        ...prev,
        [phone]: data
      }));
    } catch (err) {
      console.error('Error fetching WAHA messages:', err);
    } finally {
      if (!isPolling) setLoadingHistory(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedContact) return;

    const msg = messageInput;
    setMessageInput('');
    setSending(true);

    try {
      await axios.post('https://interfast-backend-95ww.onrender.com/api/chat/send', {
        phone: selectedContact.phone,
        message: msg
      });
      
      setMessages(prev => {
        const phone = selectedContact.phone;
        const currentMsgs = prev[phone] || [];
        return {
          ...prev,
          [phone]: [...currentMsgs, { id: Date.now(), remitente: 'Nosotros', mensaje: msg, created_at: new Date() }]
        };
      });

    } catch (err) {
      console.error(err);
      alert('Error enviando mensaje: ' + (err.response?.data?.error || err.message));
      setMessageInput(msg);
    } finally {
      setSending(false);
    }
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  const currentMessages = selectedContact ? (messages[selectedContact.phone] || []) : [];

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col bg-slate-50 overflow-hidden rounded-2xl shadow-sm border border-slate-200">
      
      <header className="bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
            <MessageSquare size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Interfast Whasapp Web</h2>
            <p className="text-xs text-slate-500">Historial en vivo desde WhatsApp (Sin base de datos propia)</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
          <Bot size={20} className={sofiEnabled ? 'text-indigo-600' : 'text-slate-400'} />
          <span className="text-sm font-semibold text-slate-700">
            Sofi (Bot) está {sofiEnabled ? 'Activada' : 'Apagada'}
          </span>
          <button
            onClick={toggleSofi}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${sofiEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${sofiEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        <div className="w-80 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar cliente..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {filteredContacts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                <Users size={32} className="mb-2 opacity-50" />
                <p className="text-sm">No hay clientes con teléfono registrado.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {filteredContacts.map(c => (
                  <button
                    key={c.clientId}
                    onClick={() => setSelectedContact(c)}
                    className={`w-full text-left p-4 hover:bg-slate-50 transition-colors flex flex-col gap-1 relative ${selectedContact?.clientId === c.clientId ? 'bg-emerald-50/50' : ''}`}
                  >
                    {selectedContact?.clientId === c.clientId && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                    )}
                    <div className="flex justify-between items-center w-full">
                      <span className="font-semibold text-slate-900 truncate pr-2">{c.name}</span>
                      {c.unreadCount > 0 && (
                        <div className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                          {c.unreadCount}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 truncate w-full">{c.phone}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-[#e5ddd5] relative">
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'url("https://web.whatsapp.com/img/bg-chat-tile-light_04fcacde539c58cca6745483d4858c52.png")', backgroundRepeat: 'repeat' }}></div>
          
          {selectedContact ? (
            <>
              <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center justify-between z-10 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center text-slate-600 font-bold uppercase">
                    {selectedContact.name.substring(0,2)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{selectedContact.name}</h3>
                    <p className="text-xs text-slate-500">{selectedContact.phone}</p>
                  </div>
                </div>
                <button 
                  onClick={() => fetchMessages(selectedContact.phone)} 
                  disabled={loadingHistory}
                  className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                  title="Recargar historial desde WAHA"
                >
                  <RefreshCw size={18} className={loadingHistory ? "animate-spin" : ""} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 z-10 flex flex-col gap-2">
                {loadingHistory && currentMessages.length === 0 && (
                  <div className="flex justify-center my-4">
                    <span className="bg-white/80 text-slate-600 text-xs px-4 py-2 rounded-full shadow-sm flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" /> Cargando historial desde WAHA...
                    </span>
                  </div>
                )}
                {currentMessages.length === 0 && !loadingHistory && (
                  <div className="flex justify-center my-4">
                    <span className="bg-amber-100 text-amber-800 text-xs px-4 py-2 rounded-lg shadow-sm text-center max-w-sm">
                      No se encontraron mensajes recientes en WAHA para este contacto.
                    </span>
                  </div>
                )}
                {currentMessages.map((m, idx) => {
                  const isMe = m.remitente === 'Nosotros';
                  return (
                    <div key={m.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-lg px-4 py-2 relative shadow-sm ${isMe ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-none' : 'bg-white text-slate-900 rounded-tl-none'}`}>
                        <div className="text-sm whitespace-pre-wrap break-words">{m.mensaje}</div>
                        <div className="text-[10px] text-slate-400 text-right mt-1 flex justify-end items-center gap-1">
                          {new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          {isMe && <Check size={12} className="text-emerald-500" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSend} className="bg-slate-50 p-4 border-t border-slate-200 flex items-center gap-4 z-10 shrink-0">
                <input
                  type="text"
                  placeholder="Escribe un mensaje..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  disabled={sending}
                  className="flex-1 bg-white border border-slate-300 rounded-full px-6 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all text-sm"
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim() || sending}
                  className="w-12 h-12 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 rounded-full flex items-center justify-center text-white transition-colors shadow-md shrink-0"
                >
                  {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="ml-1" />}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center z-10 text-slate-500">
              <MessageSquare size={64} className="mb-4 text-emerald-600/30" />
              <h3 className="text-2xl font-bold text-slate-700">Chat con Historial en WAHA</h3>
              <p className="mt-2 text-center max-w-sm">Selecciona un cliente. El historial de mensajes se descargará directamente del celular en tiempo real.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
