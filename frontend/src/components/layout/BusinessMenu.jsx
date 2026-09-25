import { Settings } from "lucide-react";
import { NavLink } from "react-router-dom";

function BusinessMenu({ onClose }) {
  return (
    <div className="absolute bottom-3 left-3 right-3 z-20 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
      <div className="border-b border-slate-100 px-3 py-2">
        <p className="text-sm font-medium text-slate-900">
          Manar Motors
        </p>

        <p className="text-xs text-slate-400">
          Business management
        </p>
      </div>

      <NavLink
        to="/settings"
        onClick={onClose}
        className="mt-1 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
      >
        <Settings size={17} strokeWidth={1.7} />

        <span>Settings</span>
      </NavLink>
    </div>
  );
}

export default BusinessMenu;