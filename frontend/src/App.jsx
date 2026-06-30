import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import ConverterView from './views/ConverterView';
import EditorView from './views/EditorView';
import HistoryView from './views/HistoryView';
import SettingsView from './views/SettingsView';
import MermaidView from './views/MermaidView';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('editor');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('noxus_api_key') || '');
  const apiServers = [
    'https://noxusmd-production.up.railway.app/upload',
    'https://noxusmd.onrender.com/upload'
  ];
  const [editorMarkdown, setEditorMarkdown] = useState('');
  const [mermaidCode, setMermaidCode] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('noxus_theme') || 'dark');

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  // Cuando una conversión tiene éxito, la guardamos en el historial y la pasamos al editor
  const handleConvertSuccess = (data) => {
    setEditorMarkdown(data.markdown);
    setActiveTab('editor');
    
    // Guardar en historial local
    const newItem = {
      id: Date.now(),
      filename: data.originalName,
      content: data.markdown,
      date: new Date().toISOString()
    };
    
    const history = JSON.parse(localStorage.getItem('noxus_history') || '[]');
    localStorage.setItem('noxus_history', JSON.stringify([newItem, ...history]));
  };

  const handleViewInEditor = (content) => {
    setEditorMarkdown(content);
    setActiveTab('editor');
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div style={{ display: activeTab === 'converter' ? 'block' : 'none', height: '100%' }}>
        <ConverterView 
          apiKey={apiKey} 
          apiServers={apiServers}
          onConvertSuccess={handleConvertSuccess} 
        />
      </div>
      <div style={{ display: activeTab === 'editor' ? 'block' : 'none', height: '100%' }}>
        <EditorView 
          initialMarkdown={editorMarkdown} 
        />
      </div>
      <div style={{ display: activeTab === 'mermaid' ? 'block' : 'none', height: '100%' }}>
        <MermaidView initialMermaidCode={mermaidCode} />
      </div>
      <div style={{ display: activeTab === 'history' ? 'block' : 'none', height: '100%' }}>
        <HistoryView 
          onViewInEditor={handleViewInEditor} 
        />
      </div>
      <div style={{ display: activeTab === 'settings' ? 'block' : 'none', height: '100%' }}>
        <SettingsView 
          apiKey={apiKey} 
          setApiKey={setApiKey} 
          theme={theme}
          setTheme={setTheme}
        />
      </div>
    </Layout>
  );
};

export default App;
