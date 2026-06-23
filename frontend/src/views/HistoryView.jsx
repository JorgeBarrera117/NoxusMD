import React, { useState, useEffect } from 'react';
import { FileText, Download, Trash2, Clock, Search } from 'lucide-react';

const HistoryView = ({ onViewInEditor }) => {
  const [history, setHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const savedHistory = localStorage.getItem('noxus_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('noxus_history');
  };

  const downloadMarkdown = (content, filename) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredHistory = history.filter(item => 
    item.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="view-container history-view">
      <header className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, paddingRight: '2rem' }}>
          <h2>Historial de Conversiones</h2>
          <p style={{ marginBottom: '1.5rem' }}>Tus últimos documentos convertidos localmente</p>
          
          {history.length > 0 && (
            <div className="search-container" style={{ position: 'relative', maxWidth: '400px' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="output-box" 
                placeholder="Buscar por nombre..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.75rem', width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          )}
        </div>
        
        {history.length > 0 && (
          <button 
            className="secondary-btn danger-text" 
            onClick={clearHistory}
            style={{ flex: 'none', padding: '0.5rem 1rem', marginTop: '0.5rem' }}
          >
            <Trash2 size={16} /> Borrar todo
          </button>
        )}
      </header>

      <div className="history-list">
        {history.length === 0 ? (
          <div className="card placeholder-card">
            <div className="placeholder-content">
              <Clock className="placeholder-icon" size={64} />
              <h3>Aún no hay historial</h3>
              <p>Los archivos que conviertas aparecerán aquí para que no los pierdas.</p>
            </div>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="card placeholder-card">
            <div className="placeholder-content">
              <Search className="placeholder-icon" size={64} />
              <h3>No se encontraron resultados</h3>
              <p>No hay ningún archivo que coincida con "{searchQuery}".</p>
            </div>
          </div>
        ) : (
          filteredHistory.map((item, index) => (
            <div key={index} className="card history-card" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="history-info" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <FileText size={32} className="accent-text" />
                <div>
                  <h4 style={{ margin: 0 }}>{item.filename}</h4>
                  <span className="drop-hint" style={{ fontSize: '0.8rem' }}>{new Date(item.date).toLocaleString()}</span>
                </div>
              </div>
              <div className="action-buttons">
                <button 
                  className="secondary-btn" 
                  onClick={() => onViewInEditor(item.content)}
                >
                  Ver en Editor
                </button>
                <button 
                  className="secondary-btn"
                  onClick={() => downloadMarkdown(item.content, item.filename)}
                >
                  <Download size={16} /> Descargar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HistoryView;
