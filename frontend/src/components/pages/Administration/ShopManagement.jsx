import { useState } from "react";

import { useAuth } from "../../../contexts/useAuth";
import { apiRequest } from "../../../lib/api";

function ShopCard({ shop }) {
  const { removeShop } = useAuth();
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmationSlug, setConfirmationSlug] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async (event) => {
    event.preventDefault();
    setError("");
    setIsDeleting(true);

    try {
      await apiRequest(`/admin/shops/${shop.shop_id}`, {
        method: "DELETE",
        body: JSON.stringify({ slug: confirmationSlug }),
      });
      removeShop(shop.shop_id);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-medium text-slate-900">{shop.name}</h3>
          <p className="mt-1 text-sm text-slate-500">{shop.slug}</p>
        </div>
        {!isConfirming && (
          <button
            type="button"
            onClick={() => {
              setError("");
              setIsConfirming(true);
            }}
            className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
          >
            Delete shop data
          </button>
        )}
      </div>

      {isConfirming && (
        <form onSubmit={handleDelete} className="mt-5 space-y-3 border-t border-red-100 pt-4">
          <p className="text-sm text-red-800">
            This permanently deletes this shop’s login, products, customers,
            suppliers, sales and purchase invoices, payments, inventory
            history, and settings. It cannot be undone. Existing database
            backups may still contain older copies.
          </p>
          <label className="grid gap-1.5 text-xs font-medium text-slate-600">
            Type <span className="font-semibold text-slate-900">{shop.slug}</span>{" "}
            to confirm
            <input
              autoComplete="off"
              value={confirmationSlug}
              onChange={(event) => setConfirmationSlug(event.target.value)}
              className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-red-400"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsConfirming(false);
                setConfirmationSlug("");
                setError("");
              }}
              disabled={isDeleting}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isDeleting || confirmationSlug !== shop.slug}
              className="rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeleting ? "Deleting…" : "Permanently delete shop"}
            </button>
          </div>
        </form>
      )}
    </article>
  );
}

function ShopManagement() {
  const { shops } = useAuth();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          Manage shops
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Permanently remove a closed shop and its data from the application
          database.
        </p>
      </div>

      {shops.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500">
          No shops are available.
        </p>
      ) : (
        <div className="space-y-4">
          {shops.map((shop) => (
            <ShopCard key={shop.shop_id} shop={shop} />
          ))}
        </div>
      )}
    </div>
  );
}

export default ShopManagement;
