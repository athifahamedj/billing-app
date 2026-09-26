import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import Layout from "../layout/Layout";
import Dashboard from "../pages/Dashboard/Dashboard";
import Login from "../pages/Login/Login";
import Sales from "../pages/Sales/Sales";
import Purchases from "../pages/Purchases/Purchases";
import Inventory from "../pages/Inventory/Inventory";
import StockInventory from "../pages/Inventory/StockInventory";
import Customers from "../pages/Customers/Customers";
import Suppliers from "../pages/Suppliers/Suppliers";
import Settings from "../pages/Settings/Settings";
import { useAuth } from "../../contexts/useAuth";

function AppRoutes() {
  const { user, isLoading } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          isLoading ? (
            <p className="p-6 text-sm text-slate-500">Loading account…</p>
          ) : user ? (
            <Layout>
              <Outlet />
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/purchases" element={<Purchases />} />
        <Route path="/products" element={<Inventory />} />
        <Route path="/inventory" element={<StockInventory />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/reports" element={<div>Reports</div>} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;