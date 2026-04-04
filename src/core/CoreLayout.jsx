import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const CoreLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50/50 flex">
      <Sidebar />
      <div className="flex-[1] flex flex-col min-h-screen max-w-full">
        <Header />
        <main className="flex-1 p-8 pl-72">
          {/* Outlet renders the nested child routes inside layout */}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default CoreLayout;
