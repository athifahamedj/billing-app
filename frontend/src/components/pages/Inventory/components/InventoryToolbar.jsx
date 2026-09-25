import { Search, SlidersHorizontal } from "lucide-react";

function InventoryToolbar() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            placeholder="Search products..."
            className="h-10 w-full rounded-md border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
          />
        </div>

        <button
          type="button"
          className="flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
        >
          <SlidersHorizontal size={16} />
          Stock Status
        </button>
      </div>
    </section>
  );
}

export default InventoryToolbar;