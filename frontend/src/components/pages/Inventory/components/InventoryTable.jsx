import { Ban, Pencil } from "lucide-react";

function InventoryTable({ products, isLoading, onEdit, onDeactivate }) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="px-5 py-3 font-medium">Product</th>
              <th className="px-3 py-3 font-medium">Part number</th>
              <th className="px-3 py-3 font-medium">Category</th>
              <th className="px-3 py-3 font-medium">Unit</th>
              <th className="px-3 py-3 font-medium">MRP</th>
              <th className="px-3 py-3 font-medium">Purchase Price</th>
              <th className="px-3 py-3 font-medium">Selling Price</th>
              <th className="px-3 py-3 font-medium">Status / Actions</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="8" className="px-5 py-10 text-center text-slate-500">
                  Loading products…
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-5 py-10 text-center text-slate-500">
                  No products found.
                </td>
              </tr>
            ) : products.map((product) => (
                <tr
                  key={product.product_id}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-800">
                      {product.name}
                    </p>
                    {product.company && (
                      <p className="mt-0.5 text-xs text-slate-400">
                        {product.company}
                      </p>
                    )}
                  </td>

                  <td className="px-3 py-4 text-slate-500">
                    {product.part_number}
                  </td>

                  <td className="px-3 py-4 text-slate-600">
                    {product.category || "—"}
                  </td>

                  <td className="px-3 py-4 text-slate-600">
                    {product.unit}
                  </td>

                  <td className="px-3 py-4 text-slate-600">
                    ₹{Number(product.mrp).toFixed(2)}
                  </td>

                  <td className="px-3 py-4 text-slate-600">
                    ₹{Number(product.purchase_price).toFixed(2)}
                  </td>

                  <td className="px-3 py-4 text-slate-600">
                    ₹{Number(product.selling_price).toFixed(2)}
                  </td>

                  <td className="px-3 py-4">
                    {product.is_active ? (
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                          Active
                        </span>
                        <button
                          type="button"
                          aria-label={`Edit ${product.name}`}
                          onClick={() => onEdit(product)}
                          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Deactivate ${product.name}`}
                          onClick={() => onDeactivate(product)}
                          className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
                        >
                          <Ban size={15} />
                        </button>
                      </div>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
                        Deactivated
                      </span>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default InventoryTable;