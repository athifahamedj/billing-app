function PurchaseItems({
  items = [],
  onUpdateQuantity,
  onRemove,
}) {
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
              <th className="px-3 py-3" />
            </tr>
          </thead>

          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan="6"
                  className="px-5 py-8 text-center text-sm text-slate-400"
                >
                  No products added
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const gstRate = Number(item.gstRate || 0);
                const amount = item.price * item.quantity;

                return (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-800">
                        {item.name}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-400">
                        {item.code}
                      </p>
                    </td>

                    <td className="px-3 py-4 text-slate-600">
                      ₹{item.price.toFixed(2)}
                    </td>

                    <td className="px-3 py-4">
                      <div className="inline-flex items-center rounded-md border border-slate-200">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity(
                              item.id,
                              item.quantity - 1
                            )
                          }
                          className="flex h-8 w-8 items-center justify-center text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                        >
                          −
                        </button>

                        <span className="flex h-8 min-w-8 items-center justify-center border-x border-slate-200 px-2 text-sm font-medium text-slate-700">
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity(
                              item.id,
                              item.quantity + 1
                            )
                          }
                          className="flex h-8 w-8 items-center justify-center text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                        >
                          +
                        </button>
                      </div>
                    </td>

                    <td className="px-3 py-4 text-slate-600">
                      {gstRate}%
                    </td>

                    <td className="px-3 py-4 text-right">
                      <span className="font-medium text-slate-800">
                        ₹{amount.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => onRemove(item.id)}
                        className="text-xs text-slate-400 transition hover:text-red-600"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default PurchaseItems;