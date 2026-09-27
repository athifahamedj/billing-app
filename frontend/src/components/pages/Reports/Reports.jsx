import { useEffect, useState } from "react";

import { useAuth } from "../../../contexts/useAuth";
import { apiRequest } from "../../../lib/api";

function localDateValue(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  });
}

function Reports() {
  const { activeShopId } = useAuth();
  const today = new Date();
  const [startDate, setStartDate] = useState(
    localDateValue(new Date(today.getFullYear(), today.getMonth(), 1)),
  );
  const [endDate, setEndDate] = useState(localDateValue(today));
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const loadSummary = async () => {
      setIsLoading(true);
      setError("");
      try {
        const query = new URLSearchParams({
          start_date: startDate,
          end_date: endDate,
        });
        const result = await apiRequest(`/reports/summary?${query}`, {
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
  }, [activeShopId, endDate, startDate]);

  if (!activeShopId) {
    return (
      <p role="status" className="py-8 text-sm text-slate-500">
        Choose a shop to view its reports.
      </p>
    );
  }

  const metrics = summary
    ? [
        ["Sales", formatMoney(summary.sales_total), `${summary.sales_count} bills`],
        [
          "Sales payments received",
          formatMoney(summary.sales_payments_received),
          "Recorded during this period",
        ],
        [
          "Received purchases",
          formatMoney(summary.purchases_total),
          `${summary.purchase_count} purchases`,
        ],
        [
          "Supplier payments made",
          formatMoney(summary.supplier_payments_made),
          "Recorded during this period",
        ],
        [
          "Customer outstanding",
          formatMoney(summary.customer_outstanding),
          "Current balance",
        ],
        [
          "Supplier outstanding",
          formatMoney(summary.supplier_outstanding),
          "Current balance",
        ],
      ]
    : [];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          Reports
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Sales and purchase activity for the selected shop and date range.
        </p>
      </div>

      <section className="mb-6 flex flex-wrap items-end gap-4 rounded-lg border border-slate-200 bg-white p-5">
        <label className="grid gap-1.5 text-xs font-medium text-slate-600">
          From
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="h-10 rounded-md border border-slate-200 px-3 text-sm text-slate-800"
          />
        </label>
        <label className="grid gap-1.5 text-xs font-medium text-slate-600">
          To
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="h-10 rounded-md border border-slate-200 px-3 text-sm text-slate-800"
          />
        </label>
        <p className="text-xs text-slate-500">
          Sales and purchases use invoice dates. Payment totals use payment
          dates. Outstanding balances are current, all-time totals.
        </p>
      </section>

      {error ? (
        <p role="alert" className="mb-6 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <p role="status" className="py-12 text-center text-sm text-slate-500">
          Loading reports…
        </p>
      ) : null}

      {summary ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {metrics.map(([label, value, detail]) => (
              <article
                key={label}
                className="rounded-lg border border-slate-200 bg-white p-5"
              >
                <h3 className="text-sm text-slate-500">{label}</h3>
                <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
                  {value}
                </p>
                <p className="mt-1 text-xs text-slate-500">{detail}</p>
              </article>
            ))}
          </div>

          <section className="mt-6 rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Top-selling products
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Product</th>
                    <th className="px-5 py-3 font-medium">Part number</th>
                    <th className="px-5 py-3 text-right font-medium">
                      Quantity sold
                    </th>
                    <th className="px-5 py-3 text-right font-medium">
                      Sales total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.top_products.length ? (
                    summary.top_products.map((product) => (
                      <tr key={`${product.part_number}-${product.product_name}`}>
                        <td className="px-5 py-3 font-medium text-slate-800">
                          {product.product_name}
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {product.part_number}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-600">
                          {product.quantity_sold}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-800">
                          {formatMoney(product.sales_total)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="4"
                        className="px-5 py-10 text-center text-slate-400"
                      >
                        No completed sales in this date range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

export default Reports;