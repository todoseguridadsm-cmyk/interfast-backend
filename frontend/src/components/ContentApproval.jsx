import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CheckCircle, Clock, Trash2, Edit3, Loader2, Send, Image as ImageIcon } from 'lucide-react';

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

  const handleUrlFotoChange = (id, newUrl) => {
    setContents(contents.map(c => c.id === id ? { ...c, url_foto: newUrl } : c));
  };

  const handleApprove = async (content) => {
    try {
      setApprovingId(content.id);
      await axios.put(`${API_URL}/content_library/${content.id}/aprobar`, {
        contenido_post: content.contenido_post,
        url_foto: content.url_foto || ''
      });
      // Remove from list since it's no longer a draft
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
    <div className="p-6 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <span className="text-indigo-600">Aprobación</span> de Contenido
          </h1>
          <p className="text-slate-500 mt-1">Revisa y aprueba los posts generados para publicar en redes</p>
        </div>
        <button onClick={fetchContents} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors">
          Actualizar
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin text-indigo-500" size={48} />
        </div>
      ) : contents.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <div className="mx-auto bg-indigo-50 text-indigo-400 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <CheckCircle size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">¡Todo al día!</h3>
          <p className="text-slate-500">No hay borradores pendientes de aprobación en este momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {contents.map((post) => (
            <div key={post.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    {post.titulo || 'Borrador sin título'}
                  </h3>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock size={14} /> 
                      {new Date(post.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {post.tipo_media && (
                      <span className="bg-slate-200 px-2 py-0.5 rounded text-slate-700">
                        {post.tipo_media}
                      </span>
                    )}
                  </div>
                </div>
                <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold uppercase">
                  {post.estado}
                </span>
              </div>
              
              <div className="p-4 flex-1">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                  <Edit3 size={16} className="text-indigo-500" /> Contenido del Post:
                </label>
                <textarea 
                  value={post.contenido_post}
                  onChange={(e) => handleContentChange(post.id, e.target.value)}
                  className="w-full h-40 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-700 text-sm resize-none custom-scrollbar"
                  placeholder="Escribe aquí el contenido..."
                />
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2 mt-4">
                  <ImageIcon size={16} className="text-indigo-500" /> URL de la Foto / Flyer:
                </label>
                <input 
                  type="text"
                  value={post.url_foto || ''}
                  onChange={(e) => handleUrlFotoChange(post.id, e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-700 text-sm"
                  placeholder="https://ejemplo.com/mifoto.jpg"
                />
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                <button 
                  onClick={() => handleDelete(post.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <Trash2 size={18} />
                  <span className="hidden sm:inline">Descartar</span>
                </button>

                <button 
                  onClick={() => handleApprove(post)}
                  disabled={approvingId === post.id}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all ${
                    approvingId === post.id 
                      ? 'bg-indigo-400 text-white cursor-not-allowed' 
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-md'
                  }`}
                >
                  {approvingId === post.id ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Publicando...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
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
