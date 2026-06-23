import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import html2pdf from 'html2pdf.js';
import { saveAs } from 'file-saver';
import { FileDown, FileText } from 'lucide-react';

const EditorView = ({ initialMarkdown }) => {
  const [markdown, setMarkdown] = useState(initialMarkdown || '# ¡Bienvenido al Editor Markdown!\n\nEscribe aquí tu código Markdown y mira el resultado a la derecha.\n\n* Soporta listas\n* **Negritas** y *cursivas*');
  const previewRef = useRef(null);

  const exportToPDF = () => {
    // La opción 1: Usar el motor de impresión nativo del navegador para crear PDFs vectoriales seleccionables
    window.print();
  };

  const exportToWord = () => {
    const element = previewRef.current;
    if (!element) return;
    
    const contentHtml = element.innerHTML;
    const fullHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Documento</title></head><body>${contentHtml}</body></html>`;
    
    const blob = new Blob(['\ufeff', fullHtml], { type: 'application/msword' });
    saveAs(blob, 'Documento_NoxusMD.doc');
  };

  // Si cambia el initialMarkdown (por ejemplo si acabamos de convertir un PDF), actualizamos el editor
  useEffect(() => {
    if (initialMarkdown) {
      setMarkdown(initialMarkdown);
    }
  }, [initialMarkdown]);

  return (
    <div className="view-container">
      <header className="view-header print-hide">
        <h2>Editor Markdown</h2>
        <p>Edita tu código y previsualiza cómo se verá renderizado</p>
      </header>

      <div className="split-layout editor-layout" style={{ height: 'calc(100vh - 150px)' }}>
        <div className="card editor-pane print-hide" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <h3 className="card-title" style={{ flexShrink: 0 }}>CÓDIGO FUENTE</h3>
          <textarea
            className="output-box"
            style={{ flexGrow: 1, border: 'none', resize: 'none', minHeight: '300px' }}
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            placeholder="Escribe tu Markdown aquí..."
          />
        </div>
        
        <div className="card preview-pane" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <div className="export-toolbar print-hide" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, marginBottom: '1rem' }}>
            <h3 className="card-title" style={{ margin: 0 }}>VISTA PREVIA RENDERIZADA</h3>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={exportToWord} className="export-btn word-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                <FileText size={16} /> Word
              </button>
              <button onClick={exportToPDF} className="export-btn pdf-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                <FileDown size={16} /> PDF
              </button>
            </div>
          </div>
          <div ref={previewRef} className="markdown-preview-content" style={{ overflowY: 'auto', flexGrow: 1, paddingRight: '0.5rem', margin: '0 -0.5rem 0 0' }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorView;
