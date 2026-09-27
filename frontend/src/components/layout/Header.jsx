import { useAuth } from "../../contexts/useAuth";

function Header() {
  const {
    user,
    shops,
    activeShop,
    activeShopId,
    selectShop,
    logout,
  } = useAuth();

  return (
    <header className="flex h-16 shrink-0 items-center justify-end border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
            MM
          </div>

          <div>
            {user?.role === "super_admin" ? (
              <select
                aria-label="Active shop"
                value={activeShopId || ""}
                onChange={(event) => selectShop(event.target.value)}
                className="max-w-48 rounded border-0 bg-transparent p-0 text-sm font-medium text-slate-800 outline-none"
              >
                <option value="" disabled>
                  Choose a shop
                </option>
                {shops.map((shop) => (
                  <option key={shop.shop_id} value={shop.shop_id}>
                    {shop.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm font-medium leading-none text-slate-800">
                {activeShop?.name || user?.shop_name || user?.display_name}
              </p>
            )}
            <p className="mt-1 text-[11px] text-slate-400">
              {user?.display_name} · {user?.role === "super_admin" ? "Super Admin" : "Shop user"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}

export default Header;