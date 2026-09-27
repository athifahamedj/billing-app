import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../../contexts/useAuth";
import { apiRequest } from "../../../lib/api";

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  });
}

function Dashboard() {
  const { activeShopId } = useAuth();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const loadSummary = async () => {
      setIsLoading(true);
      setError("");
      try {
        const result = await apiRequest("/dashboard/summary", {
          shopId: activeShopId,
          signal: controller.signal,
        });
        setSummary(result);
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setError(requestError.message);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };
    if (activeShopId) loadSummary();
    return () => controller.abort();
  }, [activeShopId]);

  if (!activeShopId) {
    return (
      <p role="status" className="py-8 text-sm text-slate-500">
        Choose a shop to view its dashboard.
      </p>
    );
  }

  if (isLoading) {
    return (
      <p role="status" className="py-12 text-center text-sm text-slate-500">
        Loading dashboard…
      </p>
    );
  }

  if (error || !summary) {
    return (
      <p role="alert" className="py-8 text-sm text-red-600">
        {error || "Dashboard data is unavailable."}
      </p>
    );
  }

  const metrics = [
    ["Today's Sales", formatMoney(summary.today_sales_total)],
    ["Bills Today", summary.today_bill_count],
    ["Low Stock", summary.low_stock_count],
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-7">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          Dashboard
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Today's activity and current stock for this shop.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-slate-200 bg-white p-5"
          >
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Recent Sales
            </h3>
          </div>
          {summary.recent_sales.length ? (
            <ul className="divide-y divide-slate-100">
              {summary.recent_sales.map((sale) => (
                <li
                  key={sale.sale_id}
                  className="flex items-center justify-between gap-4 px-5 py-3"
                >
                  <div className="min-w-0">
                    <Link
                      to={`/sales/${sale.sale_id}/invoice`}
                      className="text-sm font-medium text-blue-700 hover:underline"
                    >
                      {sale.invoice_number}
                    </Link>
                    <p className="truncate text-xs text-slate-500">
                      {sale.customer_name} · {sale.sale_date}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-slate-800">
                    {formatMoney(sale.total_amount)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex min-h-40 items-center justify-center px-5">
              <p className="text-sm text-slate-400">No completed sales yet</p>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Low Stock
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Active products with {summary.low_stock_threshold} or fewer units.
            </p>
          </div>
          {summary.low_stock_products.length ? (
            <ul className="divide-y divide-slate-100">
              {summary.low_stock_products.map((product) => (
                <li
                  key={product.product_id}
                  className="flex items-center justify-between gap-4 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {product.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {product.part_number}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm text-slate-600">
                    {product.quantity_on_hand} {product.unit}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex min-h-40 items-center justify-center px-5">
              <p className="text-sm text-slate-400">No low-stock items</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Dashboard;
