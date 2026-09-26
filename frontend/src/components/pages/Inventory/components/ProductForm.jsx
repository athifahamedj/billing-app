import { useState } from "react";
import { X } from "lucide-react";

const requiredFields = [
  { name: "name", label: "Product name", maxLength: 255 },
  { name: "part_number", label: "Part number", maxLength: 100 },
  { name: "unit", label: "Unit", maxLength: 30 },
  { name: "mrp", label: "MRP", type: "number" },
  { name: "purchase_price", label: "Purchase price", type: "number" },
  { name: "selling_price", label: "Selling price", type: "number" },
];

const optionalFields = [
  { name: "category", label: "Category", maxLength: 100 },
  { name: "company", label: "Company", maxLength: 150 },
  { name: "gst_rate", label: "GST rate (%)", type: "number" },
  { name: "short_name", label: "Barcode / short name", maxLength: 255 },
];

function getInitialForm(product) {
  return {
    name: product?.name || "",
    part_number: product?.part_number || "",
    unit: product?.unit || "Nos",
    mrp: product?.mrp ?? "",
    purchase_price: product?.purchase_price ?? "",
    selling_price: product?.selling_price ?? "",
    category: product?.category || "",
    company: product?.company || "",
    gst_rate: product?.gst_rate ?? "",
    short_name: product?.short_name || "",
  };
}

function ProductForm({ product, onClose, onSave }) {
  const [form, setForm] = useState(() => getInitialForm(product));
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    try {
      await onSave({
        ...form,
        mrp: Number(form.mrp),
        purchase_price: Number(form.purchase_price),
        selling_price: Number(form.selling_price),
        gst_rate: form.gst_rate === "" ? null : Number(form.gst_rate),
      });
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const renderField = ({ name, label, type = "text", maxLength }) => (
    <div key={name}>
      <label
        htmlFor={`product-${name}`}
        className="mb-1.5 block text-xs font-medium text-slate-600"
      >
        {label}
      </label>
      <input
        id={`product-${name}`}
        name={name}
        type={type}
        required={requiredFields.some((field) => field.name === name)}
        min={type === "number" ? 0 : undefined}
        max={name === "gst_rate" ? 100 : undefined}
        step={type === "number" ? "0.01" : undefined}
        maxLength={maxLength}
        value={form[name]}
        onChange={updateField}
        className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
      />
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-form-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3
              id="product-form-title"
              className="text-base font-semibold text-slate-900"
            >
              {product ? "Edit product" : "Add product"}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Stock is tracked separately through inventory movements.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            disabled={isSaving}
            className="rounded p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {requiredFields.map(renderField)}
            {optionalFields.map(renderField)}
          </div>
          {error && (
            <p role="alert" className="px-5 pb-2 text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="h-10 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {isSaving ? "Saving…" : "Save product"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default ProductForm;
