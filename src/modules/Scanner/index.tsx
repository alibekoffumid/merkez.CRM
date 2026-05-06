import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ScannerApp from './pages/ScannerApp';

const ScannerModule: React.FC = () => {
  return (
    <Routes>
      <Route index element={<ScannerApp />} />
    </Routes>
  );
};

export default ScannerModule;
