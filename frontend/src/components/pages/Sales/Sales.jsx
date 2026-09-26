import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../../../contexts/useAuth";
import { apiRequest } from "../../../lib/api";
import { useProducts } from "../../../lib/useProducts";
import BillSummary from "./components/BillSummary";
import Cart from "./components/Cart";
import CustomerSection from "./components/CustomerSection";
import PaymentModal from "./components/PaymentModal";
import ProductSearch from "./components/ProductSearch";

function Sales() {
  const { activeShopId } = useAuth();
  const {
    products,
    isLoading: areProductsLoading,
    error: productsError,
  } = useProducts();
  const [customers, setCustomers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [sales, setSales] = useState([]);
  const [loadedShopId, setLoadedShopId] = useState(null);
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");

  const loadShopData = useCallback(async (signal) => {
    if (!activeShopId) {
      setCustomers([]);
      setInventory([]);
      setSales([]);
      setLoadedShopId(null);
      return;
    }
    try {
      const [customerList, inventoryList, saleList] = await Promise.all([
        apiRequest("/customers", { shopId: activeShopId, signal }),
        apiRequest("/inventory", { shopId: activeShopId, signal }),
        apiRequest("/sales", { shopId: activeShopId, signal }),
      ]);
      setCustomers(customerList);
      setInventory(inventoryList);
      setSales(saleList);
      setLoadedShopId(activeShopId);
      setHistoryError("");
    } catch (loadError) {
      if (loadError.name !== "AbortError") {
        setCustomers([]);
        setInventory([]);
        setSales([]);
        setLoadedShopId(activeShopId);
        setHistoryError(loadError.message);
      }
    }
  }, [activeShopId]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(
      () => loadShopData(controller.signal),
      0,
    );
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadShopData]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCart([]);
      setSelectedCustomer(null);
      setIsPaymentOpen(false);
      setPaymentTarget(null);
      setError("");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeShopId]);

  const inventoryById = new Map(
    inventory.map((item) => [item.product_id, item.quantity_on_hand]),
  );
  const salesProducts = products.map((product) => ({
    id: product.product_id,
    name: product.name,
    code: product.part_number,
    price: Number(product.selling_price),
    gstRate: Number(product.gst_rate || 0),
    available: inventoryById.get(product.product_id) || 0,
  }));

  const addToCart = (product) => {
    if (product.available <= 0) return;
    setCart((currentCart) => {
      const existingProduct = currentCart.find(
        (item) => item.id === product.id,
      );
      if (existingProduct) {
        if (existingProduct.quantity >= product.available) return currentCart;
        return currentCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...currentCart, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      setCart((currentCart) =>
        currentCart.filter((item) => item.id !== productId),
      );
      return;
    }
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === productId
          ? { ...item, quantity: Math.min(quantity, item.available) }
          : item,
      ),
    );
  };

  const removeFromCart = (productId) => {
    setCart((currentCart) =>
      currentCart.filter((item) => item.id !== productId),
    );
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + Math.round(item.price * 100) * item.quantity,
    0,
  ) / 100;
  const gstAmount = cart.reduce((sum, item) => {
    const lineSubtotalCents = Math.round(item.price * 100) * item.quantity;
    return sum + Math.round(lineSubtotalCents * item.gstRate / 100);
  }, 0) / 100;
  const total = subtotal + gstAmount;

  const refreshShopData = async () => {
    await loadShopData();
  };

  const handleCompleteSale = () => {
    if (cart.length === 0 || !activeShopId) return;
    setError("");
    setIsPaymentOpen(true);
  };

  const handleConfirmSale = async (payments) => {
    setIsSaving(true);
    setError("");
    try {
      await apiRequest("/sales", {
        method: "POST",
        shopId: activeShopId,
        body: JSON.stringify({
          customer_id: selectedCustomer?.customer_id || null,
          items: cart.map((item) => ({
            product_id: item.id,
            quantity: item.quantity,
          })),
          payments,
        }),
      });
      setCart([]);
      setSelectedCustomer(null);
      setIsPaymentOpen(false);
      await refreshShopData();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const openPaymentDialog = (sale) => {
    setError("");
    setPaymentTarget(sale);
  };

  const handleAddPayments = async (payments) => {
    if (!paymentTarget) return;
    setIsSaving(true);
    setError("");
    try {
      await apiRequest(`/sales/${paymentTarget.sale_id}/payments`, {
        method: "POST",
        shopId: activeShopId,
        body: JSON.stringify({ payments }),
      });
      setPaymentTarget(null);
      await refreshShopData();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const voidPayment = async (payment) => {
    const reason = window.prompt("Why is this payment being reversed?");
    if (reason === null) return;
    if (!reason.trim()) {
      setHistoryError("A reason is required to reverse a payment.");
      return;
    }
    setHistoryError("");
    try {
      await apiRequest(`/payments/${payment.payment_id}/void`, {
        method: "POST",
        shopId: activeShopId,
        body: JSON.stringify({ reason }),
      });
      await refreshShopData();
    } catch (requestError) {
      setHistoryError(requestError.message);
    }
  };

  const voidSale = async (sale) => {
    if (!window.confirm(`Void sale ${sale.invoice_number}?`)) return;
    setHistoryError("");
    try {
      await apiRequest(`/sales/${sale.sale_id}/void`, {
        method: "POST",
        shopId: activeShopId,
      });
      await refreshShopData();
    } catch (requestError) {
      setHistoryError(requestError.message);
    }
  };

  const visibleSales = loadedShopId === activeShopId ? sales : [];
  const visibleCustomers = loadedShopId === activeShopId ? customers : [];
  const isLoadingHistory = Boolean(activeShopId) && loadedShopId !== activeShopId;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section>
        <div className="mb-6">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            New Sale
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Create a bill, deduct stock, and record zero or more payments.
          </p>
        </div>

        {error && !paymentTarget && (
          <p role="alert" className="mb-4 text-sm text-red-600">
            {error}
          </p>
        )}
        {productsError && (
          <p role="alert" className="mb-4 text-sm text-red-600">
            Could not load shop products: {productsError}
          </p>
        )}
        {areProductsLoading && (
          <p role="status" className="mb-4 text-sm text-slate-500">
            Loading products…
          </p>
        )}

        <div className="space-y-6">
          <CustomerSection
            customers={visibleCustomers}
            selectedCustomer={selectedCustomer}
            onSelectCustomer={setSelectedCustomer}
          />

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <ProductSearch products={salesProducts} onAddProduct={addToCart} />
              <Cart
                items={cart}
                onUpdateQuantity={updateQuantity}
                onRemove={removeFromCart}
              />
            </div>
            <BillSummary
              subtotal={subtotal}
              gstAmount={gstAmount}
              total={total}
              disabled={
                !activeShopId ||
                isSaving ||
                areProductsLoading ||
                loadedShopId !== activeShopId
              }
              onCompleteSale={handleCompleteSale}
            />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-900">Sales history</h3>
          <p className="mt-1 text-xs text-slate-500">
            Payments are listed individually. Reverse recorded payments before voiding a sale.
          </p>
        </div>
        {historyError && (
          <p role="alert" className="px-5 pt-4 text-sm text-red-600">
            {historyError}
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">Invoice / Date</th>
                <th className="px-4 py-3 font-medium">Customer / Items</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Payment status</th>
                <th className="px-4 py-3 font-medium">Payments / Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingHistory ? (
                <tr>
                  <td colSpan="5" className="px-5 py-8 text-center text-slate-500">
                    Loading sales…
                  </td>
                </tr>
              ) : visibleSales.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-8 text-center text-slate-500">
                    No sales yet.
                  </td>
                </tr>
              ) : (
                visibleSales.map((sale) => {
                  const hasRecordedPayments = sale.payments.some(
                    (payment) => payment.status === "recorded",
                  );
                  return (
                    <tr
                      key={sale.sale_id}
                      className="border-b border-slate-100 align-top last:border-0"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">{sale.invoice_number}</p>
                        <p className="text-xs text-slate-500">{sale.sale_date}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{sale.customer_name || "Walk-in customer"}</p>
                        <div className="mt-1 text-xs text-slate-500">
                          {sale.items.map((item) => (
                            <div key={item.sale_item_id}>
                              {item.product_name} × {item.quantity}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        ₹{Number(sale.total_amount).toFixed(2)}
                        <div className="mt-1 text-xs text-slate-500">
                          Paid ₹{Number(sale.paid_amount).toFixed(2)}
                        </div>
                        <div className="text-xs text-slate-500">
                          Due ₹{Number(sale.outstanding_amount).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs capitalize">
                          {sale.status === "void"
                            ? "void"
                            : sale.payment_status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="min-w-64 px-4 py-3">
                        {sale.payments.length > 0 ? (
                          <div className="space-y-2">
                            {sale.payments.map((payment) => (
                              <div
                                key={payment.payment_id}
                                className="flex items-start justify-between gap-3 text-xs"
                              >
                                <div>
                                  <span className="font-medium">
                                    ₹{Number(payment.amount).toFixed(2)}
                                  </span>{" "}
                                  <span className="capitalize">
                                    {payment.payment_method.replace("_", " ")}
                                  </span>{" "}
                                  <span className="text-slate-500">
                                    ({payment.status})
                                  </span>
                                  {payment.void_reason && (
                                    <p className="text-slate-500">
                                      {payment.void_reason}
                                    </p>
                                  )}
                                </div>
                                {payment.status === "recorded" &&
                                  sale.status === "completed" && (
                                    <button
                                      type="button"
                                      onClick={() => voidPayment(payment)}
                                      className="whitespace-nowrap text-red-700 hover:underline"
                                    >
                                      Reverse payment
                                    </button>
                                  )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">
                            No payments recorded
                          </span>
                        )}
                        {sale.status === "completed" && (
                          <div className="mt-3 flex flex-wrap gap-3">
                            {Number(sale.outstanding_amount) > 0 && (
                              <button
                                type="button"
                                onClick={() => openPaymentDialog(sale)}
                                className="text-xs font-medium text-blue-700 hover:underline"
                              >
                                Record payment
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={hasRecordedPayments}
                              title={
                                hasRecordedPayments
                                  ? "Reverse all recorded payments first."
                                  : undefined
                              }
                              onClick={() => voidSale(sale)}
                              className="text-xs font-medium text-red-700 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Void sale
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isPaymentOpen && (
        <PaymentModal
          total={total}
          onClose={() => setIsPaymentOpen(false)}
          onConfirm={handleConfirmSale}
          isSaving={isSaving}
          error={error}
        />
      )}
      {paymentTarget && (
        <PaymentModal
          key={paymentTarget.sale_id}
          title={`Record payment · ${paymentTarget.invoice_number}`}
          total={Number(paymentTarget.outstanding_amount)}
          requirePayment
          onClose={() => setPaymentTarget(null)}
          onConfirm={handleAddPayments}
          isSaving={isSaving}
          error={error}
        />
      )}
    </div>
  );
}

export default Sales;
