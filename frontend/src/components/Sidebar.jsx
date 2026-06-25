import React from 'react';
import { FileText, Edit3, Settings, History, ChevronLeft, ChevronRight, Workflow, FileCode2, FileUp } from 'lucide-react';
import NoxusLogo from './NoxusLogo';

const Sidebar = ({ activeTab, setActiveTab, isCollapsed, setIsCollapsed }) => {
  const menuItems = [
    { id: 'editor', icon: FileCode2, label: 'Editor Markdown' },
    { id: 'converter', icon: FileUp, label: 'Conversor PDF' },
    { id: 'mermaid', icon: Workflow, label: 'Diagramas' },
    { id: 'history', icon: History, label: 'Historial' },
    { id: 'settings', icon: Settings, label: 'Configuración' },
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <button 
        className="sidebar-toggle-btn"
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? "Expandir menú" : "Contraer menú"}
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <div className="sidebar-header" style={{ textAlign: 'center' }}>
        <h1 className="logo sidebar-logo" style={{ flexDirection: 'column', gap: 0 }}>
          <NoxusLogo className="logo-icon" style={{ width: isCollapsed ? '1.5em' : '2.2em', height: isCollapsed ? '1.5em' : '2.2em', transition: 'all 0.3s ease' }} /> 
          <div className="logo-text-wrapper" style={{ marginTop: '-4px' }}>
            <span className="noxus-text">Noxus</span>
            <span className="accent">MD</span>
          </div>
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
              title={isCollapsed ? item.label : undefined}
              style={item.id === 'settings' ? { marginTop: 'auto' } : {}}
            >
              <Icon size={20} className="nav-icon" />
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <p className="footer-text">NoxusMD v2.0</p>
      </div>
    </aside>
  );
};

export default Sidebar;
