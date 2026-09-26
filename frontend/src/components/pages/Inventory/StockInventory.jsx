import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";

import { useAuth } from "../../../contexts/useAuth";
import { apiRequest } from "../../../lib/api";

function StockInventory() {
  const { activeShopId } = useAuth();
  const [search, setSearch] = useState("");
  const [balances, setBalances] = useState([]);
  const [loadedShopId, setLoadedShopId] = useState(null);
  const [error, setError] = useState("");

  const loadBalances = useCallback(
    async (signal) => {
      if (!activeShopId) return;
      try {
        const query = search.trim()
          ? `?q=${encodeURIComponent(search.trim())}`
          : "";
        const result = await apiRequest(`/inventory${query}`, {
          shopId: activeShopId,
          signal,
        });
        setBalances({ shopId: activeShopId, values: result });
        setLoadedShopId(activeShopId);
        setError("");
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setLoadedShopId(activeShopId);
          setError(requestError.message);
        }
      }
    },
    [activeShopId, search],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(
      () => loadBalances(controller.signal),
      search ? 250 : 0,
    );
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadBalances, search]);

  const rows =
    balances.shopId === activeShopId ? balances.values : [];
  const isLoading = Boolean(activeShopId) && loadedShopId !== activeShopId;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          Inventory
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          On-hand quantity is calculated from inventory movements.
        </p>
      </div>

      <section className="mb-5 rounded-lg border border-slate-200 bg-white p-4">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search product or part number"
            className="h-10 w-full rounded-md border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
          />
        </div>
      </section>

      {error && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {error}
        </p>
      )}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Part number</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 text-right font-medium">
                  On hand
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="4" className="px-5 py-10 text-center text-slate-500">
                    Loading inventory…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-5 py-10 text-center text-slate-500">
                    No inventory records found.
                  </td>
                </tr>
              ) : (
                rows.map((item) => (
                  <tr
                    key={item.product_id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-5 py-4 font-medium text-slate-800">
                      {item.name}
                    </td>
                    <td className="px-4 py-4 text-slate-500">
                      {item.part_number}
                    </td>
                    <td className="px-4 py-4 text-slate-600">{item.unit}</td>
                    <td className="px-4 py-4 text-right font-semibold text-slate-800">
                      {item.quantity_on_hand}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default StockInventory;
