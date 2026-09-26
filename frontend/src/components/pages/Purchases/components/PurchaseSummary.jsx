function PurchaseSummary({ items = [], disabled, isSaving }) {
  const subtotal = items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const gst = items.reduce((total, item) => {
    const amount = item.price * item.quantity;
    const gstRate = Number(item.gstRate || 0);

    return total + (amount * gstRate) / 100;
  }, 0);

  const total = subtotal + gst;

  return (
    <section className="h-fit rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Purchase Summary
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
              GST
            </span>

            <span className="text-slate-900">
              ₹{gst.toFixed(2)}
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
          type="submit"
          disabled={disabled}
          className="mt-6 h-11 w-full rounded-md bg-slate-900 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSaving ? "Saving draft…" : "Save purchase draft"}
        </button>
      </div>
    </section>
  );
}

export default PurchaseSummary;