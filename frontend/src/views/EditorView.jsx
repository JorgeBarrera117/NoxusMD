import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import html2pdf from 'html2pdf.js';
import { saveAs } from 'file-saver';
import { 
  FileDown, FileText, Bold, Italic, Strikethrough, 
  Link as LinkIcon, Image as ImageIcon, Code,
  Heading1, List, ListOrdered, Quote,
  CheckSquare, Table, Minus, Terminal, Workflow
} from 'lucide-react';
import EditorModule from 'react-simple-code-editor';
const Editor = EditorModule.default || EditorModule;
import Prism from 'prismjs';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-markdown';
import 'prismjs/themes/prism-tomorrow.css'; // Tema oscuro base
import mermaid from 'mermaid';

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const ResizableImage = ({ node, ...props }) => {
  const initialWidth = props.width || props.style?.width || 400;
  const [width, setWidth] = useState(parseInt(initialWidth));
  const [isResizing, setIsResizing] = useState(false);
  
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const widthRef = useRef(width);

  useEffect(() => { widthRef.current = width; }, [width]);

  const handleMouseMove = (e) => {
    const dx = e.clientX - startXRef.current;
    const newW = Math.max(100, startWidthRef.current + dx);
    setWidth(newW);
  };

  const handleMouseUp = (e) => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    
    window.dispatchEvent(new CustomEvent('update-image-width', { 
      detail: { src: props.src, newWidth: widthRef.current } 
    }));
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = widthRef.current;
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="resizable-image-wrapper" style={{ display: 'inline-block', position: 'relative', margin: '10px 0' }}>
      <img {...props} width={width} style={{ display: 'block', maxWidth: '100%', outline: isResizing ? '2px dashed #4ade80' : 'none' }} />
      <div 
        className="print-hide"
        onMouseDown={handleMouseDown}
        style={{
          position: 'absolute', right: '-6px', bottom: '-6px',
          width: '14px', height: '14px', backgroundColor: '#4ade80',
          cursor: 'nwse-resize', borderRadius: '50%',
          boxShadow: '0 0 5px rgba(0,0,0,0.5)', zIndex: 10,
          opacity: isResizing ? 1 : 0.6,
          border: '2px solid white'
        }}
        title="Arrastra para redimensionar"
      />
    </div>
  );
};

// Inicialización global de Mermaid (una sola vez)
mermaid.initialize({ 
  startOnLoad: false, 
  theme: 'dark', 
  securityLevel: 'loose', 
  suppressErrorRendering: true,
  flowchart: { htmlLabels: false }
});

const MermaidComponent = ({ code }) => {
  const [svg, setSvg] = useState('');

  useEffect(() => {
    let isMounted = true;
    // Usar un ID único por cada intento de renderizado para evitar colisiones internas
    const currentId = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
    
    const renderDiagram = async () => {
      try {
        const { svg: renderedSvg } = await mermaid.render(currentId, code);
        if (isMounted) {
          setSvg(renderedSvg);
        }
      } catch (e) {
        if (isMounted) {
          setSvg(`<div style="color:#ef4444; padding:1rem; border:1px solid #ef4444; border-radius:4px; background:rgba(239,68,68,0.1);">Mermaid Error: Error de sintaxis al escribir el diagrama. Revisa el código.</div>`);
        }
      }
    };
    
    renderDiagram();
    
    return () => { isMounted = false; };
  }, [code]);

  return <div className="mermaid-chart" data-code={encodeURIComponent(code)} dangerouslySetInnerHTML={{ __html: svg }} />;
};

