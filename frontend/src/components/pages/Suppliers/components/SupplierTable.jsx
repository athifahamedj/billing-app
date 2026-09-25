import suppliers from "../../../../data/mock/suppliers_mock.json";

function SupplierTable() {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="px-5 py-3 font-medium">Supplier</th>
              <th className="px-3 py-3 font-medium">Phone</th>
              <th className="px-3 py-3 text-right font-medium">
                Outstanding
              </th>
              <th className="px-3 py-3 text-right font-medium">
                Status
              </th>
            </tr>
          </thead>

          <tbody>
            {suppliers.map((supplier) => (
              <tr
                key={supplier.id}
                className="border-b border-slate-100 last:border-0"
              >
                <td className="px-5 py-4 font-medium text-slate-800">
                  {supplier.name}
                </td>

                <td className="px-3 py-4 text-slate-500">
                  {supplier.phone}
                </td>

                <td className="px-3 py-4 text-right font-medium text-slate-800">
                  ₹{supplier.outstandingAmount.toFixed(2)}
                </td>

                <td className="px-3 py-4 text-right">
                  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {supplier.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default SupplierTable;