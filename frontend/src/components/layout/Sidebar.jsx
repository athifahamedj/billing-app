import {
  LayoutDashboard,
  Receipt,
  ShoppingCart,
  Package,
  Users,
  Truck,
  BarChart3,
  Settings,
} from "lucide-react";

const mainMenu = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Sales", icon: Receipt },
  { label: "Purchases", icon: ShoppingCart },
  { label: "Inventory", icon: Package },
  { label: "Customers", icon: Users },
  { label: "Suppliers", icon: Truck },
  { label: "Reports", icon: BarChart3 },
];

function Sidebar() {
  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-slate-950 text-slate-300">
      
      {/* Brand */}
      <div className="flex h-20 items-center border-b border-slate-800 px-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-white">
            Billing App
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Business Management
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6">
        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Main Menu
        </p>

        <div className="space-y-1">
          {mainMenu.map((item, index) => {
            const Icon = item.icon;
            const active = index === 0;

            return (
              <button
                key={item.label}
                className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon
                  size={19}
                  strokeWidth={active ? 2 : 1.8}
                  className={
                    active
                      ? "text-white"
                      : "text-slate-500 group-hover:text-slate-300"
                  }
                />

                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Settings */}
      <div className="border-t border-slate-800 p-3">
        <button className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white">
          <Settings
            size={19}
            strokeWidth={1.8}
            className="text-slate-500 group-hover:text-slate-300"
          />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;