const EditorView = ({ initialMarkdown }) => {
  const [markdown, setMarkdown] = useState(initialMarkdown || '# Welcome to NoxusMD Editor\n\n## High-Performance Document Engineering\n\nThis is a **sophisticated** technical environment designed for developers.\n\n- **Automated Formatting:** Just type and we handle the rest.\n- **Real-time Synchronization:** What you see is what you get.\n');
  const previewRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (initialMarkdown) setMarkdown(initialMarkdown);
  }, [initialMarkdown]);

  useEffect(() => {
    const handleUpdateWidth = (e) => {
      const { src, newWidth } = e.detail;
      setMarkdown((prev) => {
        const regex = new RegExp(`(<img[^>]*src=["']${escapeRegExp(src)}["'][^>]*width=["'])\\d+(["'][^>]*>)`, 'g');
        return prev.replace(regex, `$1${newWidth}$2`);
      });
    };
    window.addEventListener('update-image-width', handleUpdateWidth);
    return () => window.removeEventListener('update-image-width', handleUpdateWidth);
  }, []);

  const exportToPDF = () => { window.print(); };

  const exportToWord = async () => {
    const element = previewRef.current;
    if (!element) return;
    
    // Clonar el DOM para manipularlo sin afectar la vista
    const clone = element.cloneNode(true);
    
    // Fijar el height explícito para que Word mantenga la proporción correcta en las imágenes
    const originalImages = element.querySelectorAll('img');
    const clonedImages = clone.querySelectorAll('img');
    for (let i = 0; i < clonedImages.length; i++) {
      if (originalImages[i].clientHeight) {
        clonedImages[i].setAttribute('height', originalImages[i].clientHeight);
      }
    }

    // Convertir gráficos vectoriales SVG (Mermaid) a imágenes Base64 puras para Word
    const originalMermaidCharts = element.querySelectorAll('.mermaid-chart');
    const mermaidCharts = clone.querySelectorAll('.mermaid-chart');
    
    for (let i = 0; i < mermaidCharts.length; i++) {
      const chart = mermaidCharts[i];
      const originalChart = originalMermaidCharts[i];
      const encodedCode = chart.getAttribute('data-code');
      if (!encodedCode) continue;
      
      const originalCode = decodeURIComponent(encodedCode);
      const state = { code: originalCode, mermaid: { theme: 'default' } };
      const base64Str = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
      const inkUrl = `https://mermaid.ink/img/${base64Str}`;
      
      try {
        // Obtenemos la imagen desde el servidor remotamente en nuestra app
        const response = await fetch(inkUrl);
        if (!response.ok) throw new Error("Network response was not ok");
        const blob = await response.blob();
        
        // Convertimos el blob a Base64
        const base64data = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
        
        if (base64data) {
          const newImg = document.createElement('img');
          newImg.src = base64data;
          
          // Fix de proporciones y tamaño de Word
          const svgElement = originalChart.querySelector('svg');
          if (svgElement) {
            const rect = svgElement.getBoundingClientRect();
            const maxWidth = 600; 
            const width = Math.min(rect.width || 400, maxWidth);
            newImg.setAttribute('width', width);
            
            if (rect.width > 0 && rect.height > 0) {
              const ratio = rect.height / rect.width;
              newImg.setAttribute('height', width * ratio);
            }
          } else {
            newImg.setAttribute('width', '500');
          }
          
          chart.parentNode.replaceChild(newImg, chart);
        }
      } catch (error) {
        console.error("Error fetching mermaid.ink image:", error);
      }
    }
    
    // Remover elementos interactivos (como el manejador verde)
    const hideElements = clone.querySelectorAll('.print-hide');
    hideElements.forEach(el => el.remove());

    const contentHtml = clone.innerHTML;
    const fullHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Documento</title></head><body>${contentHtml}</body></html>`;
    const blob = new Blob(['\ufeff', fullHtml], { type: 'application/msword' });
    saveAs(blob, 'Documento_NoxusMD.doc');
  };

  // Funciones de la barra de herramientas
  const insertTextAtCursor = (before, after = '') => {
    const textarea = document.querySelector('.code-editor-textarea');
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = markdown.substring(start, end);
    const newText = markdown.substring(0, start) + before + selectedText + after + markdown.substring(end);
    
    setMarkdown(newText);
    
    // Restaurar foco (pequeño delay para permitir que react actualice el estado)
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  const handleHeading = () => insertTextAtCursor('\n# ', '');
  const handleBold = () => insertTextAtCursor('**', '**');
  const handleItalic = () => insertTextAtCursor('*', '*');
  const handleStrike = () => insertTextAtCursor('~~', '~~');
  const handleLink = () => insertTextAtCursor('[', '](https://)');
  const handleCode = () => insertTextAtCursor('`', '`');
  
  const handleTaskList = () => insertTextAtCursor('\n- [ ] ', '');
  const handleTable = () => insertTextAtCursor('\n| Columna 1 | Columna 2 |\n| --------- | --------- |\n| Dato      | Dato      |\n', '');
  const handleHorizontalRule = () => insertTextAtCursor('\n---\n', '');
  const handleCodeBlock = () => insertTextAtCursor('\n```javascript\n', '\n```\n');
  const handleMermaid = () => insertTextAtCursor('\n```mermaid\ngraph TD\n  A[Inicio] --> B{Decisión}\n  B -->|Sí| C[Opción 1]\n  B -->|No| D[Opción 2]\n```\n', '');
  
  const handleList = () => insertTextAtCursor('\n- ', '');
  const handleListOrdered = () => insertTextAtCursor('\n1. ', '');
  const handleQuote = () => insertTextAtCursor('\n> ', '');

  // Procesamiento de Imágenes a Base64
  const triggerImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('http://localhost:8000/upload-image', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.url) {
        insertTextAtCursor(`\n<img src="${data.url}" width="400" />\n`);
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      alert('Error uploading image to local backend.');
    }
    e.target.value = ''; // Resetear input
  };

  const lineCount = markdown.split('\n').length;

  return (
    <div className="view-container">
      <div className="editor-layout" style={{ height: 'calc(100vh - 40px)' }}>
        
        {/* Panel Izquierdo: Editor con Toolbar */}
        <div className="editor-pane print-hide">
          {/* Toolbar del Editor */}
          <div className="editor-toolbar">
            <div className="toolbar-group">
              <button className="toolbar-btn" onClick={handleHeading} title="Heading"><Heading1 size={16} /></button>
            </div>
            <div className="toolbar-divider"></div>
            <div className="toolbar-group">
              <button className="toolbar-btn" onClick={handleBold} title="Bold"><Bold size={16} /></button>
              <button className="toolbar-btn" onClick={handleItalic} title="Italic"><Italic size={16} /></button>
              <button className="toolbar-btn" onClick={handleStrike} title="Strikethrough"><Strikethrough size={16} /></button>
            </div>
            <div className="toolbar-divider"></div>
            <div className="toolbar-group">
              <button className="toolbar-btn" onClick={handleTaskList} title="Task List"><CheckSquare size={16} /></button>
              <button className="toolbar-btn" onClick={handleTable} title="Insert Table"><Table size={16} /></button>
              <button className="toolbar-btn" onClick={handleHorizontalRule} title="Divider"><Minus size={16} /></button>
            </div>
            <div className="toolbar-divider"></div>
            <div className="toolbar-group">
              <button className="toolbar-btn" onClick={handleList} title="Bullet List"><List size={16} /></button>
              <button className="toolbar-btn" onClick={handleListOrdered} title="Numbered List"><ListOrdered size={16} /></button>
              <button className="toolbar-btn" onClick={handleQuote} title="Blockquote"><Quote size={16} /></button>
            </div>
            <div className="toolbar-divider"></div>
            <div className="toolbar-group">
              <button className="toolbar-btn" onClick={handleLink} title="Insert Link"><LinkIcon size={16} /></button>
              <button className="toolbar-btn" onClick={triggerImageUpload} title="Insert Image"><ImageIcon size={16} /></button>
              <button className="toolbar-btn" onClick={handleCode} title="Insert Code"><Code size={16} /></button>
              <button className="toolbar-btn" onClick={handleMermaid} title="Insert Diagram"><Workflow size={16} /></button>
            </div>
            
            <div className="toolbar-spacer"></div>
            
            <div className="toolbar-badge">MARKDOWN</div>
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleImageUpload} 
            />
          </div>

          {/* Área de Edición con Números de Línea fakes */}
          <div className="editor-scroll-area">
            <div className="editor-wrapper">
              <div className="line-numbers">
                {Array.from({ length: Math.max(10, lineCount) }).map((_, i) => (
                  <div key={i} className="line-number">{i + 1}</div>
                ))}
              </div>
              <Editor
                value={markdown}
                onValueChange={code => setMarkdown(code)}
                highlight={code => {
                  try {
                    return Prism.highlight(code, Prism.languages.markdown || Prism.languages.markup || {}, 'markdown');
                  } catch (e) {
                    return code;
                  }
                }}
                padding={15}
                className="code-editor"
                textareaClassName="code-editor-textarea"
                style={{
                  fontFamily: '"Fira Code", "JetBrains Mono", monospace',
                  fontSize: 14,
                  minHeight: '100%',
                }}
              />
            </div>
          </div>
        </div>
        
        {/* Panel Derecho: Vista Previa */}
        <div className="preview-pane">
          <div className="export-toolbar print-hide">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="autosaved-badge"><div className="pulse-dot"></div> Autosaved</span>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={exportToWord} className="export-btn word-btn">
                <FileText size={16} /> Word
              </button>
              <button onClick={exportToPDF} className="export-btn pdf-btn">
                <FileDown size={16} /> PDF
              </button>
            </div>
          </div>
          
          <div ref={previewRef} className="markdown-preview-content">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]} 
              rehypePlugins={[rehypeRaw]}
              urlTransform={(value) => value} // Permite URLs base64 (data:)
              components={{
                img: ResizableImage,
                code({node, inline, className, children, ...props}) {
                  const match = /language-(\w+)/.exec(className || '')
                  if (!inline && match && match[1] === 'mermaid') {
                    return <MermaidComponent code={String(children).replace(/\n$/, '')} />
                  }
                  return !inline ? (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  )
                }
              }}
            >
              {markdown}
            </ReactMarkdown>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default EditorView;
