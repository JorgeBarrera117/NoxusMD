import React, { useState } from 'react';
import Layout from './components/Layout';
import ConverterView from './views/ConverterView';
import EditorView from './views/EditorView';
import HistoryView from './views/HistoryView';
import SettingsView from './views/SettingsView';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('converter');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('noxus_api_key') || '');
  const [editorMarkdown, setEditorMarkdown] = useState('');

  // Cuando una conversión tiene éxito, la guardamos en el historial y la pasamos al editor
  const handleConvertSuccess = (data) => {
    setEditorMarkdown(data.markdown);
    
    // Guardar en historial local
    const newItem = {
      filename: data.originalName,
      content: data.markdown,
      date: new Date().toISOString()
    };
    
    const currentHistory = JSON.parse(localStorage.getItem('noxus_history') || '[]');
    const newHistory = [newItem, ...currentHistory].slice(0, 10); // Guardar máximo 10
    localStorage.setItem('noxus_history', JSON.stringify(newHistory));
  };

  const handleViewInEditor = (content) => {
    setEditorMarkdown(content);
    setActiveTab('editor');
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'converter' && (
        <ConverterView 
          apiKey={apiKey} 
          onConvertSuccess={handleConvertSuccess} 
        />
      )}
      {activeTab === 'editor' && (
        <EditorView 
          initialMarkdown={editorMarkdown} 
        />
      )}
      {activeTab === 'history' && (
        <HistoryView 
          onViewInEditor={handleViewInEditor} 
        />
      )}
      {activeTab === 'settings' && (
        <SettingsView 
          apiKey={apiKey} 
          setApiKey={setApiKey} 
        />
      )}
    </Layout>
  );
}

export default App;
