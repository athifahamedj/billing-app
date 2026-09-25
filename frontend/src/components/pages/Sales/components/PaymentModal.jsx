import { useState } from "react";
import { X } from "lucide-react";

const PAYMENT_METHODS = ["Cash", "UPI", "Card", "Credit"];

function PaymentModal({ total, onClose, onConfirm }) {
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  const handleConfirm = () => {
    onConfirm(paymentMethod);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Complete Sale
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={17} />
          </button>
        </div>

        <div className="p-5">
          <div className="mb-6 rounded-md bg-slate-50 px-4 py-4">
            <p className="text-xs text-slate-500">
              Total amount
            </p>

            <p className="mt-1 text-2xl font-semibold text-slate-900">
              ₹{total.toFixed(2)}
            </p>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-slate-600">
              Payment Method
            </p>

            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((method) => {
                const isSelected = paymentMethod === method;

                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`rounded-md border px-3 py-2.5 text-sm font-medium transition ${
                      isSelected
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {method}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Confirm Sale
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentModal;