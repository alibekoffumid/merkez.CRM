import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const CoreLayout = () => {
  const location = useLocation();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const isRetail = location.pathname.startsWith('/retail');
  const toggleMobileSidebar = () => setIsMobileSidebarOpen(!isMobileSidebarOpen);

  return (
    <div className="h-screen bg-gray-50/50 flex relative overflow-hidden">
      {/* Sidebar - Desktop and Mobile */}
      <Sidebar 
        onHoverChange={setIsSidebarExpanded} 
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />
      
      {/* Mobile Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col h-screen overflow-hidden overflow-x-hidden transition-all duration-300 ${
        isSidebarExpanded ? 'lg:filter lg:blur-sm lg:brightness-90 lg:pointer-events-none' : ''
      }`}>
        {!isRetail && <Header onMenuClick={toggleMobileSidebar} />}
        <main className={`flex-1 min-h-0 overflow-hidden bg-gray-50/50 ${isRetail ? 'h-full' : ''}`}>
          <div className="h-full overflow-y-auto overflow-x-hidden no-scrollbar">
            <div className={`${isRetail ? 'p-0' : 'p-4 sm:p-6 lg:p-10 lg:pl-24'} max-w-full mx-auto h-full`}>
              <Outlet />
            </div>
          </div>
        </main>

      </div>
    </div>
  );
};

export default CoreLayout;
