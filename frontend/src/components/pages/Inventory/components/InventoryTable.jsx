import StockStatus from "./StockStatus";
import products from "../../../../data/mock/products_mock.json";

function getStockStatus(stock, reorderLevel) {
  if (stock === 0) {
    return "Out of Stock";
  }

  if (stock <= reorderLevel) {
    return "Low Stock";
  }

  return "In Stock";
}

function InventoryTable() {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="px-5 py-3 font-medium">Product</th>
              <th className="px-3 py-3 font-medium">Code</th>
              <th className="px-3 py-3 font-medium">Stock</th>
              <th className="px-3 py-3 font-medium">Purchase Price</th>
              <th className="px-3 py-3 font-medium">Selling Price</th>
              <th className="px-3 py-3 font-medium">Status</th>
            </tr>
          </thead>

          <tbody>
            {products.map((product) => {
              const status = getStockStatus(
                product.stockQuantity,
                product.reorderLevel
              );

              return (
                <tr
                  key={product.id}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-800">
                      {product.name}
                    </p>
                  </td>

                  <td className="px-3 py-4 text-slate-500">
                    {product.partNumber}
                  </td>

                  <td className="px-3 py-4 font-medium text-slate-800">
                    {product.stockQuantity}
                  </td>

                  <td className="px-3 py-4 text-slate-600">
                    ₹{product.purchasePrice.toFixed(2)}
                  </td>

                  <td className="px-3 py-4 text-slate-600">
                    ₹{product.sellingPrice.toFixed(2)}
                  </td>

                  <td className="px-3 py-4">
                    <StockStatus status={status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default InventoryTable;