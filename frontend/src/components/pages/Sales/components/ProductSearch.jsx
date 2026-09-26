import { Search } from "lucide-react";
import { useState } from "react";

function ProductSearch({ products, onAddProduct }) {
  const [search, setSearch] = useState("");

  const filteredProducts = products.filter((product) =>
    `${product.name} ${product.code}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search product or scan barcode..."
          className="h-10 w-full rounded-md border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
        />
      </div>

      {search.trim() && (
        <div className="mt-2 overflow-hidden rounded-md border border-slate-200">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => {
                  onAddProduct(product);
                  setSearch("");
                }}
                disabled={product.available <= 0}
                className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {product.name}
                  </p>

                  <p className="mt-0.5 text-xs text-slate-400">
                    {product.code}
                  </p>
                </div>

                <span className="text-sm font-medium text-slate-700">
                  <span className="block text-right">
                    ₹{product.price.toFixed(2)}
                  </span>
                  <span className="mt-0.5 block text-right text-xs font-normal text-slate-400">
                    {product.available} in stock
                  </span>
                </span>
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-slate-500">
              No products found.
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default ProductSearch;