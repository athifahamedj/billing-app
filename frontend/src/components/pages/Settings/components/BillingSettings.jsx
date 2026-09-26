function BillingSettings({ settings, onChange }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Tax & Billing
        </h3>

        <p className="mt-1 text-xs text-slate-500">
          Configure default billing and tax preferences.
        </p>
      </div>

      <div className="grid gap-5 p-5 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">
            Default GST Rate
          </label>

          <div className="relative">
            <input
              type="number"
              min="0"
              max="100"
              value={settings.defaultGstRate}
              onChange={(event) =>
                onChange({
                  defaultGstRate: Number(event.target.value),
                })
              }
              className="h-10 w-full rounded-md border border-slate-200 px-3 pr-8 text-sm outline-none focus:border-slate-400"
            />

            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
              %
            </span>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">
            Tax Mode
          </label>

          <select
            value={settings.taxMode}
            onChange={(event) =>
              onChange({ taxMode: event.target.value })
            }
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
          >
            <option value="CGST_SGST">CGST + SGST</option>
            <option value="IGST">IGST</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">
            Default Discount
          </label>

          <div className="relative">
            <input
              type="number"
              min="0"
              max="100"
              value={settings.defaultDiscount}
              onChange={(event) =>
                onChange({
                  defaultDiscount: Number(event.target.value),
                })
              }
              className="h-10 w-full rounded-md border border-slate-200 px-3 pr-8 text-sm outline-none focus:border-slate-400"
            />

            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
              %
            </span>
          </div>
        </div>

        <label className="flex items-center justify-between rounded-md border border-slate-200 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-700">
              Prices include GST
            </p>

            <p className="mt-0.5 text-xs text-slate-400">
              Treat product prices as tax-inclusive.
            </p>
          </div>

          <input
            type="checkbox"
            checked={settings.pricesIncludeGst}
            onChange={(event) =>
              onChange({
                pricesIncludeGst: event.target.checked,
              })
            }
            className="h-4 w-4 accent-slate-900"
          />
        </label>
      </div>
    </section>
  );
}

export default BillingSettings;