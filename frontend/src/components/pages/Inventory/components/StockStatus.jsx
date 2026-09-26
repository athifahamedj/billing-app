function StockStatus({ status }) {
  const statusStyles = {
    "In Stock": "bg-slate-100 text-slate-700",
    "Low Stock": "bg-slate-200 text-slate-800",
    "Out of Stock": "bg-slate-900 text-white",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        statusStyles[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
}

export default StockStatus;