import { useMemo, useState } from "react";

function CustomerDetails({
  customer,
  sales,
  payments,
  onBack,
  onReceivePayment,
}) {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [notes, setNotes] = useState("");

  const customerSales = useMemo(
    () =>
      sales.filter(
        (sale) =>
          sale.customerId === customer.id &&
          sale.paymentMethod === "Credit"
      ),
    [sales, customer.id]
  );

  const customerPayments = useMemo(
    () => payments.filter((payment) => payment.customerId === customer.id),
    [payments, customer.id]
  );

  const outstanding = useMemo(() => {
    const creditSales = customerSales.reduce(
      (total, sale) => total + sale.totalAmount,
      0
    );

    const paidAmount = customerPayments.reduce(
      (total, payment) => total + payment.amount,
      0
    );

    return Math.max(creditSales - paidAmount, 0);
  }, [customerSales, customerPayments]);

  const getSalePaidAmount = (saleId) => {
    return customerPayments
      .filter((payment) => payment.saleId === saleId)
      .reduce((total, payment) => total + payment.amount, 0);
  };

  const getSaleBalance = (sale) => {
    return Math.max(
      sale.totalAmount - getSalePaidAmount(sale.id),
      0
    );
  };

  const outstandingSales = customerSales.filter(
    (sale) => getSaleBalance(sale) > 0
  );

  const handleSubmitPayment = (event) => {
    event.preventDefault();

    if (!selectedSaleId || !amount) {
      return;
    }

    const sale = customerSales.find(
      (item) => item.id === selectedSaleId
    );

    if (!sale) {
      return;
    }

    const paymentAmount = Number(amount);
    const saleBalance = getSaleBalance(sale);

    if (
      !Number.isFinite(paymentAmount) ||
      paymentAmount <= 0 ||
      paymentAmount > saleBalance
    ) {
      return;
    }

    onReceivePayment({
      id: `PAY${Date.now()}`,
      customerId: customer.id,
      saleId: sale.id,
      amount: paymentAmount,
      paymentMethod,
      date: new Date().toISOString().split("T")[0],
      reference: "",
      notes,
    });

    setSelectedSaleId("");
    setAmount("");
    setPaymentMethod("Cash");
    setNotes("");
    setShowPaymentForm(false);
  };

  return (
    <div className="mx-auto max-w-7xl">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        ← Back to Customers
      </button>

      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          {customer.name}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {customer.phone}
        </p>
      </div>

      <div className="mb-6 flex items-center justify-between rounded-lg border border-slate-200 bg-white p-5">
        <div>
          <p className="text-sm text-slate-500">
            Outstanding
          </p>

          <p className="mt-1 text-2xl font-semibold text-slate-900">
            ₹{outstanding.toFixed(2)}
          </p>
        </div>

        <button
          type="button"
          disabled={outstanding <= 0}
          onClick={() => setShowPaymentForm(true)}
          className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Receive Payment
        </button>
      </div>

      {showPaymentForm && (
        <section className="mb-6 rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Receive Payment
            </h3>
          </div>

          <form
            onSubmit={handleSubmitPayment}
            className="space-y-4 p-5"
          >
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Invoice
              </label>

              <select
                value={selectedSaleId}
                onChange={(event) => setSelectedSaleId(event.target.value)}
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
              >
                <option value="">
                  Select invoice
                </option>

                {outstandingSales.map((sale) => (
                  <option key={sale.id} value={sale.id}>
                    {sale.invoiceNumber} — ₹
                    {getSaleBalance(sale).toFixed(2)} due
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  Amount
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="Enter amount"
                  className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  Payment Method
                </label>

                <select
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(event.target.value)
                  }
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Card">Card</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Notes
              </label>

              <input
                type="text"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional"
                className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPaymentForm(false)}
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Save Payment
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Outstanding Bills
            </h3>
          </div>

          {outstandingSales.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">
              No outstanding bills.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                    <th className="px-5 py-3 font-medium">
                      Invoice
                    </th>

                    <th className="px-3 py-3 font-medium">
                      Date
                    </th>

                    <th className="px-3 py-3 text-right font-medium">
                      Balance
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {outstandingSales.map((sale) => (
                    <tr
                      key={sale.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-5 py-4 font-medium text-slate-800">
                        {sale.invoiceNumber}
                      </td>

                      <td className="px-3 py-4 text-slate-500">
                        {sale.date}
                      </td>

                      <td className="px-3 py-4 text-right font-medium text-slate-800">
                        ₹{getSaleBalance(sale).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Payment History
            </h3>
          </div>

          {customerPayments.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">
              No payments recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                    <th className="px-5 py-3 font-medium">
                      Date
                    </th>

                    <th className="px-3 py-3 font-medium">
                      Method
                    </th>

                    <th className="px-3 py-3 text-right font-medium">
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {customerPayments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-5 py-4 text-slate-500">
                        {payment.date}
                      </td>

                      <td className="px-3 py-4 text-slate-600">
                        {payment.paymentMethod}
                      </td>

                      <td className="px-3 py-4 text-right font-medium text-slate-800">
                        ₹{payment.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default CustomerDetails;