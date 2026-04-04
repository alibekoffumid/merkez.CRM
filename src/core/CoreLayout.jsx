import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const CoreLayout = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  return (
    <div className="h-screen bg-gray-50/50 flex relative overflow-hidden">
      <Sidebar onHoverChange={setIsSidebarExpanded} />
      
      {/* Dynamic Overlay Content */}
      <div className={`flex-[1] flex flex-col h-screen overflow-hidden transition-all duration-300 ${isSidebarExpanded ? 'filter blur-sm brightness-90 pointer-events-none' : ''}`}>
        <Header />
        <main className="flex-1 overflow-y-auto p-8 pl-28 transition-all duration-300">
          {/* Outlet renders the nested child routes inside layout */}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default CoreLayout;
