function PurchaseDetails() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Purchase Details
        </h3>
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">
            Invoice Number
          </label>

          <input
            type="text"
            placeholder="Supplier invoice number"
            className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">
            Invoice Date
          </label>

          <input
            type="date"
            className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
          />
        </div>
      </div>
    </section>
  );
}

export default PurchaseDetails;