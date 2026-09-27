import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { useAuth } from "../../../contexts/useAuth";
import { apiRequest } from "../../../lib/api";

function SupplierLedger({ supplier, onClose }) {
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
          `/suppliers/${supplier.supplier_id}/ledger`,
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
  }, [activeShopId, supplier.supplier_id]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="supplier-ledger-title"
        className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3
              id="supplier-ledger-title"
              className="text-base font-semibold text-slate-900"
            >
              {supplier.name} · Account ledger
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Received invoices and recorded supplier payments.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close supplier ledger"
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
              Loading supplier ledger…
            </p>
          ) : ledger ? (
            <>
              <div className="mb-5 grid gap-3 sm:grid-cols-3">
                {[
                  ["Received purchases", ledger.total_received],
                  ["Payments made", ledger.total_paid],
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

              {ledger.purchases.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  No purchases for this supplier yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {ledger.purchases.map((purchase) => (
                    <article
                      key={purchase.purchase_id}
                      className="overflow-hidden rounded-md border border-slate-200"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {purchase.invoice_number}
                          </p>
                          <p className="text-xs text-slate-500">
                            {purchase.purchase_date}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <span className="rounded-full bg-white px-2 py-1 text-xs capitalize text-slate-600">
                            {purchase.status === "received"
                              ? purchase.payment_status.replace("_", " ")
                              : purchase.status === "void"
                                ? "Cancelled"
                                : purchase.status}
                          </span>
                          <p className="mt-1 font-medium">
                            Total ₹{Number(purchase.total_amount).toFixed(2)}
                          </p>
                          {purchase.status === "received" && (
                            <p className="text-xs text-slate-500">
                              Due ₹
                              {Number(purchase.outstanding_amount).toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="p-4">
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Payments
                        </h4>
                        {purchase.payments.length === 0 ? (
                          <p className="text-sm text-slate-500">
                            No payments recorded.
                          </p>
                        ) : (
                          <ul className="space-y-2 text-sm">
                            {purchase.payments.map((payment) => (
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

export default SupplierLedger;
