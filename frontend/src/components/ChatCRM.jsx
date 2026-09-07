import { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { 
  Search, 
  Send, 
  Paperclip, 
  Smile, 
  Mic, 
  MoreVertical, 
  CheckCheck, 
  Bot, 
  RefreshCw, 
  Users, 
  FileText, 
  Lock, 
  ExternalLink,
  Loader2
} from 'lucide-react';

export default function ChatCRM() {
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState({});
  const [messageInput, setMessageInput] = useState('');
  const [sofiEnabled, setSofiEnabled] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'UNREAD'
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchSofiStatus();
    fetchContacts();

    // Sincronización en tiempo real de contactos cada 3.5 segundos
    const contactsInterval = setInterval(() => {
      fetchContacts(true);
    }, 3500);

    return () => clearInterval(contactsInterval);
  }, []);

  useEffect(() => {
    if (selectedContact) {
      fetchMessages(selectedContact.phone);
      axios.post(`https://interfast-backend-95ww.onrender.com/api/chat/messages/${selectedContact.phone}/read`).catch(console.error);
      
      setContacts(prev => prev.map(c => c.phone === selectedContact.phone ? { ...c, unreadCount: 0 } : c));

      // Sincronización del chat activo cada 3 segundos
      const intervalId = setInterval(() => fetchMessages(selectedContact.phone, true), 3000);
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

  const fetchContacts = async (isPolling = false) => {
    try {
      const { data } = await axios.get('https://interfast-backend-95ww.onrender.com/api/chat/contacts');
      setContacts(data);
    } catch (err) {
      if (!isPolling) console.error(err);
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
      if (!isPolling) console.error('Error fetching messages:', err);
    } finally {
      if (!isPolling) setLoadingHistory(false);
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault();
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

      // Refrescar contactos de inmediato para mover este chat al inicio
      fetchContacts(true);

    } catch (err) {
      console.error(err);
      alert('Error enviando mensaje: ' + (err.response?.data?.error || err.message));
      setMessageInput(msg);
    } finally {
      setSending(false);
    }
  };

  const unreadTotal = useMemo(() => {
    return contacts.reduce((acc, c) => acc + (c.unreadCount > 0 ? 1 : 0), 0);
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const matchesSearch = (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
                            (c.phone && c.phone.includes(searchTerm));
      if (!matchesSearch) return false;
      if (activeTab === 'UNREAD') return c.unreadCount > 0;
      return true;
    });
  }, [contacts, searchTerm, activeTab]);

  const currentMessages = selectedContact ? (messages[selectedContact.phone] || []) : [];

  const formatMessageContent = (text) => {
    if (!text) return '';
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        const isPdf = part.includes('factura-pdf') || part.endsWith('.pdf');
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#027eb5] hover:underline break-all inline-flex items-center gap-1 font-medium bg-[#eef7fc] px-1.5 py-0.5 rounded"
          >
            {isPdf && <FileText size={13} className="text-red-500 shrink-0 inline" />}
            {part}
            <ExternalLink size={11} className="inline opacity-70 shrink-0" />
          </a>
        );
      }

      let formatted = part;
      const boldRegex = /\*([^*]+)\*/g;
      const subParts = [];
      let lastIdx = 0;
      let match;

      while ((match = boldRegex.exec(formatted)) !== null) {
        if (match.index > lastIdx) {
          subParts.push(formatted.substring(lastIdx, match.index));
        }
        subParts.push(<strong key={match.index} className="font-bold">{match[1]}</strong>);
        lastIdx = match.index + match[0].length;
      }
      if (lastIdx < formatted.length) {
        subParts.push(formatted.substring(lastIdx));
      }

      return subParts.length > 0 ? subParts : part;
    });
  };

  const getContactInitials = (name) => {
    if (!name) return 'WA';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const formatMessageTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    }

    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
      return days[d.getDay()];
    }

    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  return (
    <div className="h-[calc(100vh-5.5rem)] flex bg-[#f0f2f5] overflow-hidden rounded-2xl shadow-xl border border-slate-300 antialiased font-sans">
      
      {/* ------------------------------------------------------------- */}
      {/* SIDEBAR IZQUIERDA (Estilo WhatsApp Web Oficial) */}
      {/* ------------------------------------------------------------- */}
      <div className="w-[380px] md:w-[410px] bg-white border-r border-[#e9edef] flex flex-col shrink-0">
        
        {/* Header Superior del Sidebar */}
        <div className="bg-[#f0f2f5] px-4 py-3 flex items-center justify-between border-b border-[#e9edef]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#00a884] text-white flex items-center justify-center font-bold shadow-sm">
              <span className="text-sm">IF</span>
            </div>
            <span className="font-bold text-[#111b21] text-lg tracking-tight">WhatsApp</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Sofi Toggle Pill */}
            <button
              onClick={toggleSofi}
              title={`Sofi (Bot IA) está ${sofiEnabled ? 'Activada' : 'Pausada'}`}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer border ${
                sofiEnabled 
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                  : 'bg-slate-200 text-slate-600 border-slate-300'
              }`}
            >
              <Bot size={14} className={sofiEnabled ? 'text-emerald-700' : 'text-slate-500'} />
              <span>Sofi {sofiEnabled ? 'ON' : 'OFF'}</span>
            </button>

            <button 
              onClick={() => fetchContacts()}
              className="p-2 text-[#54656f] hover:text-[#111b21] hover:bg-[#e9edef] rounded-full transition-colors"
              title="Refrescar contactos"
            >
              <RefreshCw size={18} />
            </button>
            <button className="p-2 text-[#54656f] hover:text-[#111b21] hover:bg-[#e9edef] rounded-full transition-colors">
              <MoreVertical size={18} />
            </button>
          </div>
        </div>

        {/* Buscador & Filtros de Pestañas */}
        <div className="p-2.5 bg-white border-b border-[#f0f2f5] space-y-2">
          {/* Input Buscador */}
          <div className="relative flex items-center">
            <Search className="absolute left-3 text-[#54656f]" size={16} />
            <input 
              type="text" 
              placeholder="Buscar un chat o iniciar uno nuevo" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-1.5 bg-[#f0f2f5] rounded-lg text-sm text-[#111b21] placeholder-[#8696a0] focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#00a884] border-none transition-all"
            />
          </div>

          {/* Filter Chips: Todos | No leídos */}
          <div className="flex items-center gap-1.5 px-1">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-[#e7fce3] text-[#00a884] font-bold'
                  : 'bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef]'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setActiveTab('UNREAD')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                activeTab === 'UNREAD'
                  ? 'bg-[#e7fce3] text-[#00a884] font-bold'
                  : 'bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef]'
              }`}
            >
              No leídos {unreadTotal > 0 && <span className="text-[10px] bg-[#25d366] text-white px-1.5 py-0.2 rounded-full font-bold">{unreadTotal}</span>}
            </button>
          </div>
        </div>

        {/* Lista de Conversaciones */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#f0f2f5] custom-scrollbar">
          {filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-[#8696a0] flex flex-col items-center">
              <Users size={36} className="mb-2 opacity-40 text-[#54656f]" />
              <p className="text-sm font-medium">No se encontraron conversaciones.</p>
            </div>
          ) : (
            filteredContacts.map(c => {
              const isSelected = selectedContact?.phone === c.phone;
              return (
                <div
                  key={c.phone}
                  onClick={() => setSelectedContact(c)}
                  className={`w-full px-3.5 py-3 hover:bg-[#f5f6f6] transition-colors flex items-center gap-3 cursor-pointer select-none ${
                    isSelected ? 'bg-[#f0f2f5]' : ''
                  }`}
                >
                  {/* Avatar Circular con iniciales */}
                  <div className="w-12 h-12 rounded-full bg-[#dfe5e7] text-[#54656f] flex items-center justify-center font-bold text-sm shrink-0 border border-slate-200">
                    {getContactInitials(c.name)}
                  </div>

                  {/* Detalle y Preview del Chat */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <span className="font-semibold text-[#111b21] text-sm truncate pr-2">
                        {c.name}
                      </span>
                      <span className="text-[11px] text-[#8696a0] shrink-0 font-medium">
                        {c.lastMessageTime ? formatMessageTime(c.lastMessageTime) : 'Hoy'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <p className="text-xs text-[#667781] truncate pr-2 flex items-center gap-1">
                        {c.isFromMe && <CheckCheck size={14} className="text-[#53bdeb] shrink-0 inline" />}
                        <span className="truncate">{c.lastMessage || c.phone}</span>
                      </p>

                      {c.unreadCount > 0 && (
                        <div className="bg-[#25d366] text-white text-[11px] font-bold min-w-[20px] h-[20px] px-1 rounded-full flex items-center justify-center shrink-0">
                          {c.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ÁREA PRINCIPAL DEL CHAT (Estilo WhatsApp Web) */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col bg-[#efeae2] relative">
        
        {/* WhatsApp Doodle Texture Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.06] pointer-events-none" 
          style={{ 
            backgroundImage: 'radial-gradient(#000 1.2px, transparent 1.2px)', 
            backgroundSize: '20px 20px' 
          }} 
        />

        {selectedContact ? (
          <>
            {/* Header del Chat Activo */}
            <div className="bg-[#f0f2f5] px-4 py-2.5 border-b border-[#e9edef] flex items-center justify-between z-10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#dfe5e7] text-[#54656f] flex items-center justify-center font-bold text-sm border border-slate-200">
                  {getContactInitials(selectedContact.name)}
                </div>
                <div>
                  <h3 className="font-bold text-[#111b21] text-sm leading-tight">{selectedContact.name}</h3>
                  <p className="text-xs text-[#667781] leading-tight flex items-center gap-1.5">
                    <span>{selectedContact.phone}</span>
                    {selectedContact.clientId && (
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 rounded">
                        TK{String(selectedContact.clientId).padStart(3, '0')}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[#54656f]">
                <button 
                  onClick={() => fetchMessages(selectedContact.phone)} 
                  disabled={loadingHistory}
                  className="p-2 hover:bg-[#e9edef] rounded-full transition-colors"
                  title="Actualizar mensajes"
                >
                  <RefreshCw size={18} className={loadingHistory ? "animate-spin text-[#00a884]" : ""} />
                </button>
                <button className="p-2 hover:bg-[#e9edef] rounded-full transition-colors" title="Buscar en el chat">
                  <Search size={18} />
                </button>
                <button className="p-2 hover:bg-[#e9edef] rounded-full transition-colors" title="Opciones">
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>

            {/* Contenedor de Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 z-10 flex flex-col gap-2.5 custom-scrollbar">
              
              {/* Divisor de Fecha */}
              <div className="flex justify-center my-2">
                <span className="bg-white text-[#54656f] text-xs font-semibold px-3 py-1 rounded-lg shadow-sm border border-slate-100 uppercase tracking-wider text-[11px]">
                  Hoy
                </span>
              </div>

              {/* Mensaje de Seguridad / Encriptación */}
              <div className="flex justify-center mb-3">
                <div className="bg-[#ffeecd] text-[#54656f] text-[11px] px-3.5 py-1.5 rounded-lg shadow-sm max-w-md text-center flex items-center gap-1.5">
                  <Lock size={12} className="shrink-0 text-[#856404]" />
                  <span>Los mensajes y llamadas están cifrados de extremo a extremo en los servidores oficiales de WhatsApp.</span>
                </div>
              </div>

              {loadingHistory && currentMessages.length === 0 && (
                <div className="flex justify-center my-4">
                  <span className="bg-white text-slate-600 text-xs px-4 py-2 rounded-full shadow-md flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-[#00a884]" /> Cargando mensajes...
                  </span>
                </div>
              )}

              {currentMessages.length === 0 && !loadingHistory && (
                <div className="flex justify-center my-6">
                  <span className="bg-white/90 text-slate-600 text-xs px-4 py-2 rounded-xl shadow-sm text-center">
                    No hay mensajes registrados con este contacto aún.
                  </span>
                </div>
              )}

              {/* Burbujas de Chat */}
              {currentMessages.map((m, idx) => {
                const isMe = m.remitente === 'Nosotros' || m.isFromMe;
                return (
                  <div key={m.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div 
                      className={`max-w-[80%] md:max-w-[65%] rounded-2xl px-3.5 py-2 relative shadow-sm leading-relaxed ${
                        isMe 
                          ? 'bg-[#d9fdd3] text-[#111b21] rounded-tr-none' 
                          : 'bg-white text-[#111b21] rounded-tl-none'
                      }`}
                    >
                      {/* Contenido del Mensaje */}
                      <div className="text-[13.5px] whitespace-pre-wrap break-words">
                        {formatMessageContent(m.mensaje || m.text)}
                      </div>

                      {/* Footer de la Burbuja: Hora y Doble Tilde */}
                      <div className="text-[10px] text-[#667781] text-right mt-1 flex justify-end items-center gap-1 select-none font-medium">
                        <span>{formatMessageTime(m.created_at || m.timestamp)}</span>
                        {isMe && (
                          <CheckCheck size={14} className="text-[#53bdeb] ml-0.5 inline" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Barra Inferior de Entrada (WhatsApp Web Style) */}
            <form onSubmit={handleSend} className="bg-[#f0f2f5] px-4 py-2.5 border-t border-[#e9edef] flex items-center gap-2.5 z-10 shrink-0">
              
              <button 
                type="button" 
                className="text-[#54656f] hover:text-[#111b21] p-1.5 hover:bg-[#e9edef] rounded-full transition-colors cursor-pointer"
                title="Emojis"
              >
                <Smile size={22} />
              </button>

              <button 
                type="button" 
                className="text-[#54656f] hover:text-[#111b21] p-1.5 hover:bg-[#e9edef] rounded-full transition-colors cursor-pointer"
                title="Adjuntar"
              >
                <Paperclip size={22} />
              </button>

              {/* Input Principal */}
              <input
                type="text"
                placeholder="Escribe un mensaje"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                disabled={sending}
                className="flex-1 bg-white border-none rounded-lg px-4 py-2.5 text-sm text-[#111b21] placeholder-[#8696a0] outline-none shadow-sm focus:ring-1 focus:ring-[#00a884]"
              />

              {/* Botón de Enviar o Micrófono */}
              {messageInput.trim() ? (
                <button
                  type="submit"
                  disabled={sending}
                  className="w-10 h-10 bg-[#00a884] hover:bg-[#008f6f] disabled:bg-[#8696a0] rounded-full flex items-center justify-center text-white transition-all shadow-md shrink-0 cursor-pointer"
                  title="Enviar"
                >
                  {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-0.5" />}
                </button>
              ) : (
                <button
                  type="button"
                  className="text-[#54656f] hover:text-[#111b21] p-2 hover:bg-[#e9edef] rounded-full transition-colors cursor-pointer"
                  title="Mensaje de voz"
                >
                  <Mic size={22} />
                </button>
              )}
            </form>
          </>
        ) : (
          /* Pantalla de Bienvenida (Sin chat seleccionado) */
          <div className="flex-1 flex flex-col items-center justify-center z-10 text-center p-8 select-none">
            <div className="w-20 h-20 rounded-full bg-[#00a884]/10 flex items-center justify-center mb-6 text-[#00a884]">
              <Lock size={36} />
            </div>
            
            <h3 className="text-2xl font-bold text-[#111b21]">WhatsApp Web Interfast</h3>
            <p className="mt-2 text-[#667781] text-sm max-w-md leading-relaxed">
              Envía y recibe mensajes con tus clientes directamente desde el CRM. Gestiona consultas, respuestas automáticas de Sofi y avisos de cobro en tiempo real.
            </p>

            <div className="mt-8 flex items-center gap-1.5 text-xs text-[#8696a0]">
              <Lock size={12} />
              <span>Cifrado de extremo a extremo</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
