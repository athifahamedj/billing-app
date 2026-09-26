import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { AuthContext } from "./AuthContext";
import { ApiError, apiRequest } from "../lib/api";

const ACTIVE_SHOP_KEY = "billing-active-shop";

function getSavedShopId(shops) {
  const savedShopId = window.sessionStorage.getItem(ACTIVE_SHOP_KEY);
  return shops.some((shop) => shop.shop_id === savedShopId)
    ? savedShopId
    : shops[0]?.shop_id || null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [shops, setShops] = useState([]);
  const [activeShopId, setActiveShopId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  const loadShops = useCallback(async (currentUser) => {
    const availableShops = await apiRequest("/auth/shops");
    setShops(availableShops);

    const shopId =
      currentUser.role === "shop_user"
        ? currentUser.shop_id
        : getSavedShopId(availableShops);

    if (shopId) {
      const context = await apiRequest("/shop-context", { shopId });
      if (context.shop_id !== shopId) {
        throw new Error("The server returned a different shop context.");
      }
    }

    setActiveShopId(shopId);
    if (shopId) {
      window.sessionStorage.setItem(ACTIVE_SHOP_KEY, shopId);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const currentUser = await apiRequest("/auth/me");
        if (!isMounted) return;
        await loadShops(currentUser);
        if (isMounted) setUser(currentUser);
      } catch (error) {
        if (isMounted) {
          setUser(null);
          setShops([]);
          setActiveShopId(null);
          setAuthError(
            error instanceof ApiError && error.status === 401
              ? ""
              : error instanceof Error
                ? error.message
                : "Unable to restore your session.",
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    restoreSession();
    return () => {
      isMounted = false;
    };
  }, [loadShops]);

  const login = useCallback(async (username, password) => {
    setAuthError("");
    const loggedInUser = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    await loadShops(loggedInUser);
    setUser(loggedInUser);
  }, [loadShops]);

  const logout = useCallback(async () => {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
      setAuthError("");
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Unable to sign out.",
      );
    } finally {
      setUser(null);
      setShops([]);
      setActiveShopId(null);
      window.sessionStorage.removeItem(ACTIVE_SHOP_KEY);
    }
  }, []);

  const selectShop = useCallback(async (shopId) => {
    if (user?.role !== "super_admin") return;
    if (!shops.some((shop) => shop.shop_id === shopId)) return;

    try {
      await apiRequest("/shop-context", { shopId });
      setActiveShopId(shopId);
      window.sessionStorage.setItem(ACTIVE_SHOP_KEY, shopId);
      setAuthError("");
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Unable to select this shop.",
      );
    }
  }, [user, shops]);

  const value = useMemo(
    () => ({
      user,
      shops,
      activeShopId,
      activeShop: shops.find((shop) => shop.shop_id === activeShopId) || null,
      isLoading,
      authError,
      login,
      logout,
      selectShop,
    }),
    [user, shops, activeShopId, isLoading, authError, login, logout, selectShop],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
