import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import html2pdf from 'html2pdf.js';
import { saveAs } from 'file-saver';
import { asBlob } from 'html-docx-js-typescript';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { 
  FileDown, FileText, Bold, Italic, Strikethrough, 
  Link as LinkIcon, Image as ImageIcon, Code,
  Heading1, List, ListOrdered, Quote,
  CheckSquare, Table, Minus, Terminal, Workflow, Save, FolderOpen
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
  const [markdown, setMarkdown] = useState(() => {
    return sessionStorage.getItem('noxus_editor_content') || initialMarkdown || '# Welcome to NoxusMD Editor\n\n## High-Performance Document Engineering\n\nThis is a **sophisticated** technical environment designed for developers.\n\n- **Automated Formatting:** Just type and we handle the rest.\n- **Real-time Synchronization:** What you see is what you get.\n';
  });
  const [initialRender, setInitialRender] = useState(true);
  
  // Mobile UI state
  const [mobileView, setMobileView] = useState('editor'); // 'editor' | 'preview'

  const previewRef = useRef(null);
  const fileInputRef = useRef(null);
  const mdInputRef = useRef(null);

  const handleSaveMarkdown = async () => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const fileName = `Documento_NoxusMD_${Date.now()}.md`;
    
    if (Capacitor.isNativePlatform()) {
      try {
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: markdown,
          directory: Directory.Cache,
          encoding: Encoding.UTF8
        });
        await Share.share({
          title: 'Exportar Markdown',
          url: savedFile.uri,
          dialogTitle: 'Guardar o Compartir MD'
        });
      } catch (err) {
        console.error('Error sharing file', err);
        alert('Error al exportar el archivo Markdown: ' + err.message);
      }
    } else {
      try {
        const file = new File([blob], fileName, { type: 'text/markdown' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: fileName,
            });
            return;
          } catch (err) {
            console.error("Web share failed", err);
            if (err.name !== 'AbortError') {
              // Fallback silente a descarga tradicional
              saveAs(blob, fileName);
            }
          }
        } else {
          // Fallback silente si Web Share no está soportado
          saveAs(blob, fileName);
        }
      } catch (err) {
         alert("Error general: " + err.message);
      }
    }
  };

  const handleLoadMarkdown = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setMarkdown(event.target.result);
    };
    reader.readAsText(file);
    e.target.value = '';
  };
  
  const triggerMarkdownLoad = () => {
    if (mdInputRef.current) {
      mdInputRef.current.click();
    }
  };

  useEffect(() => {
    if (initialMarkdown) setMarkdown(initialMarkdown);
  }, [initialMarkdown]);

  useEffect(() => {
    sessionStorage.setItem('noxus_editor_content', markdown);
  }, [markdown]);

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
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Documento</title></head><body>${contentHtml}</body></html>`;
    
    try {
      const blob = await asBlob(fullHtml);
      
      const fileName = `Documento_NoxusMD_${Date.now()}.docx`;
      if (Capacitor.isNativePlatform()) {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64data = reader.result.split(',')[1];
          try {
            const savedFile = await Filesystem.writeFile({
              path: fileName,
              data: base64data,
              directory: Directory.Cache
            });
            
            await Share.share({
              title: 'Exportar Documento Word',
              url: savedFile.uri,
              dialogTitle: 'Guardar o Compartir DOCX'
            });
          } catch (err) {
            console.error('Error saving or sharing file on mobile', err);
            alert('Error al exportar el archivo Word en móvil: ' + err.message);
          }
        };
      } else {
        const file = new File([blob], fileName, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: fileName,
            });
            return;
          } catch (err) {
            console.error("Web share failed", err);
            if (err.name !== 'AbortError') saveAs(blob, fileName);
          }
        } else {
          saveAs(blob, fileName);
        }
      }
    } catch (err) {
      console.error('Error sharing file', err);
      alert('Error al exportar el archivo Word.');
    }
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

    const objectUrl = URL.createObjectURL(file);
    insertTextAtCursor(`\n<img src="${objectUrl}" width="400" />\n`);
    e.target.value = ''; // Resetear input
  };

  const lineCount = markdown.split('\n').length;

  return (
    <div className="view-container">
      {/* Mobile Tabs Control (Only visible on small screens due to media query display rule if needed, or always rendered but CSS hides it on desktop... actually let's just render it and use CSS to show only on mobile or flex column logic) */}
      <div className="mobile-tabs-container print-hide">
        <div className="mobile-tabs">
          <button 
            className={`mobile-tab-btn ${mobileView === 'editor' ? 'active' : ''}`}
            onClick={() => setMobileView('editor')}
          >
            Editar
          </button>
          <button 
            className={`mobile-tab-btn ${mobileView === 'preview' ? 'active' : ''}`}
            onClick={() => setMobileView('preview')}
          >
            Vista Previa
          </button>
        </div>
      </div>

      <div className={`editor-layout split-layout mobile-mode-${mobileView}`} style={{ height: '100%' }}>
        
        {/* Panel Izquierdo: Editor con Toolbar */}
        <div className="editor-pane print-hide">
          {/* Toolbar del Editor */}
          <div className="editor-toolbar">
            <div className="toolbar-group" style={{ marginRight: '0.5rem' }}>
              <button className="toolbar-btn primary-action-btn" onClick={triggerMarkdownLoad} title="Cargar archivo .md"><FolderOpen size={16} /></button>
              <button className="toolbar-btn primary-action-btn" onClick={handleSaveMarkdown} title="Guardar como .md"><Save size={16} /></button>
            </div>
            <div className="toolbar-divider"></div>
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
              accept=".md,.txt" 
              ref={mdInputRef} 
              style={{ display: 'none' }} 
              onChange={handleLoadMarkdown} 
            />
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
              <button 
                onClick={exportToWord} 
                className="export-btn premium-word-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                  color: 'white',
                  border: 'none',
                  boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  letterSpacing: '0.5px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(37, 99, 235, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(37, 99, 235, 0.3)';
                }}
              >
                <FileText size={18} /> Exportar a word
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
