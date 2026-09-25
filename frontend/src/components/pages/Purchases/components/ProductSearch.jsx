import { Search } from "lucide-react";

function ProductSearch() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type="text"
          placeholder="Search product or scan barcode..."
          className="h-10 w-full rounded-md border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
        />
      </div>
    </section>
  );
}

export default ProductSearch;