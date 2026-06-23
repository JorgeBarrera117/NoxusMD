import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

const EditorView = ({ initialMarkdown }) => {
  const [markdown, setMarkdown] = useState(initialMarkdown || '# ¡Bienvenido al Editor Markdown!\n\nEscribe aquí tu código Markdown y mira el resultado a la derecha.\n\n* Soporta listas\n* **Negritas** y *cursivas*');

  // Si cambia el initialMarkdown (por ejemplo si acabamos de convertir un PDF), actualizamos el editor
  useEffect(() => {
    if (initialMarkdown) {
      setMarkdown(initialMarkdown);
    }
  }, [initialMarkdown]);

  return (
    <div className="view-container">
      <header className="view-header">
        <h2>Editor Markdown</h2>
        <p>Edita tu código y previsualiza cómo se verá renderizado</p>
      </header>

      <div className="split-layout editor-layout" style={{ height: 'calc(100vh - 150px)' }}>
        <div className="card editor-pane">
          <h3 className="card-title">CÓDIGO FUENTE</h3>
          <textarea
            className="output-box"
            style={{ height: '100%', border: 'none', resize: 'none' }}
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            placeholder="Escribe tu Markdown aquí..."
          />
        </div>
        
        <div className="card preview-pane" style={{ overflowY: 'auto' }}>
          <h3 className="card-title">VISTA PREVIA RENDERIZADA</h3>
          <div className="markdown-preview-content">
            <ReactMarkdown>{markdown}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorView;
