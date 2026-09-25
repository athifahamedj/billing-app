import { useState } from "react";

import CustomerToolbar from "./components/CustomerToolbar";
import CustomerTable from "./components/CustomerTable";
import CustomerDetails from "./components/CustomerDetails";

import sales from "../../../data/mock/sales_mock.json";
import initialPayments from "../../../data/mock/customer_payments_mock.json";

function Customers() {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [payments, setPayments] = useState(initialPayments);

  const handleReceivePayment = (payment) => {
    setPayments((currentPayments) => [
      ...currentPayments,
      payment,
    ]);
  };

  if (selectedCustomer) {
    return (
      <CustomerDetails
        customer={selectedCustomer}
        sales={sales}
        payments={payments}
        onBack={() => setSelectedCustomer(null)}
        onReceivePayment={handleReceivePayment}
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          Customers
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Manage customers and their outstanding balances.
        </p>
      </div>

      <div className="space-y-6">
        <CustomerToolbar />

        <CustomerTable
          onSelectCustomer={setSelectedCustomer}
        />
      </div>
    </div>
  );
}

export default Customers;