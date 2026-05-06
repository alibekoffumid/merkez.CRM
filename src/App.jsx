import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CoreLayout from './core/CoreLayout';
import { UserProvider, useUser } from './core/UserContext';
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
import DentalModule from './modules/Dental';
import EducationModule from './modules/Education';
import IntegrationsModule from './modules/Integrations';
import RetailModule from './modules/Retail';
import FleetModule from './modules/Fleet';
import ScannerModule from './modules/Scanner';
import ModuleStore from './pages/ModuleStore';
import { Toaster } from 'react-hot-toast';

// Guard component that checks if a specific module is active
const ModuleGuard = ({ moduleId, children }) => {
  const { activeModules, modulesLoading } = useUser();
  
  if (modulesLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!activeModules.includes(moduleId)) {
    return <Navigate to="/modules" replace />;
  }
  
  return children;
};

// Onboarding guard: redirects to module store if no modules are selected
const OnboardingGuard = ({ children }) => {
  const { needsOnboarding, modulesLoading, loading } = useUser();
  
  if (loading || modulesLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (needsOnboarding) {
    return <Navigate to="/modules" replace />;
  }
  
  return children;
};

// Redirects native mobile apps directly to the scanner
const NativeRedirect = ({ children }) => {
  const [isNative, setIsNative] = React.useState(null);

  React.useEffect(() => {
    import('@capacitor/core').then(({ Capacitor }) => {
      setIsNative(Capacitor.isNativePlatform());
    });
  }, []);

  if (isNative === null) return null;

  if (isNative) {
    return <Navigate to="/scanner" replace />;
  }

  return children;
};

import { App as CapacitorApp } from '@capacitor/app';

function App() {
  React.useEffect(() => {
    // Listen for deep links (e.g. returning from Google Auth)
    const setupListener = async () => {
      await CapacitorApp.addListener('appUrlOpen', (event) => {
        try {
          const url = new URL(event.url);
          // Supabase puts the auth tokens in the hash (e.g. #access_token=...)
          if (url.hash) {
            window.location.hash = url.hash;
          }
        } catch (e) {
          console.error('Invalid deep link URL', e);
        }
      });
    };
    setupListener();
  }, []);

  return (
    <UserProvider>
      <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        
        {/* Module Store — accessible always (after auth) */}
        <Route path="/modules" element={
          <AuthGuard>
            <NativeRedirect>
              <ModuleStore />
            </NativeRedirect>
          </AuthGuard>
        } />

        {/* Mobile Scanner — standalone layout, no sidebar/header */}
        <Route path="/scanner/*" element={
          <AuthGuard>
            <ScannerModule />
          </AuthGuard>
        } />

        <Route 
          path="/" 
          element={
            <AuthGuard>
              <NativeRedirect>
                <OnboardingGuard>
                  <CoreLayout />
                </OnboardingGuard>
              </NativeRedirect>
            </AuthGuard>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="dashboard">
            <Route index element={<Dashboard />} />
            <Route path="e-taxes" element={
              <ModuleGuard moduleId="eTaxes"><ETaxesModule /></ModuleGuard>
            } />
          </Route>
          <Route path="crm" element={
            <ModuleGuard moduleId="crm"><CRMModule /></ModuleGuard>
          } />
          <Route path="warehouse" element={
            <ModuleGuard moduleId="warehouse"><WarehouseModule /></ModuleGuard>
          } />
          <Route path="finance" element={
            <ModuleGuard moduleId="finance"><FinanceModule /></ModuleGuard>
          } />
          <Route path="restaurant" element={
            <ModuleGuard moduleId="restaurant"><RestaurantModule /></ModuleGuard>
          } />
          <Route path="call-center" element={
            <ModuleGuard moduleId="callCenter"><CallCenterModule /></ModuleGuard>
          } />
          <Route path="dental" element={
            <ModuleGuard moduleId="dental"><DentalModule /></ModuleGuard>
          } />
          <Route path="education" element={
            <ModuleGuard moduleId="education"><EducationModule /></ModuleGuard>
          } />
          <Route path="integrations" element={
            <ModuleGuard moduleId="integrations"><IntegrationsModule /></ModuleGuard>
          } />
          <Route path="fleet/*" element={
            <ModuleGuard moduleId="fleet"><FleetModule /></ModuleGuard>
          } />
          <Route path="retail/*" element={
            <ModuleGuard moduleId="retail"><RetailModule /></ModuleGuard>
          } />
          <Route path="profile" element={<Profile />} />
          <Route path="*" element={
            <div className="flex items-center justify-center h-full text-gray-500">
              Module not found
            </div>
          } />
        </Route>
      </Routes>
      <Toaster position="top-right" />
    </BrowserRouter>
    </UserProvider>
  );
}

export default App;
