import React, { useState } from 'react';
import { Key, AlertTriangle, CheckCircle2, Moon, Sun, Eye, EyeOff } from 'lucide-react';

const SettingsView = ({ apiKey, setApiKey, theme, setTheme }) => {
  const [localKey, setLocalKey] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const handleSave = () => {
    setApiKey(localKey);
    localStorage.setItem('noxus_api_key', localKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleDelete = () => {
    setApiKey('');
    setLocalKey('');
    localStorage.removeItem('noxus_api_key');
    setShowConfirmDelete(false);
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('noxus_theme', newTheme);
  };

  return (
    <div className="view-container settings-view">
      <header className="view-header">
        <h2>Configuración</h2>
        <p>Gestiona tus preferencias y claves de acceso</p>
      </header>

      <div className="settings-content-wrapper">
        <div className="card settings-card">
          <h3 className="card-title">Inteligencia Artificial</h3>
          <p className="setting-description">
            Configura tu API Key de Google Gemini para habilitar el Formato Mágico en tus conversiones.
          </p>

          <div className="api-key-container">
            <label className="label">
              <Key className="inline-icon" size={16} />
              API Key de Google Gemini
            </label>
            <div className="input-with-icon">
              <input 
                type={showKey ? "text" : "password"} 
                className="output-box api-input" 
                placeholder="AIzaSy..."
                value={localKey}
                onChange={(e) => setLocalKey(e.target.value)}
              />
              <button 
                className="icon-btn toggle-visibility-btn" 
                onClick={() => setShowKey(!showKey)}
                title={showKey ? "Ocultar clave" : "Mostrar clave"}
              >
                {showKey ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            </div>
            
            <div className="settings-actions">
              <button className="primary-btn" onClick={handleSave}>
                Guardar Clave
              </button>
              {apiKey && (
                <button 
                  className="secondary-btn danger-text" 
                  onClick={() => setShowConfirmDelete(true)}
                >
                  Eliminar clave
                </button>
              )}
            </div>
            {saved && (
              <p className="success-text" style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={16} /> ¡Clave guardada con éxito!
              </p>
            )}
          </div>
        </div>

        <div className="card settings-card">
          <h3 className="card-title">Apariencia</h3>
          <p className="setting-description">Cambia entre modo claro y oscuro.</p>
          <div className="theme-toggle-mock">
            <button 
              className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => handleThemeChange('dark')}
            >
              <Moon size={16}/> Oscuro
            </button>
            <button 
              className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
              onClick={() => handleThemeChange('light')}
            >
              <Sun size={16}/> Claro
            </button>
          </div>
        </div>
      </div>

      {showConfirmDelete && (
        <div className="modal-overlay" onClick={() => setShowConfirmDelete(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <AlertTriangle className="warning-icon" size={24} />
              <h3>Eliminar API Key</h3>
            </div>
            <p>¿Estás seguro que deseas eliminar la API Key? Si la borras, tendrás que volver a ingresarla la próxima vez que uses el Formato Mágico.</p>
            <div className="modal-actions">
              <button className="secondary-btn" onClick={() => setShowConfirmDelete(false)}>Cancelar</button>
              <button className="danger-btn" onClick={handleDelete}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
