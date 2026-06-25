import React, { useState } from 'react';
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
  const [editorMarkdown, setEditorMarkdown] = useState('');
  const [mermaidCode, setMermaidCode] = useState('');

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
        />
      </div>
    </Layout>
  );
};

export default App;
