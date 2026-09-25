import { useState } from "react";
import {
  LayoutDashboard,
  Receipt,
  ShoppingCart,
  Package,
  Users,
  Truck,
  BarChart3,
  ChevronUp,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import BusinessMenu from "../../components/layout/BusinessMenu";

const menuItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Sales", path: "/sales", icon: Receipt },
  { label: "Purchases", path: "/purchases", icon: ShoppingCart },
  { label: "Inventory", path: "/inventory", icon: Package },
  { label: "Customers", path: "/customers", icon: Users },
  { label: "Suppliers", path: "/suppliers", icon: Truck },
  { label: "Reports", path: "/reports", icon: BarChart3 },
];

function Sidebar() {
  const [isBusinessMenuOpen, setIsBusinessMenuOpen] = useState(false);

  return (
    <aside className="relative flex h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      {/* Brand */}
      <button
        type="button"
        onClick={() => setIsBusinessMenuOpen((current) => !current)}
        className="flex h-16 w-full items-center justify-between border-b border-slate-200 px-5 text-left transition hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
            B
          </div>

          <div>
            <h1 className="text-sm font-semibold text-slate-900">
              Manar Motors
            </h1>

            <p className="text-[11px] text-slate-400">
              Business management
            </p>
          </div>
        </div>

        <ChevronUp
          size={16}
          strokeWidth={1.7}
          className={`text-slate-400 transition-transform ${
            isBusinessMenuOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Menu
        </p>

        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.label}
                to={item.path}
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

                    <Icon
                      size={18}
                      strokeWidth={isActive ? 2 : 1.7}
                    />

                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Business menu */}
      {isBusinessMenuOpen && (
        <BusinessMenu
          onClose={() => setIsBusinessMenuOpen(false)}
        />
      )}
    </aside>
  );
}

export default Sidebar;