import { useState, useRef } from 'react'
import './App.css'

function App() {
  const [file, setFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  
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

    try {
      // Ajusta la URL según dónde esté corriendo el backend PHP
      const res = await fetch('http://localhost/Markitdow/backend/api/convert.php', {
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
      setError('No se pudo conectar con el servidor API. Verifica que XAMPP esté corriendo.')
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

  const handleCopy = () => {
    if (result && result.markdown) {
      navigator.clipboard.writeText(result.markdown)
      alert('¡Copiado al portapapeles!')
    }
  }

  return (
    <div className="container">
      <h1 className="app-title">Noxus<span>MD</span></h1>

      <div className="card">
        <label className="label">Archivo a convertir</label>
        
        {!file ? (
          <div 
            className={`drop-zone ${isDragging ? 'dragover' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="drop-icon">📂</span>
            <p className="drop-strong">Arrastra tu archivo aquí</p>
            <p className="drop-hint">o haz clic para seleccionar · PDF, DOCX, PPTX, XLSX, HTML, CSV…</p>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileSelect}
              accept=".pdf,.docx,.pptx,.xlsx,.csv,.html,.odt,.txt"
            />
          </div>
        ) : (
          <div className="file-pill visible">
            <span className="pill-icon">📄</span>
            <span className="pill-name">{file.name}</span>
            <button className="pill-remove" onClick={removeFile}>✕</button>
          </div>
        )}
      </div>

      <button 
        className="btn-convert" 
        onClick={handleConvert} 
        disabled={isConverting || !file}
      >
        {isConverting ? (
          <><span className="spinner"></span> Convirtiendo…</>
        ) : (
          '⚡ Convertir y Descargar Markdown'
        )}
      </button>

      {error && (
        <div className="error-box visible">
          {error}
        </div>
      )}

      {result && (
        <div className="card">
          <div className="status-ok">✅ Archivo convertido con éxito</div>
          <label className="label" style={{ marginTop: '12px' }}>Vista previa</label>
          <textarea 
            className="output-box" 
            readOnly 
            value={result.markdown}
          />
          <div className="output-actions">
            <button className="btn-secondary" onClick={handleCopy}>📋 Copiar</button>
            <button className="btn-secondary" onClick={() => downloadMarkdown(result.markdown, result.originalName)}>⬇ Descargar de nuevo</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
