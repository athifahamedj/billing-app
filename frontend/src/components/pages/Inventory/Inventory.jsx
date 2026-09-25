import InventoryToolbar from "./components/InventoryToolbar";
import InventoryTable from "./components/InventoryTable";

function Inventory() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          Inventory
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Manage products and stock levels.
        </p>
      </div>

      <div className="space-y-6">
        <InventoryToolbar />
        <InventoryTable />
      </div>
    </div>
  );
}

export default Inventory;