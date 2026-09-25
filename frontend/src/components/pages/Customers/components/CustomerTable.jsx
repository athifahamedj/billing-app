import customers from "../../../../data/mock/customers_mock.json";
import sales from "../../../../data/mock/sales_mock.json";
import payments from "../../../../data/mock/customer_payments_mock.json";

function getCustomerOutstanding(customerId) {
  const creditSales = sales
    .filter(
      (sale) =>
        sale.customerId === customerId &&
        sale.paymentMethod === "Credit"
    )
    .reduce((total, sale) => total + sale.totalAmount, 0);

  const customerPayments = payments
    .filter((payment) => payment.customerId === customerId)
    .reduce((total, payment) => total + payment.amount, 0);

  return Math.max(creditSales - customerPayments, 0);
}

function CustomerTable({ onSelectCustomer }) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="px-5 py-3 font-medium">
                Customer
              </th>

              <th className="px-3 py-3 font-medium">
                Phone
              </th>

              <th className="px-3 py-3 text-right font-medium">
                Outstanding
              </th>
            </tr>
          </thead>

          <tbody>
            {customers.map((customer) => {
              const outstanding = getCustomerOutstanding(
                customer.id
              );

              return (
                <tr
                  key={customer.id}
                  onClick={() => onSelectCustomer(customer)}
                  className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
                >
                  <td className="px-5 py-4 font-medium text-slate-800">
                    {customer.name}
                  </td>

                  <td className="px-3 py-4 text-slate-500">
                    {customer.phone}
                  </td>

                  <td className="px-3 py-4 text-right font-medium text-slate-800">
                    ₹{outstanding.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default CustomerTable;