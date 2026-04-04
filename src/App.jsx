import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CoreLayout from './core/CoreLayout';
import Dashboard from './modules/Dashboard';
import CRMModule from './modules/CRM';
import WarehouseModule from './modules/Warehouse';
import RestaurantModule from './modules/Restaurant';
import CallCenterModule from './modules/CallCenter';
import Register from './modules/Auth/Register';
import Profile from './modules/Profile';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<CoreLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="crm" element={<CRMModule />} />
          <Route path="warehouse" element={<WarehouseModule />} />
          <Route path="restaurant" element={<RestaurantModule />} />
          <Route path="call-center" element={<CallCenterModule />} />
          <Route path="profile" element={<Profile />} />
          <Route path="*" element={
            <div className="flex items-center justify-center h-full text-gray-500">
              Module not found
            </div>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
