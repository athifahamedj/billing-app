import { useEffect, useState } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../../../contexts/useAuth";
import { apiRequest } from "../../../lib/api";

function formatMoney(value) {
  return `₹${Number(value).toFixed(2)}`;
}

function SalesInvoice() {
  const { saleId } = useParams();
  const navigate = useNavigate();
  const { activeShopId } = useAuth();
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const loadInvoice = async () => {
      setIsLoading(true);
      setError("");
      try {
        const result = await apiRequest(`/sales/${saleId}/invoice`, {
          shopId: activeShopId,
          signal: controller.signal,
        });
        setInvoice(result);
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setError(requestError.message);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };
    if (activeShopId) loadInvoice();
    return () => controller.abort();
  }, [activeShopId, saleId]);

  if (isLoading) {
    return (
      <p role="status" className="py-12 text-center text-sm text-slate-500">
        Loading invoice…
      </p>
    );
  }
  if (error || !invoice) {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <p role="alert" className="mb-4 text-sm text-red-600">
          {error || "Invoice data is unavailable."}
        </p>
        <button
          type="button"
          onClick={() => navigate("/sales")}
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          Back to sales
        </button>
      </div>
    );
  }

  const { sale } = invoice;
  const isVoided = sale.status === "void";

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          body * { visibility: hidden !important; }
          .print-invoice-root,
          .print-invoice-root * { visibility: visible !important; }
          .print-invoice-root {
            position: fixed !important;
            inset: 0 !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
          }
          .print-invoice-controls { display: none !important; }
        }
      `}</style>
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="print-invoice-controls flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/sales")}
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Back to sales
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Printer size={16} />
            Print / Save PDF
          </button>
        </div>

        <article className="print-invoice-root relative rounded-lg border border-slate-200 bg-white p-8 shadow-sm print:p-0">
          {isVoided && (
            <div className="pointer-events-none absolute right-10 top-24 rotate-[-18deg] border-4 border-red-600 px-5 py-2 text-4xl font-black tracking-widest text-red-600 opacity-70">
              CANCELLED
            </div>
          )}
          <header className="flex flex-wrap justify-between gap-6 border-b border-slate-300 pb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Tax invoice
              </p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">
                {invoice.shop_name}
              </h1>
              {invoice.shop_address && (
                <p className="mt-2 max-w-md whitespace-pre-line text-sm text-slate-600">
                  {invoice.shop_address}
                </p>
              )}
              {invoice.shop_phone && (
                <p className="mt-1 text-sm text-slate-600">
                  Phone: {invoice.shop_phone}
                </p>
              )}
              {invoice.shop_gstin && (
                <p className="mt-1 text-sm text-slate-600">
                  GSTIN: {invoice.shop_gstin}
                </p>
              )}
            </div>
            <div className="min-w-48 text-right">
              <h2 className="text-lg font-semibold text-slate-900">
                {isVoided ? "Cancelled invoice" : "Invoice"}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Invoice no: <strong>{sale.invoice_number}</strong>
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Date: {sale.sale_date}
              </p>
              <p className="mt-1 text-sm capitalize text-slate-600">
                Payment: {sale.payment_status.replace("_", " ")}
              </p>
            </div>
          </header>

          <section className="grid gap-6 border-b border-slate-200 py-6 sm:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Bill to
              </h3>
              <p className="mt-2 font-medium text-slate-900">
                {invoice.customer_name}
              </p>
              {invoice.customer_address && (
                <p className="mt-1 whitespace-pre-line text-sm text-slate-600">
                  {invoice.customer_address}
                </p>
              )}
              {invoice.customer_phone && (
                <p className="mt-1 text-sm text-slate-600">
                  Phone: {invoice.customer_phone}
                </p>
              )}
              {invoice.customer_gstin && (
                <p className="mt-1 text-sm text-slate-600">
                  GSTIN: {invoice.customer_gstin}
                </p>
              )}
            </div>
            <div className="sm:text-right">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Invoice status
              </h3>
              <p className="mt-2 text-sm capitalize text-slate-700">
                {sale.status === "void" ? "Cancelled" : "Completed"}
              </p>
            </div>
          </section>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-300 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-3 pr-3 font-semibold">Item</th>
                  <th className="px-3 py-3 text-right font-semibold">Qty</th>
                  <th className="px-3 py-3 text-right font-semibold">Rate</th>
                  <th className="px-3 py-3 text-right font-semibold">GST</th>
                  <th className="py-3 pl-3 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item) => {
                  const lineSubtotal =
                    Number(item.unit_price) * item.quantity -
                    Number(item.discount_amount);
                  return (
                    <tr
                      key={item.sale_item_id}
                      className="border-b border-slate-100"
                    >
                      <td className="py-3 pr-3">
                        <p className="font-medium text-slate-900">
                          {item.product_name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {item.part_number}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-right">{item.quantity}</td>
                      <td className="px-3 py-3 text-right">
                        {formatMoney(item.unit_price)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {Number(item.gst_rate).toFixed(2)}% ·{" "}
                        {formatMoney(item.gst_amount)}
                      </td>
                      <td className="py-3 pl-3 text-right font-medium">
                        {formatMoney(lineSubtotal + Number(item.gst_amount))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <section className="ml-auto mt-6 w-full max-w-sm space-y-2 text-sm">
            <div className="flex justify-between gap-6">
              <span className="text-slate-600">Subtotal</span>
              <span>{formatMoney(sale.subtotal)}</span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-slate-600">Discount</span>
              <span>{formatMoney(sale.discount_amount)}</span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-slate-600">GST</span>
              <span>{formatMoney(sale.gst_amount)}</span>
            </div>
            <div className="flex justify-between gap-6 border-t border-slate-300 pt-3 text-base font-semibold">
              <span>Total</span>
              <span>{formatMoney(sale.total_amount)}</span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-slate-600">Paid</span>
              <span>{formatMoney(sale.paid_amount)}</span>
            </div>
            <div className="flex justify-between gap-6 font-medium">
              <span>Balance due</span>
              <span>{formatMoney(sale.outstanding_amount)}</span>
            </div>
          </section>

          <section className="mt-8 border-t border-slate-200 pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Payment history
            </h3>
            {sale.payments.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">
                No payments recorded.
              </p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {sale.payments.map((payment) => (
                  <li key={payment.payment_id} className="flex justify-between gap-4">
                    <span>
                      {payment.payment_date} ·{" "}
                      <span className="capitalize">
                        {payment.payment_method.replace("_", " ")}
                      </span>{" "}
                      ({payment.status === "void" ? "Reversed" : "Recorded"})
                    </span>
                    <span>{formatMoney(payment.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <footer className="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
            Thank you for your business.
          </footer>
        </article>
      </div>
    </>
  );
}

export default SalesInvoice;
