import React from 'react';
import { Routes, Route } from 'react-router-dom';
import FleetDashboard from './index';
import FleetMobileEntry from './FleetMobileEntry';

const FleetModule = () => {
  return (
    <Routes>
      <Route index element={<FleetDashboard />} />
      <Route path="entry" element={<FleetMobileEntry />} />
    </Routes>
  );
};

export default FleetModule;
