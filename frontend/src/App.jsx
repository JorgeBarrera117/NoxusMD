import { useState, useRef } from 'react'
import { FileText, UploadCloud, Zap, Sparkles, CheckCircle2, Copy, Download, X, Key, AlertCircle, RefreshCw, FileCode2, AlertTriangle } from 'lucide-react'
import './App.css'

// Logo Vectorial Personalizado creado 100% en código SVG
const NoxusLogo = ({ className }) => (
  <svg 
    viewBox="0 0 48 48" 
    className={className} 
    xmlns="http://www.w3.org/2000/svg"
    width="1.25em"
    height="1.25em"
    style={{ transform: 'translateY(-2px)' }}
  >
    <defs>
      <linearGradient id="noxus-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f43f5e" />
        <stop offset="50%" stopColor="#d946ef" />
        <stop offset="100%" stopColor="#8b5cf6" />
      </linearGradient>
      <filter id="logo-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="1.5" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <g filter="url(#logo-glow)">
      {/* La letra N minimalista y fluida */}
      <path 
        d="M 12 36 L 12 12 L 32 36 L 32 12" 
        stroke="url(#noxus-grad)" 
        strokeWidth="6" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        fill="none" 
      />
      {/* Chispa de magia (formato mágico) */}
      <path 
        d="M 38 10 L 41 6 L 44 10 L 41 14 Z" 
        fill="url(#noxus-grad)" 
      />
      <path 
        d="M 6 38 L 8 36 L 10 38 L 8 40 Z" 
        fill="url(#noxus-grad)" 
      />
    </g>
  </svg>
)

function App() {
  const [file, setFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [magicFormat, setMagicFormat] = useState(true)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('noxus_api_key') || '')
  
  const fileInputRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0])
      setResult(null)
      setError(null)
    }
  }

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setResult(null)
      setError(null)
    }
  }

  const removeFile = () => {
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setResult(null)
    setError(null)
  }

  const handleConvert = async () => {
    if (!file) {
      setError('Por favor selecciona un archivo primero.')
      return
    }

    setIsConverting(true)
    setError(null)
    setResult(null)

    const formData = new FormData()
    formData.append('archivo', file)
    formData.append('magicFormat', magicFormat ? 'true' : 'false')
    formData.append('apiKey', apiKey.trim())

    try {
      // Usar la URL de producción alojada en Railway
      const res = await fetch('https://noxusmd-production.up.railway.app/backend/api/convert.php', {
        method: 'POST',
        body: formData
      })
      
      const data = await res.json()

      if (data.success) {
        setResult(data)
        // Auto-descargar el archivo
        downloadMarkdown(data.markdown, data.originalName)
      } else {
        setError(data.error || 'Ocurrió un error desconocido.')
      }
    } catch (err) {
      console.error(err)
      setError(`Error interno: ${err.message}. (Revisa la consola del navegador)`)
    } finally {
      setIsConverting(false)
    }
  }

  const downloadMarkdown = (content, filename) => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDownload = () => {
    if (result) {
      downloadMarkdown(result.markdown, result.originalName)
    }
  }

  return (
    <div className="container">
      <main className="main-content">
        <div className="left-panel">
          <header className="header" style={{ marginBottom: '2rem' }}>
            <h1 className="logo">
              <NoxusLogo className="logo-icon" /> 
              <span className="noxus-text">Noxus</span>
              <span className="accent">MD</span>
            </h1>
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
                  <p className="drop-hint">El archivo se procesará localmente de forma segura.</p>
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
                Aplicar Formato Mágico (Detectar Títulos, Listas y Normas APA)
              </span>
            </label>
            
            {magicFormat && (
              <div className="api-key-container">
                <label className="label">
                  <Key className="inline-icon" size={14} />
                  API Key de Google Gemini <span className="badge">Opcional</span>
                </label>
                <input 
                  type="password" 
                  className="output-box api-input" 
                  placeholder="Pega tu clave AIzaSy... aquí para usar la Inteligencia Artificial"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value)
                    localStorage.setItem('noxus_api_key', e.target.value)
                  }}
                />
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: '0.5rem', gap: '0.5rem' }}>
                  {apiKey && (
                    <button 
                      className="text-btn" 
                      style={{ margin: 0 }}
                      onClick={() => setShowConfirmDelete(true)}
                    >
                      Eliminar clave guardada
                    </button>
                  )}
                  <p className="drop-hint api-hint" style={{ margin: 0, width: '100%', textAlign: 'left' }}>
                    Tu clave se guarda automáticamente en tu navegador. Si la borras, se usará el formateador offline.
                  </p>
                </div>
              </div>
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
              <><Zap className="action-icon" size={20} /> Convertir y Descargar Markdown</>
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
            <div className="card result-card">
              <div className="success-header">
                <CheckCircle2 className="success-icon" size={24} /> 
                <span>Archivo convertido con éxito</span>
              </div>
              
              <h3 className="result-title">VISTA PREVIA</h3>
              <textarea 
                className="output-box" 
                readOnly 
                value={result.markdown} 
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
                  onClick={handleDownload}
                >
                  <Download size={16} /> Descargar de nuevo
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
      </main>

      {showConfirmDelete && (
        <div className="modal-overlay" onClick={() => setShowConfirmDelete(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <AlertTriangle className="warning-icon" size={24} />
              <h3>Eliminar API Key</h3>
            </div>
            <p>¿Estás seguro que deseas eliminar la API Key guardada en este navegador? Si la borras, tendrás que volver a ingresarla la próxima vez que uses el Formato Mágico.</p>
            <div className="modal-actions">
              <button 
                className="secondary-btn" 
                onClick={() => setShowConfirmDelete(false)}
              >
                Cancelar
              </button>
              <button 
                className="danger-btn" 
                onClick={() => {
                  setApiKey('')
                  localStorage.removeItem('noxus_api_key')
                  setShowConfirmDelete(false)
                }}
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
