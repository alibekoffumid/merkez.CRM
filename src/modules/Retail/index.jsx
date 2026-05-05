import React from 'react';
import { Routes, Route } from 'react-router-dom';
import RetailPOS from './pages/RetailPOS';
import RetailInventory from './pages/RetailInventory';
import RetailHistory from './pages/RetailHistory';

const RetailModule = () => {
  return (
    <Routes>
      <Route index element={<RetailPOS />} />
      <Route path="inventory" element={<RetailInventory />} />
      <Route path="history" element={<RetailHistory />} />
    </Routes>
  );
};

export default RetailModule;
