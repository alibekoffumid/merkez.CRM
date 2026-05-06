import React from 'react';
import { Routes, Route } from 'react-router-dom';
import FleetDashboard from './FleetDashboard';
import FleetMobileEntry from './FleetMobileEntry';

import DriversList from './DriversList';

const FleetModule = () => {
  return (
    <Routes>
      <Route index element={<FleetDashboard />} />
      <Route path="drivers" element={<DriversList />} />
      <Route path="entry" element={<FleetMobileEntry />} />
    </Routes>
  );
};

export default FleetModule;
