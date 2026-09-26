import { useCallback, useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";

import { useAuth } from "../../../contexts/useAuth";
import { apiRequest } from "../../../lib/api";
import InventoryTable from "./components/InventoryTable";
import ProductForm from "./components/ProductForm";

function Inventory() {
  const { activeShopId } = useAuth();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [editingProduct, setEditingProduct] = useState(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProducts = useCallback(async (signal) => {
    if (!activeShopId) {
      setProducts([]);
      setIsLoading(false);
      setError("");
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (includeInactive) params.set("include_inactive", "true");
      const query = params.size ? `?${params.toString()}` : "";
      const result = await apiRequest(`/products${query}`, {
        shopId: activeShopId,
        signal,
      });
      setProducts(result);
      setError("");
    } catch (requestError) {
      if (requestError.name !== "AbortError") setError(requestError.message);
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [activeShopId, includeInactive, search]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(
      () => loadProducts(controller.signal),
      search ? 250 : 0,
    );
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadProducts, search]);

  const saveProduct = async (productData) => {
    const isEditing = Boolean(editingProduct);
    await apiRequest(
      isEditing ? `/products/${editingProduct.product_id}` : "/products",
      {
        method: isEditing ? "PUT" : "POST",
        shopId: activeShopId,
        body: JSON.stringify(productData),
      },
    );
    setEditingProduct(undefined);
    await loadProducts();
  };

  const deactivateProduct = async (product) => {
    if (!window.confirm(`Deactivate "${product.name}"?`)) return;
    setError("");
    try {
      await apiRequest(`/products/${product.product_id}`, {
        method: "DELETE",
        shopId: activeShopId,
      });
      await loadProducts();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Products
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage products and pricing for this shop.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditingProduct(null)}
          disabled={!activeShopId}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          <Plus size={16} />
          Add product
        </button>
      </div>

      <section className="mb-5 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, part number, category or company"
              className="h-10 w-full rounded-md border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(event) => setIncludeInactive(event.target.checked)}
              className="rounded border-slate-300"
            />
            Show deactivated
          </label>
        </div>
      </section>

      {error && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {error}
        </p>
      )}

      <InventoryTable
        products={products}
        isLoading={isLoading}
        onEdit={(product) => setEditingProduct(product)}
        onDeactivate={deactivateProduct}
      />

      {editingProduct !== undefined && (
        <ProductForm
          product={editingProduct}
          onClose={() => setEditingProduct(undefined)}
          onSave={saveProduct}
        />
      )}
    </div>
  );
}

export default Inventory;