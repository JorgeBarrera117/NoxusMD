import React from 'react';
import Sidebar from './Sidebar';

const Layout = ({ activeTab, setActiveTab, children }) => {
  return (
    <div className="app-layout">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="main-content-area">
        {children}
      </div>
    </div>
  );
};

export default Layout;
