function PurchaseItems() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Purchase Items
        </h3>
      </div>

      <div className="min-h-32 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="px-5 py-3 font-medium">Product</th>
              <th className="px-3 py-3 font-medium">Rate</th>
              <th className="px-3 py-3 font-medium">Qty</th>
              <th className="px-3 py-3 font-medium">GST</th>
              <th className="px-3 py-3 text-right font-medium">
                Amount
              </th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td
                colSpan="5"
                className="px-5 py-8 text-center text-sm text-slate-400"
              >
                No products added
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default PurchaseItems;