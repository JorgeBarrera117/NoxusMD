import React, { useState } from 'react';
import Sidebar from './Sidebar';

const Layout = ({ activeTab, setActiveTab, children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`app-layout ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />
      <div className="main-content-area">
        {children}
      </div>
    </div>
  );
};

export default Layout;
