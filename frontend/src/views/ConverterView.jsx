import React, { useState, useRef } from 'react';
import { FileText, UploadCloud, Zap, Sparkles, CheckCircle2, Copy, Download, X, AlertCircle, RefreshCw } from 'lucide-react';

const ConverterView = ({ apiKey, onConvertSuccess }) => {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [magicFormat, setMagicFormat] = useState(true);
  
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

    try {
      const res = await fetch('http://127.0.0.1:8000/upload', {
        method: 'POST',
        body: formData
      });
      
      const data = await res.json();

      if (data.success) {
        setResult(data);
        // Pass the result up so Editor and History can use it
        if (onConvertSuccess) onConvertSuccess(data);
      } else {
        setError(data.error || 'Ocurrió un error desconocido.');
      }
    } catch (err) {
      console.error(err);
      setError(`Error interno: ${err.message}. (Revisa la consola del navegador)`);
    } finally {
      setIsConverting(false);
    }
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
            <h2>Convertidor PDF</h2>
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
                <CheckCircle2 className="success-icon" size={24} /> 
                <span>Archivo convertido con éxito</span>
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
