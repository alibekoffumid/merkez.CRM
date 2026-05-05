import React from 'react';
import { Routes, Route } from 'react-router-dom';
import RetailPOS from './pages/RetailPOS';
import RetailInventory from './pages/RetailInventory';

const RetailModule = () => {
  return (
    <Routes>
      <Route index element={<RetailPOS />} />
      <Route path="inventory" element={<RetailInventory />} />
    </Routes>
  );
};

export default RetailModule;
