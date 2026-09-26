import ContactManager from "../shared/ContactManager";

const supplierConfig = {
  title: "Suppliers",
  label: "Supplier",
  endpoint: "suppliers",
  idField: "supplier_id",
  fields: [
    { name: "name", label: "Supplier name", required: true, maxLength: 200 },
    { name: "supplier_type", label: "Supplier type", maxLength: 100 },
    { name: "phone", label: "Phone", maxLength: 30, autoComplete: "tel" },
    { name: "email", label: "Email", type: "email", maxLength: 254, autoComplete: "email" },
    { name: "gstin", label: "GSTIN", maxLength: 15 },
    { name: "payment_terms", label: "Payment terms", maxLength: 50 },
    { name: "address", label: "Address", multiline: true },
  ],
  columns: [
    { name: "name", label: "Supplier" },
    { name: "supplier_type", label: "Type" },
    { name: "phone", label: "Phone" },
    { name: "email", label: "Email" },
    { name: "gstin", label: "GSTIN" },
  ],
};

function Suppliers() {
  return <ContactManager config={supplierConfig} />;
}

export default Suppliers;