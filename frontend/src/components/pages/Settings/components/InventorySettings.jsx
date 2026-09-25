function InventorySettings({ settings, onChange }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Inventory
        </h3>

        <p className="mt-1 text-xs text-slate-500">
          Configure stock monitoring preferences.
        </p>
      </div>

      <div className="space-y-1">
        <label className="flex cursor-pointer items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm font-medium text-slate-700">
              Low-stock alerts
            </p>

            <p className="mt-0.5 text-xs text-slate-400">
              Notify when products reach their reorder level.
            </p>
          </div>

          <input
            type="checkbox"
            checked={settings.lowStockAlerts}
            onChange={(event) =>
              onChange({
                lowStockAlerts: event.target.checked,
              })
            }
            className="h-4 w-4 accent-slate-900"
          />
        </label>

        <div className="border-t border-slate-100 px-5 py-4">
          <label className="mb-1.5 block text-xs font-medium text-slate-600">
            Default Reorder Level
          </label>

          <input
            type="number"
            min="0"
            value={settings.defaultReorderLevel}
            onChange={(event) =>
              onChange({
                defaultReorderLevel: Number(event.target.value),
              })
            }
            className="h-10 w-32 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
          />
        </div>

        <label className="flex cursor-pointer items-center justify-between border-t border-slate-100 px-5 py-4">
          <div>
            <p className="text-sm font-medium text-slate-700">
              Out-of-stock alerts
            </p>

            <p className="mt-0.5 text-xs text-slate-400">
              Notify when a product has no available stock.
            </p>
          </div>

          <input
            type="checkbox"
            checked={settings.outOfStockAlerts}
            onChange={(event) =>
              onChange({
                outOfStockAlerts: event.target.checked,
              })
            }
            className="h-4 w-4 accent-slate-900"
          />
        </label>
      </div>
    </section>
  );
}

export default InventorySettings;