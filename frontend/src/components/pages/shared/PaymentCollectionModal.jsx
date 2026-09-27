import { Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

const PAYMENT_METHODS = [
  ["cash", "Cash"],
  ["upi", "UPI"],
  ["card", "Card"],
  ["bank_transfer", "Bank transfer"],
  ["cheque", "Cheque"],
  ["other", "Other"],
];

function PaymentCollectionModal({
  total,
  onClose,
  onConfirm,
  title = "Complete Sale",
  totalLabel = "Sale total",
  requirePayment = false,
  isSaving = false,
  error = "",
}) {
  const [payments, setPayments] = useState(() => [
    { amount: total.toFixed(2), paymentMethod: "cash" },
  ]);
  const paid = payments.reduce(
    (sum, payment) => sum + Math.round(Number(payment.amount || 0) * 100),
    0,
  );
  const totalCents = Math.round(total * 100);
  const hasInvalidAmount = payments.some(
    (payment) =>
      payment.amount === "" ||
      !Number.isFinite(Number(payment.amount)) ||
      Number(payment.amount) <= 0,
  );
  const canSubmit =
    !isSaving &&
    paid <= totalCents &&
    !hasInvalidAmount &&
    (!requirePayment || payments.length > 0);

  const updatePayment = (index, field, value) => {
    setPayments((current) =>
      current.map((payment, paymentIndex) =>
        paymentIndex === index ? { ...payment, [field]: value } : payment,
      ),
    );
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    onConfirm(
      payments
        .filter((payment) => Number(payment.amount) > 0)
        .map((payment) => ({
          amount: Number(payment.amount).toFixed(2),
          payment_method: payment.paymentMethod,
        })),
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4">
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close payment dialog"
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={17} />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="rounded-md bg-slate-50 px-4 py-4">
            <p className="text-xs text-slate-500">
              {requirePayment ? "Outstanding amount" : totalLabel}
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              ₹{total.toFixed(2)}
            </p>
          </div>

          {payments.map((payment, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-md border border-slate-200 p-3 sm:grid-cols-[1fr_1fr_auto]"
            >
              <label className="text-xs font-medium text-slate-600">
                Amount
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={total.toFixed(2)}
                  value={payment.amount}
                  onChange={(event) =>
                    updatePayment(index, "amount", event.target.value)
                  }
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-normal"
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Method
                <select
                  value={payment.paymentMethod}
                  onChange={(event) =>
                    updatePayment(index, "paymentMethod", event.target.value)
                  }
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-normal"
                >
                  {PAYMENT_METHODS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                aria-label={`Remove payment ${index + 1}`}
                onClick={() =>
                  setPayments((current) =>
                    current.filter((_, paymentIndex) => paymentIndex !== index),
                  )
                }
                disabled={requirePayment && payments.length === 1}
                className="self-end rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600 disabled:opacity-30"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          {!requirePayment && payments.length === 0 && (
            <p className="text-sm text-slate-500">
              No payment added. This sale will be unpaid/credit.
            </p>
          )}
          {paid > totalCents && (
            <p role="alert" className="text-sm text-red-600">
              Payments cannot exceed the amount due.
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                setPayments((current) => [
                  ...current,
                  { amount: "", paymentMethod: "cash" },
                ])
              }
              className="inline-flex items-center gap-1 rounded-md px-2 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Plus size={16} />
              Add payment
            </button>
            <div className="text-right text-sm">
              <p className="text-slate-500">
                Paid: ₹{(paid / 100).toFixed(2)}
              </p>
              <p className="font-medium text-slate-900">
                Remaining: ₹{(Math.max(0, totalCents - paid) / 100).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-md border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSaving
                ? "Saving…"
                : requirePayment
                  ? "Record payment"
                  : "Complete sale"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentCollectionModal;
