import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../../../contexts/useAuth";
import { apiRequest } from "../../../lib/api";
import { useProducts } from "../../../lib/useProducts";
import ProductSearch from "./components/ProductSearch";
import PurchaseItems from "./components/PurchaseItems";
import PurchaseSummary from "./components/PurchaseSummary";

function getToday() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function Purchases() {
  const { activeShopId } = useAuth();
  const {
    products,
    isLoading: areProductsLoading,
    error: productsError,
  } = useProducts();
  const [suppliers, setSuppliers] = useState([]);
  const [loadedShopId, setLoadedShopId] = useState(null);
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(getToday);
  const [purchaseItems, setPurchaseItems] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const loadPurchases = useCallback(async (signal) => {
    if (!activeShopId) {
      setPurchases([]);
      return;
    }
    try {
      const [supplierList, purchaseList] = await Promise.all([
        apiRequest("/suppliers", { shopId: activeShopId, signal }),
        apiRequest("/purchases", { shopId: activeShopId, signal }),
      ]);
      setSuppliers(supplierList);
      setSupplierId((current) =>
        supplierList.some((supplier) => supplier.supplier_id === current)
          ? current
          : supplierList[0]?.supplier_id || "",
      );
      setPurchases(purchaseList);
      setLoadedShopId(activeShopId);
      setError("");
    } catch (loadError) {
      if (loadError.name !== "AbortError") {
        setLoadedShopId(activeShopId);
        setError(loadError.message);
      }
    }
  }, [activeShopId]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(
      () => loadPurchases(controller.signal),
      0,
    );
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadPurchases]);

  const purchaseProducts = products.map((product) => ({
    id: product.product_id,
    name: product.name,
    code: product.part_number,
    price: Number(product.purchase_price),
    gstRate: Number(product.gst_rate || 0),
  }));

  const addToPurchase = (product) => {
    setPurchaseItems((items) => {
      const existing = items.find((item) => item.id === product.id);
      if (existing) {
        return items.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...items, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      setPurchaseItems((items) => items.filter((item) => item.id !== productId));
      return;
    }
    setPurchaseItems((items) =>
      items.map((item) =>
        item.id === productId ? { ...item, quantity } : item,
      ),
    );
  };

  const saveDraft = async (event) => {
    event.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      await apiRequest("/purchases", {
        method: "POST",
        shopId: activeShopId,
        body: JSON.stringify({
          supplier_id: supplierId,
          invoice_number: invoiceNumber,
          purchase_date: purchaseDate,
          items: purchaseItems.map((item) => ({
            product_id: item.id,
            quantity: item.quantity,
            unit_price: item.price,
            discount_amount: 0,
            gst_rate: item.gstRate,
          })),
        }),
      });
      setInvoiceNumber("");
      setPurchaseItems([]);
      await loadPurchases();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const changePurchaseStatus = async (purchase, action) => {
    const verb = action === "receive" ? "receive" : "void";
    if (action === "void" && !window.confirm(`Void invoice ${purchase.invoice_number}?`)) {
      return;
    }
    setError("");
    try {
      await apiRequest(`/purchases/${purchase.purchase_id}/${action}`, {
        method: "POST",
        shopId: activeShopId,
      });
      await loadPurchases();
    } catch (requestError) {
      setError(requestError.message || `Could not ${verb} purchase.`);
    }
  };

  const visibleSuppliers =
    loadedShopId === activeShopId ? suppliers : [];
  const visiblePurchases =
    loadedShopId === activeShopId ? purchases : [];
  const purchaseReady =
    Boolean(activeShopId) &&
    visibleSuppliers.some((supplier) => supplier.supplier_id === supplierId) &&
    Boolean(invoiceNumber.trim()) &&
    Boolean(purchaseDate) &&
    purchaseItems.length > 0;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          Purchases
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Save supplier invoices as drafts, then receive stock into inventory.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {productsError && (
        <p role="alert" className="text-sm text-red-600">
          Could not load shop products: {productsError}
        </p>
      )}
      {areProductsLoading && (
        <p role="status" className="text-sm text-slate-500">
          Loading products…
        </p>
      )}

      <form onSubmit={saveDraft} className="space-y-5">
        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Supplier and invoice
            </h3>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-3">
            <div>
              <label
                htmlFor="purchase-supplier"
                className="mb-1.5 block text-xs font-medium text-slate-600"
              >
                Supplier
              </label>
              <select
                id="purchase-supplier"
                required
                value={supplierId}
                onChange={(event) => setSupplierId(event.target.value)}
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="">Select supplier</option>
                {visibleSuppliers.map((supplier) => (
                  <option
                    key={supplier.supplier_id}
                    value={supplier.supplier_id}
                  >
                    {supplier.name}
                  </option>
                ))}
              </select>
              {visibleSuppliers.length === 0 && loadedShopId === activeShopId && (
                <p className="mt-1 text-xs text-amber-700">
                  Add an active supplier before creating a purchase.
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="invoice-number"
                className="mb-1.5 block text-xs font-medium text-slate-600"
              >
                Supplier invoice number
              </label>
              <input
                id="invoice-number"
                required
                maxLength={50}
                value={invoiceNumber}
                onChange={(event) => setInvoiceNumber(event.target.value)}
                className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="purchase-date"
                className="mb-1.5 block text-xs font-medium text-slate-600"
              >
                Invoice date
              </label>
              <input
                id="purchase-date"
                type="date"
                required
                value={purchaseDate}
                onChange={(event) => setPurchaseDate(event.target.value)}
                className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
              />
            </div>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className="space-y-5">
            <ProductSearch
              products={purchaseProducts}
              onAddProduct={addToPurchase}
            />
            <PurchaseItems
              items={purchaseItems}
              onUpdateQuantity={updateQuantity}
              onRemove={(productId) =>
                setPurchaseItems((items) =>
                  items.filter((item) => item.id !== productId),
                )
              }
            />
          </div>
          <PurchaseSummary
            items={purchaseItems}
            disabled={!purchaseReady || isSaving || areProductsLoading}
            isSaving={isSaving}
          />
        </div>
      </form>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Purchase history
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Invoice</th>
                <th className="px-4 py-3 font-medium">Supplier</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status / Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeShopId && loadedShopId !== activeShopId ? (
                <tr>
                  <td colSpan="6" className="px-5 py-8 text-center text-slate-500">
                    Loading purchases…
                  </td>
                </tr>
              ) : visiblePurchases.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-8 text-center text-slate-500">
                    No purchases yet.
                  </td>
                </tr>
              ) : (
                visiblePurchases.map((purchase) => (
                  <tr
                    key={purchase.purchase_id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-3">{purchase.purchase_date}</td>
                    <td className="px-4 py-3 font-medium">
                      {purchase.invoice_number}
                    </td>
                    <td className="px-4 py-3">{purchase.supplier_name}</td>
                    <td className="px-4 py-3">
                      {purchase.items.map((item) => (
                        <div key={item.purchase_item_id}>
                          {item.product_name} × {item.quantity}
                        </div>
                      ))}
                    </td>
                    <td className="px-4 py-3">
                      ₹{Number(purchase.total_amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs capitalize">
                          {purchase.status}
                        </span>
                        {purchase.status === "draft" && (
                          <button
                            type="button"
                            onClick={() =>
                              changePurchaseStatus(purchase, "receive")
                            }
                            className="rounded bg-emerald-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-800"
                          >
                            Receive stock
                          </button>
                        )}
                        {purchase.status !== "void" && (
                          <button
                            type="button"
                            onClick={() =>
                              changePurchaseStatus(purchase, "void")
                            }
                            className="rounded border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            Void
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default Purchases;
