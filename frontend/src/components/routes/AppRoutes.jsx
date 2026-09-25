import { Routes, Route, Navigate } from "react-router-dom";

import Dashboard from "../pages/Dashboard/Dashboard";
import Sales from "../pages/Sales/Sales";
import Purchases from "../pages/Purchases/Purchases";
import Inventory from "../pages/Inventory/Inventory";
import Customers from "../pages/Customers/Customers";
import Suppliers from "../pages/Suppliers/Suppliers";
import Settings from "../pages/Settings/Settings";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/sales" element={<Sales />} />
      <Route path="/purchases" element={<Purchases />} />
      <Route path="/inventory" element={<Inventory />} />
      <Route path="/customers" element={<Customers />} />
      <Route path="/suppliers" element={<Suppliers />} />
      <Route path="/settings" element={<Settings />} />

      <Route path="/reports" element={<div>Reports</div>} />

    </Routes>
  );
}

export default AppRoutes;