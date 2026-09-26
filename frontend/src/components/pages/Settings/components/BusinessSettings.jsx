function BusinessSettings({ settings, onChange }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Business Information
        </h3>

        <p className="mt-1 text-xs text-slate-500">
          Information used across your billing documents.
        </p>
      </div>

      <div className="grid gap-5 p-5 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">
            Business Name
          </label>

          <input
            value={settings.name}
            onChange={(event) =>
              onChange({ name: event.target.value })
            }
            className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">
            Phone Number
          </label>

          <input
            value={settings.phone}
            onChange={(event) =>
              onChange({ phone: event.target.value })
            }
            placeholder="Optional"
            className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-medium text-slate-600">
            Address
          </label>

          <textarea
            value={settings.address}
            onChange={(event) =>
              onChange({ address: event.target.value })
            }
            rows={3}
            placeholder="Business address"
            className="w-full resize-none rounded-md border border-slate-200 px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">
            GSTIN
          </label>

          <input
            value={settings.gstin}
            onChange={(event) =>
              onChange({ gstin: event.target.value.toUpperCase() })
            }
            placeholder="Optional"
            className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm uppercase outline-none placeholder:text-slate-400 focus:border-slate-400"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">
            Invoice Prefix
          </label>

          <input
            value={settings.invoicePrefix}
            onChange={(event) =>
              onChange({ invoicePrefix: event.target.value })
            }
            className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm uppercase outline-none focus:border-slate-400"
          />
        </div>
      </div>
    </section>
  );
}

export default BusinessSettings;