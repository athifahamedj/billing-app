import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import Layout from "../layout/Layout";
import Dashboard from "../pages/Dashboard/Dashboard";
import Login from "../pages/Login/Login";
import Sales from "../pages/Sales/Sales";
import SalesInvoice from "../pages/Sales/SalesInvoice";
import Purchases from "../pages/Purchases/Purchases";
import Inventory from "../pages/Inventory/Inventory";
import StockInventory from "../pages/Inventory/StockInventory";
import Customers from "../pages/Customers/Customers";
import Suppliers from "../pages/Suppliers/Suppliers";
import Reports from "../pages/Reports/Reports";
import Settings from "../pages/Settings/Settings";
import ShopSetup from "../pages/Administration/ShopSetup";
import ShopAccounts from "../pages/Administration/ShopAccounts";
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
        <Route path="/sales/:saleId/invoice" element={<SalesInvoice />} />
        <Route path="/purchases" element={<Purchases />} />
        <Route path="/products" element={<Inventory />} />
        <Route path="/inventory" element={<StockInventory />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/reports" element={<Reports />} />
        <Route
          path="/shops/new"
          element={
            user?.role === "super_admin" ? (
              <ShopSetup />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />
        <Route
          path="/shop-logins"
          element={
            user?.role === "super_admin" ? (
              <ShopAccounts />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />
      </Route>
    </Routes>
  );
}

export default AppRoutes;