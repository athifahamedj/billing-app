import { useEffect, useState } from "react";

import { useAuth } from "../../../contexts/useAuth";
import { apiRequest } from "../../../lib/api";
import BusinessSettings from "./components/BusinessSettings";
import BillingSettings from "./components/BillingSettings";
import InvoiceSettings from "./components/InvoiceSettings";
import InventorySettings from "./components/InventorySettings";

function Settings() {
  const { activeShopId } = useAuth();
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const updateSection = (section, values) => {
    setSettings((current) => ({
      ...current,
      [section]: {
        ...current[section],
        ...values,
      },
    }));
  };

  useEffect(() => {
    const controller = new AbortController();
    const loadSettings = async () => {
      setIsLoading(true);
      setError("");
      setSuccess("");
      setSettings(null);
      try {
        const result = await apiRequest("/settings", {
          shopId: activeShopId,
          signal: controller.signal,
        });
        setSettings(result);
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setSettings(null);
          setError(requestError.message);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };
    if (activeShopId) loadSettings();
    return () => controller.abort();
  }, [activeShopId]);

  const handleSave = async () => {
    if (!settings || !activeShopId) return;
    setIsSaving(true);
    setError("");
    setSuccess("");
    try {
      const result = await apiRequest("/settings", {
        method: "PUT",
        shopId: activeShopId,
        body: JSON.stringify(settings),
      });
      setSettings(result);
      setSuccess("Settings saved.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!activeShopId) {
    return (
      <p role="status" className="py-8 text-sm text-slate-500">
        Choose a shop to manage its settings.
      </p>
    );
  }

  if (isLoading) {
    return (
      <p role="status" className="py-12 text-center text-sm text-slate-500">
        Loading settings…
      </p>
    );
  }

  if (!settings) {
    return (
      <p role="alert" className="py-8 text-sm text-red-600">
        {error || "Settings could not be loaded."}
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          Settings
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Manage your business and billing preferences.
        </p>
      </div>

      {error && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="mb-4 text-sm text-emerald-700">
          {success}
        </p>
      )}

      <div className="space-y-6">
        <BusinessSettings
          settings={settings.business}
          onChange={(values) => updateSection("business", values)}
        />

        <BillingSettings
          settings={settings.billing}
          onChange={(values) => updateSection("billing", values)}
        />

        <InvoiceSettings
          settings={settings.invoice}
          onChange={(values) => updateSection("invoice", values)}
        />

        <InventorySettings
          settings={settings.inventory}
          onChange={(values) => updateSection("inventory", values)}
        />

        <div className="flex justify-end border-t border-slate-200 pt-5">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;