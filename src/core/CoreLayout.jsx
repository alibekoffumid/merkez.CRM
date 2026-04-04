import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const CoreLayout = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50/50 flex relative">
      <Sidebar onHoverChange={setIsSidebarExpanded} />
      
      {/* Dynamic Overlay Content */}
      <div className={`flex-[1] flex flex-col min-h-screen max-w-full transition-all duration-300 ${isSidebarExpanded ? 'filter blur-sm brightness-90 pointer-events-none' : ''}`}>
        <Header />
        <main className="flex-1 p-8 pl-28 transition-all duration-300">
          {/* Outlet renders the nested child routes inside layout */}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default CoreLayout;
