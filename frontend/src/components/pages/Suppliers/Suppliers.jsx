import SupplierToolbar from "./components/SupplierToolbar";
import SupplierTable from "./components/SupplierTable";

function Suppliers() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          Suppliers
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Manage suppliers and purchase-related balances.
        </p>
      </div>

      <div className="space-y-6">
        <SupplierToolbar />
        <SupplierTable />
      </div>
    </div>
  );
}

export default Suppliers;