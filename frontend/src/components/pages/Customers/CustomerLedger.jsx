import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { useAuth } from "../../../contexts/useAuth";
import { apiRequest } from "../../../lib/api";

function CustomerLedger({ customer, onClose }) {
  const { activeShopId } = useAuth();
  const [ledger, setLedger] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const loadLedger = async () => {
      setIsLoading(true);
      setError("");
      try {
        const result = await apiRequest(
          `/customers/${customer.customer_id}/ledger`,
          { shopId: activeShopId, signal: controller.signal },
        );
        setLedger(result);
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setError(requestError.message);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };
    loadLedger();
    return () => controller.abort();
  }, [activeShopId, customer.customer_id]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-ledger-title"
        className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3
              id="customer-ledger-title"
              className="text-base font-semibold text-slate-900"
            >
              {customer.name} · Account ledger
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Invoice and payment history for the active shop.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close customer ledger"
            onClick={onClose}
            className="rounded p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[calc(90vh-72px)] overflow-y-auto p-5">
          {error && (
            <p role="alert" className="mb-4 text-sm text-red-600">
              {error}
            </p>
          )}
          {isLoading ? (
            <p role="status" className="py-8 text-center text-sm text-slate-500">
              Loading customer ledger…
            </p>
          ) : ledger ? (
            <>
              <div className="mb-5 grid gap-3 sm:grid-cols-3">
                {[
                  ["Completed sales", ledger.total_invoiced],
                  ["Payments received", ledger.total_paid],
                  ["Outstanding balance", ledger.outstanding_amount],
                ].map(([label, amount]) => (
                  <div
                    key={label}
                    className="rounded-md border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      ₹{Number(amount).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              {ledger.sales.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  No sales for this customer yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {ledger.sales.map((sale) => (
                    <article
                      key={sale.sale_id}
                      className="overflow-hidden rounded-md border border-slate-200"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {sale.invoice_number}
                          </p>
                          <p className="text-xs text-slate-500">
                            {sale.sale_date}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <span className="rounded-full bg-white px-2 py-1 text-xs capitalize text-slate-600">
                            {sale.status === "void"
                              ? "Cancelled"
                              : sale.payment_status.replace("_", " ")}
                          </span>
                          <p className="mt-1 font-medium">
                            Total ₹{Number(sale.total_amount).toFixed(2)}
                          </p>
                          {sale.status === "completed" && (
                            <p className="text-xs text-slate-500">
                              Due ₹{Number(sale.outstanding_amount).toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-4 p-4 md:grid-cols-2">
                        <div>
                          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Items
                          </h4>
                          <ul className="space-y-1 text-sm">
                            {sale.items.map((item) => (
                              <li
                                key={item.sale_item_id}
                                className="flex justify-between gap-3"
                              >
                                <span>
                                  {item.product_name} × {item.quantity}
                                </span>
                                <span className="whitespace-nowrap text-slate-600">
                                  ₹
                                  {(
                                    Number(item.unit_price) * item.quantity +
                                    Number(item.gst_amount)
                                  ).toFixed(2)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Payments
                          </h4>
                          {sale.payments.length === 0 ? (
                            <p className="text-sm text-slate-500">
                              No payments recorded.
                            </p>
                          ) : (
                            <ul className="space-y-2 text-sm">
                              {sale.payments.map((payment) => (
                                <li
                                  key={payment.payment_id}
                                  className="flex justify-between gap-3"
                                >
                                  <span>
                                    {payment.payment_date} ·{" "}
                                    <span className="capitalize">
                                      {payment.payment_method.replace("_", " ")}
                                    </span>
                                    <span className="ml-1 text-xs text-slate-500">
                                      ({payment.status === "void" ? "Reversed" : "Recorded"})
                                    </span>
                                    {payment.void_reason && (
                                      <span className="block text-xs text-slate-500">
                                        Reason: {payment.void_reason}
                                      </span>
                                    )}
                                  </span>
                                  <span className="whitespace-nowrap">
                                    ₹{Number(payment.amount).toFixed(2)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export default CustomerLedger;
