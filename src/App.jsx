import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CoreLayout from './core/CoreLayout';
import { UserProvider, useUser } from './core/UserContext';
import ETaxesModule from './modules/ETaxes';
import CRMModule from './modules/CRM';
import WarehouseModule from './modules/Warehouse';
import RestaurantModule from './modules/Restaurant';
import PublicMenu from './modules/Restaurant/PublicMenu';
import CallCenterModule from './modules/CallCenter';
import Auth from './modules/Auth/Auth';
import AuthGuard from './components/Auth/AuthGuard';
import PinGuard from './components/PinGuard';
import Profile from './modules/Profile';
import FinanceModule from './modules/Finance';
import DentalModule from './modules/Dental';
import EducationModule from './modules/Education';
import IntegrationsModule from './modules/Integrations';
import RetailModule from './modules/Retail';
import FleetModule from './modules/Fleet';
import ScannerModule from './modules/Scanner';
import HotelsModule from './modules/Hotels';
import CyberCafeModule from './modules/CyberCafe';
import ModuleStore from './pages/ModuleStore';
import Landing from './pages/Landing';
import { MODULE_REGISTRY } from './config/moduleRegistry';
import { Toaster } from 'react-hot-toast';
import AirMouseReceiver from './components/AirMouse/AirMouseReceiver';

const isAppDomain = window.location.hostname.startsWith('saas.');

// Guard component that checks if a specific module is active
const ModuleGuard = ({ moduleId, children }) => {
  const { activeModules, modulesLoading } = useUser();
  
  if (modulesLoading && activeModules.length === 0) {
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
  const { profile, needsOnboarding, modulesLoading, loading } = useUser();
  
  if ((loading || modulesLoading) && !profile) {
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
  const [isNative, setIsNative] = React.useState(() => {
    // Check if we already know the platform from a previous detection
    const saved = localStorage.getItem('merkez_is_native');
    return saved === 'true' ? true : saved === 'false' ? false : null;
  });

  React.useEffect(() => {
    if (isNative !== null) return;
    
    import('@capacitor/core').then(({ Capacitor }) => {
      const native = Capacitor.isNativePlatform();
      setIsNative(native);
      localStorage.setItem('merkez_is_native', native.toString());
    });
  }, [isNative]);

  if (isNative === null) return children; // Don't block UI if detection is in progress

  if (isNative) {
    return <Navigate to="/scanner" replace />;
  }

  return children;
};

// Dynamic landing page redirect based on active modules
const DynamicRedirect = () => {
  const { activeModules } = useUser();
  
  if (activeModules.length > 0) {
    // Redirect to the first active module's path
    const firstModuleId = activeModules[0];
    const module = MODULE_REGISTRY[firstModuleId];
    if (module) {
      return <Navigate to={module.path} replace />;
    }
  }
  
  return <Navigate to="/modules" replace />;
};

function App() {
  React.useEffect(() => {
    // Listen for deep links (e.g. returning from Google Auth)
    const setupListener = async () => {
      try {
        const { App: CapacitorApp } = await import('@capacitor/app');
        await CapacitorApp.addListener('appUrlOpen', (event) => {
          try {
            const url = new URL(event.url);
            if (url.hash) {
              window.location.hash = url.hash;
            }
          } catch (e) {
            console.error('Invalid deep link URL', e);
          }
        });
      } catch (e) {
        // Fallback if @capacitor/app is not available or not on native
        console.log('Capacitor App plugin not available');
      }
    };
    setupListener();
  }, []);

  return (
    <UserProvider>
      <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={isAppDomain ? <Navigate to="/dashboard" replace /> : <Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/m/:businessId" element={<PublicMenu />} />
        
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

        {/* Main App Layout */}
        <Route 
          path="/dashboard" 
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
          <Route index element={<DynamicRedirect />} />
          <Route path="e-taxes" element={
            <ModuleGuard moduleId="eTaxes"><ETaxesModule /></ModuleGuard>
          } />
        </Route>

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
          <Route path="crm" element={
            <ModuleGuard moduleId="crm"><CRMModule /></ModuleGuard>
          } />
          <Route path="warehouse" element={
            <ModuleGuard moduleId="warehouse">
              <PinGuard moduleId="warehouse">
                <WarehouseModule />
              </PinGuard>
            </ModuleGuard>
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
          <Route path="hotels/*" element={
            <ModuleGuard moduleId="hotels"><HotelsModule /></ModuleGuard>
          } />
          <Route path="cyber-cafe/*" element={
            <ModuleGuard moduleId="cyberCafe"><CyberCafeModule /></ModuleGuard>
          } />
          <Route path="settings" element={<Profile />} />
          <Route path="profile" element={<Profile />} />
          <Route path="*" element={
            <div className="flex items-center justify-center h-full text-gray-500">
              Module not found
            </div>
          } />
        </Route>
      </Routes>
      <Toaster position="top-right" />
      <AirMouseReceiver wsUrl="ws://192.168.100.9:8765" />
    </BrowserRouter>
    </UserProvider>
  );
}

export default App;
