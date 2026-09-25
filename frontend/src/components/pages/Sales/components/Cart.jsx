import { Minus, Plus, Trash2 } from "lucide-react";

function Cart({ items, onUpdateQuantity, onRemove }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Items
        </h3>
      </div>

      {items.length === 0 ? (
        <div className="flex min-h-32 items-center justify-center px-5 py-8 text-center">
          <div>
            <p className="text-sm font-medium text-slate-600">
              No products added
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Search for a product or scan its barcode to add an item.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-3 py-3 font-medium">Rate</th>
                <th className="px-3 py-3 font-medium">Qty</th>
                <th className="px-3 py-3 text-right font-medium">
                  Amount
                </th>
                <th className="w-10 px-3 py-3" />
              </tr>
            </thead>

            <tbody>
              {items.map((item) => (
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
                    <div className="flex w-fit items-center rounded-md border border-slate-200">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateQuantity(
                            item.id,
                            item.quantity - 1
                          )
                        }
                        className="p-1.5 text-slate-500 hover:text-slate-900"
                      >
                        <Minus size={14} />
                      </button>

                      <span className="min-w-8 text-center text-sm">
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
                        className="p-1.5 text-slate-500 hover:text-slate-900"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </td>

                  <td className="px-3 py-4 text-right font-medium text-slate-800">
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </td>

                  <td className="px-3 py-4">
                    <button
                      type="button"
                      onClick={() => onRemove(item.id)}
                      className="text-slate-400 transition hover:text-slate-900"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default Cart;