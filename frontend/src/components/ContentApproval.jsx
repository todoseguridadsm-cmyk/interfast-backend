import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CheckCircle, Clock, Trash2, Edit3, Loader2, Send, Image as ImageIcon, Sparkles, RefreshCw, Share2, Video, Eye } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://interfast-backend-95ww.onrender.com/api';

export default function ContentApproval() {
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);

  const fetchContents = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/content_library`);
      setContents(response.data);
    } catch (error) {
      console.error('Error fetching content:', error);
      alert('Error al cargar la biblioteca de contenidos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContents();
  }, []);

  const handleContentChange = (id, newText) => {
    setContents(contents.map(c => c.id === id ? { ...c, contenido_post: newText } : c));
  };

  const handleUrlMediaChange = (id, newUrl) => {
    setContents(contents.map(c => c.id === id ? { ...c, url_media: newUrl } : c));
  };

  const handleApprove = async (content) => {
    try {
      setApprovingId(content.id);
      await axios.put(`${API_URL}/content_library/${content.id}/aprobar`, {
        contenido_post: content.contenido_post,
        url_media: content.url_media || ''
      });
      setContents(contents.filter(c => c.id !== content.id));
    } catch (error) {
      console.error('Error approving content:', error);
      alert('Error al aprobar el contenido');
    } finally {
      setApprovingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este borrador?')) return;
    try {
      await axios.delete(`${API_URL}/content_library/${id}`);
      setContents(contents.filter(c => c.id !== id));
    } catch (error) {
      alert('Error al eliminar');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* Cyber Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#050b18] via-[#150a2e] to-[#040814] border border-indigo-500/30 p-6 md:p-8 shadow-[0_0_35px_rgba(99,102,241,0.15)]">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="relative p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/40 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
              <Share2 size={36} className="drop-shadow-[0_0_8px_#818cf8]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 font-semibold tracking-wider uppercase">
                  SOCIAL MEDIA AI // AUTOMATION
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-wide mt-1">
                Aprobación de <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Contenido</span>
              </h1>
              <p className="text-slate-400 text-xs md:text-sm mt-1 max-w-xl">
                Revisa, edita y autoriza los posts generados por IA para publicar automáticamente en redes sociales.
              </p>
            </div>
          </div>

          <button 
            onClick={fetchContents} 
            className="p-2.5 px-4 rounded-xl bg-slate-900/80 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-300 border border-slate-800 hover:border-indigo-500/40 transition-all text-xs font-semibold flex items-center gap-2 shadow-inner"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-indigo-400' : ''} />
            <span>Actualizar Biblioteca</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin text-indigo-400" size={40} />
        </div>
      ) : contents.length === 0 ? (
        <div className="rounded-3xl bg-gradient-to-b from-[#070e1e] to-[#040812] border border-slate-800 p-12 text-center shadow-xl">
          <div className="mx-auto bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            <CheckCircle size={32} />
          </div>
          <h3 className="text-xl font-black text-white mb-1">¡Todo al Día!</h3>
          <p className="text-slate-400 text-xs font-mono max-w-sm mx-auto">
            No hay borradores de contenido pendientes de aprobación en este momento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {contents.map((post) => (
            <div key={post.id} className="rounded-2xl bg-gradient-to-b from-[#070e1e] to-[#040812] border border-slate-800 hover:border-indigo-500/40 shadow-xl overflow-hidden flex flex-col justify-between transition-all duration-300">
              
              <div className="p-5 border-b border-slate-800/80 bg-slate-950/60 flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    {post.titulo || 'Borrador sin título'}
                  </h3>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] font-mono text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock size={12} className="text-indigo-400" /> 
                      {new Date(post.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {post.tipo_media && (
                      <span className="bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded text-[10px] uppercase font-bold">
                        {post.tipo_media}
                      </span>
                    )}
                  </div>
                </div>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase">
                  {post.estado || 'PENDIENTE'}
                </span>
              </div>
              
              <div className="p-5 flex-1 space-y-4">
                {post.url_media && (
                  <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center relative group">
                    {post.tipo_media === 'video' ? (
                      <video src={post.url_media} controls className="w-full max-w-[280px] aspect-[9/16] object-contain mx-auto bg-black rounded-lg" />
                    ) : (
                      <img src={post.url_media} alt="Preview" className="w-full max-w-[280px] aspect-[9/16] object-contain mx-auto bg-black rounded-lg transition-transform duration-300 group-hover:scale-105" onError={(e) => e.target.style.display='none'} />
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <a href={post.url_media} target="_blank" rel="noreferrer" className="text-white text-xs font-mono font-bold bg-indigo-600/90 border border-indigo-400 px-3.5 py-1.5 rounded-xl pointer-events-auto hover:bg-indigo-500 transition-all flex items-center gap-1.5 shadow-lg">
                        <Eye size={12} /> Ver original
                      </a>
                    </div>
                  </div>
                )}

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider font-bold text-slate-300 mb-2">
                    <Edit3 size={14} className="text-indigo-400" /> Contenido del Post:
                  </label>
                  <textarea 
                    value={post.contenido_post}
                    onChange={(e) => handleContentChange(post.id, e.target.value)}
                    className="w-full h-36 p-3.5 bg-slate-950 border border-slate-700 rounded-xl focus:border-indigo-400 focus:shadow-[0_0_12px_rgba(99,102,241,0.2)] text-slate-200 text-xs font-sans resize-none outline-none transition-all no-scrollbar"
                    placeholder="Escribe aquí el contenido..."
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider font-bold text-slate-300 mb-2">
                    <ImageIcon size={14} className="text-indigo-400" /> URL de Multimedia (Foto o Video):
                  </label>
                  <input 
                    type="text"
                    value={post.url_media || ''}
                    onChange={(e) => handleUrlMediaChange(post.id, e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl focus:border-indigo-400 text-slate-200 text-xs font-mono outline-none transition-all"
                    placeholder="https://ejemplo.com/media.jpg"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-950/60 border-t border-slate-800/80 flex justify-between items-center">
                <button 
                  onClick={() => handleDelete(post.id)}
                  className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 p-2 rounded-xl border border-transparent hover:border-rose-500/30 transition-all flex items-center gap-1.5 text-xs font-semibold"
                >
                  <Trash2 size={15} />
                  <span>Descartar</span>
                </button>

                <button 
                  onClick={() => handleApprove(post)}
                  disabled={approvingId === post.id}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all ${
                    approvingId === post.id 
                      ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:scale-105'
                  }`}
                >
                  {approvingId === post.id ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Publicando...
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      Aprobar y Publicar
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

