import { CreditCard } from "lucide-react";

import settingsMock from "../../../../data/mock/settings_mock.json";

function BillSummary({ subtotal, onCompleteSale }) {
  const gstRate = settingsMock.billing.defaultGstRate;

  const gstAmount = subtotal * (gstRate / 100);
  const total = subtotal + gstAmount;

  return (
    <section className="h-fit rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Bill Summary
        </h3>
      </div>

      <div className="p-5">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">
              Subtotal
            </span>

            <span className="text-slate-900">
              ₹{subtotal.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500">
              Discount
            </span>

            <span className="text-slate-900">
              ₹0.00
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500">
              GST ({gstRate}%)
            </span>

            <span className="text-slate-900">
              ₹{gstAmount.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="my-5 border-t border-slate-200" />

        <div className="flex items-center justify-between">
          <span className="font-medium text-slate-700">
            Total
          </span>

          <span className="text-xl font-semibold text-slate-900">
            ₹{total.toFixed(2)}
          </span>
        </div>

                <button
                type="button"
                disabled={subtotal === 0}
                onClick={onCompleteSale}
                className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-slate-900 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <CreditCard size={17} />
                Complete Sale
        </button>
      </div>
    </section>
  );
}

export default BillSummary;