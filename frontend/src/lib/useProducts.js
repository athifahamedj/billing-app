import { useEffect, useState } from "react";

import { apiRequest } from "./api";
import { useAuth } from "../contexts/useAuth";

export function useProducts() {
  const { activeShopId } = useAuth();
  const [result, setResult] = useState({ shopId: null, products: [] });
  const [shopError, setShopError] = useState({ shopId: null, message: "" });

  useEffect(() => {
    const controller = new AbortController();

    if (!activeShopId) {
      return () => controller.abort();
    }

    apiRequest("/products", {
      shopId: activeShopId,
      signal: controller.signal,
    })
      .then((products) => setResult({ shopId: activeShopId, products }))
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          setShopError({
            shopId: activeShopId,
            message: requestError.message,
          });
        }
      });

    return () => controller.abort();
  }, [activeShopId]);

  return {
    products:
      result.shopId === activeShopId && activeShopId
        ? result.products
        : [],
    isLoading:
      Boolean(activeShopId) &&
      result.shopId !== activeShopId &&
      shopError.shopId !== activeShopId,
    error:
      shopError.shopId === activeShopId ? shopError.message : "",
  };
}
