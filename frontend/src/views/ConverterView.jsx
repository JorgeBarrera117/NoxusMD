import React, { useState, useRef } from 'react';
import { FileText, UploadCloud, Zap, Sparkles, CheckCircle2, Copy, Download, X, AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const ConverterView = ({ apiKey, apiServers, onConvertSuccess }) => {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [magicFormat, setMagicFormat] = useState(false);
  
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setResult(null);
      setError(null);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setError(null);
    }
  };

  const handleConvert = async () => {
    if (!file) {
      setError('Por favor selecciona un archivo primero.');
      return;
    }

    setIsConverting(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('archivo', file);
    formData.append('magicFormat', magicFormat ? 'true' : 'false');
    formData.append('apiKey', apiKey.trim());

    // Usa los servidores pasados por props, si están vacíos o no pasados, usa un array por defecto fallback
    const serversToTry = apiServers && apiServers.length > 0 
      ? apiServers 
      : ['https://noxusmd-production.up.railway.app/upload'];

    const extractTextOffline = async (fileObj) => {
      try {
        const arrayBuffer = await fileObj.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          // Agrupar items por línea (coordenada Y)
          const lines = [];
          for (const item of textContent.items) {
            const y = Math.round(item.transform[5]); // Redondear para agrupar items en la misma línea
            const x = item.transform[4];
            
            // Buscar si ya existe una línea cercana (tolerancia de 4 puntos)
            let line = lines.find(l => Math.abs(l.y - y) < 4);
            if (!line) {
              line = { y: y, items: [] };
              lines.push(line);
            }
            line.items.push({ x: x, str: item.str, width: item.width });
          }
          
          // Ordenar líneas de arriba a abajo (en PDF.js, mayor Y es más arriba)
          lines.sort((a, b) => b.y - a.y);
          
          let pageText = '';
          let isPreviousLineTable = false;

          for (const line of lines) {
            // Ordenar items de la línea de izquierda a derecha
            line.items.sort((a, b) => a.x - b.x);
            
            let columns = [];
            let currentColumn = '';
            let lastX = null;
            let lastWidth = 0;
            
            for (let j = 0; j < line.items.length; j++) {
              const item = line.items[j];
              
              if (lastX !== null) {
                const gap = item.x - (lastX + lastWidth);
                // Si el espacio es mayor a 6, lo forzamos como nueva columna
                if (gap > 6) {
                  columns.push(currentColumn.trim());
                  currentColumn = '';
                } else if (gap > 1) {
                  currentColumn += ' ';
                }
              }
              currentColumn += item.str;
              lastX = item.x;
              lastWidth = item.width || (item.str.length * 4); // fallback aproximado
            }
            if (currentColumn.trim()) {
               columns.push(currentColumn.trim());
            }
            
            // Heurística agresiva de tabla: 
            // Si hay 3 o más columnas, o si la línea anterior era tabla y esta tiene 2 o más
            if (columns.length > 2 || (isPreviousLineTable && columns.length >= 2)) {
               const formattedRow = '| ' + columns.join(' | ') + ' |';
               
               if (!isPreviousLineTable) {
                  const separator = '|' + columns.map(() => '---|').join('');
                  pageText += '\n' + formattedRow + '\n' + separator + '\n';
                  isPreviousLineTable = true;
               } else {
                  pageText += formattedRow + '\n';
               }
            } else {
               isPreviousLineTable = false;
               pageText += columns.join(' ') + '\n\n';
            }
          }

          text += `## Página ${i}\n\n${pageText}\n\n`;
        }
        return { 
          success: true, 
          markdown: `> **Nota:** Este documento fue extraído usando el Modo Offline Avanzado (Simulación de Tablas).\n\n${text}`, 
          originalName: fileObj.name,
          isOfflineFallback: true
        };
      } catch (err) {
        throw new Error(`Error en motor local: ${err.message}`);
      }
    };

    if (!navigator.onLine) {
      // Offline detectado antes de intentar
      try {
        const data = await extractTextOffline(file);
        setResult(data);
        if (onConvertSuccess) onConvertSuccess(data);
        setIsConverting(false);
        return;
      } catch (err) {
        setError(`Sin internet y falló la conversión local: ${err.message}`);
        setIsConverting(false);
        return;
      }
    }

    let lastError = null;
    let success = false;

    for (let i = 0; i < serversToTry.length; i++) {
      const currentServer = serversToTry[i];
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

        const res = await fetch(currentServer, {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        // Si el servidor falla con un 50x (ej. Bad Gateway), tiramos error para saltar al siguiente
        if (!res.ok && res.status >= 500) {
          throw new Error(`Server ${currentServer} returned ${res.status}`);
        }

        const data = await res.json();

        if (data.success) {
          setResult(data);
          // Pass the result up so Editor and History can use it
          if (onConvertSuccess) onConvertSuccess(data);
          success = true;
          break; // Salimos del loop si fue exitoso
        } else {
          // Si el servidor responde correctamente pero dice que hubo error (ej. llave inválida)
          throw new Error(data.error || 'Ocurrió un error desconocido.');
        }
      } catch (err) {
        console.warn(`Falló el servidor ${currentServer}:`, err.message);
        lastError = err.name === 'AbortError' ? 'El servidor tardó demasiado en responder (Timeout).' : err.message;
        // Continuará con el siguiente servidor en el loop
      }
    }

    if (!success) {
      console.warn(`Error al convertir con servidores remotos. Intentando motor local offline... Último error: ${lastError}`);
      try {
        const data = await extractTextOffline(file);
        setResult(data);
        if (onConvertSuccess) onConvertSuccess(data);
        success = true;
      } catch (err) {
        setError(`Conversión fallida (Online y Local). Error local: ${err.message}`);
      }
    }

    setIsConverting(false);
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

  return (
    <div className="view-container">
      <div className="split-layout">
        <div className="left-panel">
          <header className="view-header">
            <h2>Conversor PDF</h2>
            <p>Sube tu documento y extráelo como Markdown limpio</p>
          </header>

          <div className="card upload-card">
            <h2 className="card-title">ARCHIVO A CONVERTIR</h2>
            <div 
              className={`drop-zone ${isDragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !file && fileInputRef.current.click()}
            >
              {file ? (
                <div className="file-info">
                  <FileText className="file-icon" size={24} />
                  <span className="file-name">{file.name}</span>
                  <button 
                    className="remove-btn"
                    onClick={(e) => { e.stopPropagation(); setFile(null) }}
                    title="Quitar archivo"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div className="upload-prompt">
                  <UploadCloud className="upload-icon" size={48} />
                  <p>Haz clic para buscar un PDF o arrástralo aquí</p>
                  <p className="drop-hint">El archivo se procesará de forma segura.</p>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                accept=".pdf"
                style={{ display: 'none' }} 
              />
            </div>
          </div>

          <div className="card options-card">
            <h2 className="card-title">OPCIONES AVANZADAS</h2>
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                checked={magicFormat}
                onChange={(e) => setMagicFormat(e.target.checked)}
              />
              <span className="checkbox-custom"></span>
              <span className="label-text">
                <Sparkles className="inline-icon" size={16} /> 
                Aplicar Formato Mágico (Requiere API Key)
              </span>
            </label>
            {magicFormat && !apiKey && (
              <p className="warning-text" style={{marginTop: '10px', fontSize: '0.85rem', color: '#f43f5e'}}>
                Ve a Configuración para añadir tu API Key, o se usará el formato básico.
              </p>
            )}
          </div>

          <button 
            className={`convert-btn ${!file || isConverting ? 'disabled' : ''}`}
            onClick={handleConvert}
            disabled={!file || isConverting}
          >
            {isConverting ? (
              <><RefreshCw className="spin-icon" size={20} /> Convirtiendo...</>
            ) : (
              <><Zap className="action-icon" size={20} /> Convertir a Markdown</>
            )}
          </button>

          {error && (
            <div className="error-message">
              <AlertCircle size={20} className="error-icon" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="right-panel">
          {result ? (
            <div className="card result-card" style={{height: '100%'}}>
              <div className="success-header">
                {result.isOfflineFallback ? (
                  <WifiOff className="success-icon" style={{color: '#f59e0b'}} size={24} /> 
                ) : (
                  <CheckCircle2 className="success-icon" size={24} /> 
                )}
                <span>
                  {result.isOfflineFallback 
                    ? 'Archivo convertido con motor básico Offline' 
                    : 'Archivo convertido con éxito'}
                </span>
              </div>
              <h3 className="result-title">VISTA PREVIA</h3>
              <textarea 
                className="output-box" 
                readOnly 
                value={result.markdown} 
                style={{flexGrow: 1}}
              />
              <div className="action-buttons">
                <button 
                  className="secondary-btn"
                  onClick={() => navigator.clipboard.writeText(result.markdown)}
                >
                  <Copy size={16} /> Copiar
                </button>
                <button 
                  className="secondary-btn"
                  onClick={() => downloadMarkdown(result.markdown, result.originalName)}
                >
                  <Download size={16} /> Descargar
                </button>
              </div>
            </div>
          ) : (
            <div className="card placeholder-card">
              <div className="placeholder-content">
                <FileText className="placeholder-icon" size={64} />
                <h3>Vista Previa del Documento</h3>
                <p>El código Markdown limpio y estructurado aparecerá en esta zona una vez que proceses tu archivo PDF.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConverterView;
