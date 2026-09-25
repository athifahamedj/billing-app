import { useState } from "react";

import CustomerSection from "./components/CustomerSection";
import ProductSearch from "./components/ProductSearch";
import Cart from "./components/Cart";
import BillSummary from "./components/BillSummary";
import PaymentModal from "./components/PaymentModal";

import customers from "../../../data/mock/customers_mock.json";
import products from "../../../data/mock/products_mock.json";
import settings from "../../../data/mock/settings_mock.json";

function Sales() {
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const salesProducts = products.map((product) => ({
    id: product.id,
    name: product.name,
    code: product.partNumber,
    price: product.sellingPrice,
    stock: product.stockQuantity,
  }));

  const addToCart = (product) => {
    setCart((currentCart) => {
      const existingProduct = currentCart.find(
        (item) => item.id === product.id
      );

      if (existingProduct) {
        return currentCart.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...currentCart,
        {
          ...product,
          quantity: 1,
        },
      ];
    });
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === productId
          ? {
              ...item,
              quantity,
            }
          : item
      )
    );
  };

  const removeFromCart = (productId) => {
    setCart((currentCart) =>
      currentCart.filter((item) => item.id !== productId)
    );
  };

  const subtotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const gstRate = settings.billing.defaultGstRate;
  const gstAmount = subtotal * (gstRate / 100);
  const total = subtotal + gstAmount;

  const handleCompleteSale = () => {
    if (cart.length === 0) {
      return;
    }

    setIsPaymentOpen(true);
  };

  const handleConfirmSale = (paymentMethod) => {
    const sale = {
      customerId: selectedCustomer?.id ?? null,
      customerName: selectedCustomer?.name ?? "Walk-in Customer",
      items: cart,
      subtotal,
      gstRate,
      gstAmount,
      total,
      paymentMethod,
    };

    console.log("Mock sale completed:", sale);

    setCart([]);
    setSelectedCustomer(null);
    setIsPaymentOpen(false);
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          New Sale
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Create a bill for your customer.
        </p>
      </div>

      <div className="space-y-6">
        <CustomerSection
          customers={customers}
          selectedCustomer={selectedCustomer}
          onSelectCustomer={setSelectedCustomer}
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <ProductSearch
              products={salesProducts}
              onAddProduct={addToCart}
            />

            <Cart
              items={cart}
              onUpdateQuantity={updateQuantity}
              onRemove={removeFromCart}
            />
          </div>

          <BillSummary
            subtotal={subtotal}
            onCompleteSale={handleCompleteSale}
          />
        </div>
      </div>

      {isPaymentOpen && (
        <PaymentModal
          total={total}
          onClose={() => setIsPaymentOpen(false)}
          onConfirm={handleConfirmSale}
        />
      )}
    </div>
  );
}

export default Sales;