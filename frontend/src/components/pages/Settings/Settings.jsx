import { useState } from "react";

import BusinessSettings from "./components/BusinessSettings";
import BillingSettings from "./components/BillingSettings";
import InvoiceSettings from "./components/InvoiceSettings";
import InventorySettings from "./components/InventorySettings";

import settingsMock from "../../../data/mock/settings_mock.json";

function Settings() {
  const [settings, setSettings] = useState(settingsMock);

  const updateSection = (section, values) => {
    setSettings((current) => ({
      ...current,
      [section]: {
        ...current[section],
        ...values,
      },
    }));
  };

  const handleSave = () => {
    console.log("Settings:", settings);
  };

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
            className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;