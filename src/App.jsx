import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CoreLayout from './core/CoreLayout';
import { UserProvider } from './core/UserContext';
import Dashboard from './modules/Dashboard';
import ETaxesModule from './modules/ETaxes';
import CRMModule from './modules/CRM';
import WarehouseModule from './modules/Warehouse';
import RestaurantModule from './modules/Restaurant';
import CallCenterModule from './modules/CallCenter';
import Auth from './modules/Auth/Auth';
import AuthGuard from './components/Auth/AuthGuard';
import Profile from './modules/Profile';
import FinanceModule from './modules/Finance';

function App() {
  return (
    <UserProvider>
      <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route 
          path="/" 
          element={
            <AuthGuard>
              <CoreLayout />
            </AuthGuard>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="dashboard">
            <Route index element={<Dashboard />} />
            <Route path="e-taxes" element={<ETaxesModule />} />
          </Route>
          <Route path="crm" element={<CRMModule />} />
          <Route path="warehouse" element={<WarehouseModule />} />
          <Route path="finance" element={<FinanceModule />} />
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
    </UserProvider>
  );
}

export default App;
