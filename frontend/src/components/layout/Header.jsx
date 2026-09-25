import { Bell, Search } from "lucide-react";

function Header() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="relative w-72">
        <Search
          size={17}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type="text"
          placeholder="Search..."
          className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
        />
      </div>

      <div className="flex items-center gap-4">
        <button className="relative rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">
          <Bell size={18} strokeWidth={1.7} />

          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-slate-900" />
        </button>

        <div className="h-6 w-px bg-slate-200" />

        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
            MM
          </div>

          <div>
            <p className="text-sm font-medium leading-none text-slate-800">
              Motor Spares
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Shop
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;