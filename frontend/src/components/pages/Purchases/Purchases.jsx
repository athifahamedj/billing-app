import SupplierSection from "./components/SupplierSection";
import PurchaseDetails from "./components/PurchaseDetails";
import ProductSearch from "./components/ProductSearch";
import PurchaseItems from "./components/PurchaseItems";
import PurchaseSummary from "./components/PurchaseSummary";

function Purchases() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          New Purchase
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Record stock received from a supplier.
        </p>
      </div>

      <div className="space-y-6">
        <SupplierSection />

        <PurchaseDetails />

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <ProductSearch />
            <PurchaseItems />
          </div>

          <PurchaseSummary />
        </div>
      </div>
    </div>
  );
}

export default Purchases;