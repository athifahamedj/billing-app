function InvoiceSettings({ settings, onChange }) {
  const options = [
    {
      key: "showGstBreakup",
      label: "Show GST breakup",
      description: "Display tax details on the invoice.",
    },
    {
      key: "showDiscount",
      label: "Show discount",
      description: "Display discount information on the invoice.",
    },
    {
      key: "showSavings",
      label: "Show savings",
      description: "Display the customer's savings on the invoice.",
    },
    {
      key: "showCustomerPhone",
      label: "Show customer phone",
      description: "Include the customer's phone number.",
    },
  ];

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Invoice
        </h3>

        <p className="mt-1 text-xs text-slate-500">
          Choose what information appears on printed invoices.
        </p>
      </div>

      <div className="divide-y divide-slate-100">
        {options.map((option) => (
          <label
            key={option.key}
            className="flex cursor-pointer items-center justify-between px-5 py-4"
          >
            <div>
              <p className="text-sm font-medium text-slate-700">
                {option.label}
              </p>

              <p className="mt-0.5 text-xs text-slate-400">
                {option.description}
              </p>
            </div>

            <input
              type="checkbox"
              checked={settings[option.key]}
              onChange={(event) =>
                onChange({
                  [option.key]: event.target.checked,
                })
              }
              className="h-4 w-4 accent-slate-900"
            />
          </label>
        ))}
      </div>
    </section>
  );
}

export default InvoiceSettings;