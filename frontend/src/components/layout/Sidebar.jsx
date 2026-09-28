import { useState } from "react";
import {
  BarChart3,
  Boxes,
  ChevronDown,
  KeyRound,
  LayoutDashboard,
  Menu,
  Package,
  Plus,
  Receipt,
  Settings,
  ShoppingCart,
  Store,
  Truck,
  Users,
  X,
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
  const { activeShop, user } = useAuth();

  const [isMobileOpen, setIsMobileOpen] = useState(false);

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

  const closeMobileSidebar = () => {
    setIsMobileOpen(false);
  };

  const navigation = (
    <nav className="flex-1 overflow-y-auto px-3 py-5">
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        Menu
      </p>

      <div className="space-y-1">
        {menuItems.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={label}
            to={path}
            onClick={closeMobileSidebar}
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

              <Store
                size={18}
                strokeWidth={isShopRoute ? 2 : 1.7}
              />

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
                {shopMenuItems.map(
                  ({ label, path, icon: ShopIcon }) => (
                    <NavLink
                      key={path}
                      to={path}
                      onClick={closeMobileSidebar}
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
                  ),
                )}
              </div>
            )}
          </div>
        )}

        <NavLink
          to="/settings"
          onClick={closeMobileSidebar}
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

              <Settings
                size={18}
                strokeWidth={isActive ? 2 : 1.7}
              />

              <span>Settings</span>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        type="button"
        aria-label="Open navigation menu"
        aria-expanded={isMobileOpen}
        onClick={() => setIsMobileOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm md:hidden"
      >
        <Menu size={20} />
      </button>

      {/* Mobile backdrop */}
      {isMobileOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={closeMobileSidebar}
          className="fixed inset-0 z-40 bg-black/20 md:hidden"
        />
      )}

      {/* Desktop sidebar */}
      <aside className="hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
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

        {navigation}
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-200 md:hidden ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 w-full items-center justify-between border-b border-slate-200 px-5">
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

          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={closeMobileSidebar}
            className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          >
            <X size={20} />
          </button>
        </div>

        {navigation}
      </aside>
    </>
  );
}

export default Sidebar;