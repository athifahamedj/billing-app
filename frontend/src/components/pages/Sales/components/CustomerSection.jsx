import { useState } from "react";

function CustomerSection({ customers, selectedCustomer, onSelectCustomer }) {
  const [search, setSearch] = useState("");

  const filteredCustomers = customers.filter((customer) =>
    `${customer.name} ${customer.phone}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const handleSearch = (value) => {
    setSearch(value);

    const exactMatch = customers.find(
      (customer) =>
        customer.name.toLowerCase() === value.toLowerCase() ||
        customer.phone === value
    );

    if (exactMatch) {
      onSelectCustomer(exactMatch);
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Customer
        </h3>
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <div className="relative">
          <label className="mb-1.5 block text-xs font-medium text-slate-600">
            Customer Name
          </label>

          <input
            type="text"
            value={selectedCustomer?.name || search}
            onChange={(event) => handleSearch(event.target.value)}
            placeholder="Walk-in customer"
            className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
          />

          {search && !selectedCustomer && filteredCustomers.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
              {filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => {
                    onSelectCustomer(customer);
                    setSearch("");
                  }}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-800">
                    {customer.name}
                  </span>

                  <span className="ml-2 text-slate-400">
                    {customer.phone}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">
            Phone Number
          </label>

          <input
            type="text"
            value={selectedCustomer?.phone || ""}
            placeholder="Optional"
            readOnly
            className="h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm outline-none placeholder:text-slate-400"
          />
        </div>
      </div>
    </section>
  );
}

export default CustomerSection;