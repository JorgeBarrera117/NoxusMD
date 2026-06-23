import React from 'react';
import { FileText, Edit3, Settings, History } from 'lucide-react';
import NoxusLogo from './NoxusLogo';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'converter', icon: FileText, label: 'Convertidor PDF' },
    { id: 'editor', icon: Edit3, label: 'Editor Markdown' },
    { id: 'history', icon: History, label: 'Historial' },
    { id: 'settings', icon: Settings, label: 'Configuración' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="logo sidebar-logo">
          <NoxusLogo className="logo-icon" style={{ width: '1.5em', height: '1.5em' }} /> 
          <span className="noxus-text">Noxus</span>
          <span className="accent">MD</span>
        </h1>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={20} className="nav-icon" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <p>NoxusMD v2.0</p>
      </div>
    </aside>
  );
};

export default Sidebar;
