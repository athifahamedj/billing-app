function Dashboard() {
  return (
    <div className="mx-auto max-w-7xl">
      {/* Page heading */}
      <div className="mb-7">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          Dashboard
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Overview of your shop.
        </p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Today's Sales</p>

          <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            ₹0
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Bills Today</p>

          <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            0
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Low Stock</p>

          <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            0
          </p>
        </div>
      </div>

      {/* Lower section */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Recent Sales
            </h3>
          </div>

          <div className="flex min-h-40 items-center justify-center px-5">
            <p className="text-sm text-slate-400">
              No sales yet
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Low Stock
            </h3>
          </div>

          <div className="flex min-h-40 items-center justify-center px-5">
            <p className="text-sm text-slate-400">
              No low-stock items
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Dashboard;