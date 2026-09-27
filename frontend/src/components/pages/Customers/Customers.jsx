import ContactManager from "../shared/ContactManager";

const customerConfig = {
  title: "Customers",
  label: "Customer",
  endpoint: "customers",
  idField: "customer_id",
  ledgerType: "customer",
  fields: [
    { name: "name", label: "Customer name", required: true, maxLength: 200 },
    { name: "customer_type", label: "Customer type", maxLength: 50 },
    { name: "phone", label: "Phone", maxLength: 30, autoComplete: "tel" },
    { name: "email", label: "Email", type: "email", maxLength: 254, autoComplete: "email" },
    { name: "gstin", label: "GSTIN", maxLength: 15 },
    { name: "address", label: "Address", multiline: true },
  ],
  columns: [
    { name: "name", label: "Customer" },
    { name: "customer_type", label: "Type" },
    { name: "phone", label: "Phone" },
    { name: "email", label: "Email" },
    { name: "gstin", label: "GSTIN" },
  ],
};

function Customers() {
  return <ContactManager config={customerConfig} />;
}

export default Customers;