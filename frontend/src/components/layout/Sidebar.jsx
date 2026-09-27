import { useState } from "react";
import {
  BarChart3,
  Boxes,
  ChevronDown,
  KeyRound,
  LayoutDashboard,
  Package,
  Plus,
  Receipt,
  Settings,
  ShoppingCart,
  Store,
  Truck,
  Users,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

import { useAuth } from "../../contexts/useAuth";

const menuItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Sales", path: "/sales", icon: Receipt },
  { label: "Purchases", path: "/purchases", icon: ShoppingCart },
  { label: "Products", path: "/products", icon: Package },
  { label: "Inventory", path: "/inventory", icon: Boxes },
  { label: "Customers", path: "/customers", icon: Users },
  { label: "Suppliers", path: "/suppliers", icon: Truck },
  { label: "Reports", path: "/reports", icon: BarChart3 },
];

const shopMenuItems = [
  { label: "Set up shop", path: "/shops/new", icon: Plus },
  { label: "Manage shops", path: "/shops/manage", icon: Store },
  { label: "Shop logins", path: "/shop-logins", icon: KeyRound },
];

function Sidebar() {
  const location = useLocation();
  const isShopRoute = shopMenuItems.some(
    (item) => item.path === location.pathname,
  );
  const [shopsMenuState, setShopsMenuState] = useState({
    pathname: location.pathname,
    isOpen: isShopRoute,
  });
  const isShopsOpen =
    shopsMenuState.pathname === location.pathname
      ? shopsMenuState.isOpen
      : isShopRoute;
  const { activeShop, user } = useAuth();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-16 w-full items-center border-b border-slate-200 px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
            B
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-900">
              {activeShop?.name || user?.shop_name || "Select a shop"}
            </h1>
            <p className="text-[11px] text-slate-400">
              Business management
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Menu
        </p>
        <div className="space-y-1">
          {menuItems.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={label}
              to={path}
              className={({ isActive }) =>
                `relative flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition ${
                  isActive
                    ? "bg-slate-100 font-medium text-slate-900"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 h-5 w-0.5 rounded-full bg-slate-900" />
                  )}
                  <Icon size={18} strokeWidth={isActive ? 2 : 1.7} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}

          {user?.role === "super_admin" && (
            <div>
              <button
                type="button"
                aria-expanded={isShopsOpen}
                onClick={() =>
                  setShopsMenuState({
                    pathname: location.pathname,
                    isOpen: !isShopsOpen,
                  })
                }
                className={`relative flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition ${
                  isShopRoute
                    ? "bg-slate-100 font-medium text-slate-900"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {isShopRoute && (
                  <span className="absolute left-0 h-5 w-0.5 rounded-full bg-slate-900" />
                )}
                <Store size={18} strokeWidth={isShopRoute ? 2 : 1.7} />
                <span className="flex-1 text-left">Shops</span>
                <ChevronDown
                  size={16}
                  className={`transition-transform ${
                    isShopsOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isShopsOpen && (
                <div className="ml-5 mt-1 space-y-1 border-l border-slate-200 pl-3">
                  {shopMenuItems.map(({ label, path, icon: ShopIcon }) => (
                    <NavLink
                      key={path}
                      to={path}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition ${
                          isActive
                            ? "font-medium text-slate-900"
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <ShopIcon
                            size={16}
                            strokeWidth={isActive ? 2 : 1.7}
                          />
                          <span>{label}</span>
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `relative flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition ${
                isActive
                  ? "bg-slate-100 font-medium text-slate-900"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 h-5 w-0.5 rounded-full bg-slate-900" />
                )}
                <Settings size={18} strokeWidth={isActive ? 2 : 1.7} />
                <span>Settings</span>
              </>
            )}
          </NavLink>
        </div>
      </nav>
    </aside>
  );
}

export default Sidebar;
