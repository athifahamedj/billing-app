import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../../contexts/useAuth";
import { apiRequest } from "../../../lib/api";

const fieldClassName =
  "h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-slate-400";

function createSlug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

function ShopSetup() {
  const navigate = useNavigate();
  const { addShopAndSelect } = useAuth();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    phone: "",
    address: "",
    gstin: "",
    username: "",
    display_name: "",
    password: "",
    confirm_password: "",
  });
  const [isSlugEdited, setIsSlugEdited] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const updateField = (event) => {
    const { name, value } = event.target;
    if (name === "slug") setIsSlugEdited(true);
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "name" && !isSlugEdited
        ? { slug: createSlug(value) }
        : {}),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (form.password !== form.confirm_password) {
      setError("The passwords do not match.");
      return;
    }

    setIsSaving(true);
    try {
      const shop = await apiRequest("/admin/shops", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          phone: form.phone,
          address: form.address,
          gstin: form.gstin,
          username: form.username,
          display_name: form.display_name,
          password: form.password,
        }),
      });
      await addShopAndSelect(shop);
      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          Set up a new shop
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Add a shop and create its first login. You can switch shops from the
          shop name at the top of the screen.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-lg border border-slate-200 bg-white p-5 sm:p-6"
      >
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Shop details</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-medium text-slate-600">
              Shop name
              <input
                name="name"
                required
                maxLength={200}
                value={form.name}
                onChange={updateField}
                className={fieldClassName}
              />
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-slate-600">
              Shop short name
              <input
                name="slug"
                required
                maxLength={100}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                title="Use lowercase letters, numbers, and hyphens."
                value={form.slug}
                onChange={updateField}
                className={fieldClassName}
              />
              <span className="font-normal text-slate-500">
                Filled in from the shop name. Use lowercase letters, numbers,
                and hyphens.
              </span>
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-slate-600">
              Phone (optional)
              <input
                name="phone"
                type="tel"
                maxLength={30}
                value={form.phone}
                onChange={updateField}
                className={fieldClassName}
              />
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-slate-600">
              GSTIN (optional)
              <input
                name="gstin"
                maxLength={15}
                value={form.gstin}
                onChange={updateField}
                className={fieldClassName}
              />
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-slate-600 sm:col-span-2">
              Address (optional)
              <textarea
                name="address"
                rows={3}
                value={form.address}
                onChange={updateField}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
            </label>
          </div>
        </section>

        <section className="space-y-4 border-t border-slate-100 pt-5">
          <h3 className="text-sm font-semibold text-slate-900">
            First shop login
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-medium text-slate-600">
              Username
              <input
                name="username"
                required
                maxLength={100}
                autoComplete="username"
                value={form.username}
                onChange={updateField}
                className={fieldClassName}
              />
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-slate-600">
              Display name
              <input
                name="display_name"
                required
                maxLength={200}
                autoComplete="name"
                value={form.display_name}
                onChange={updateField}
                className={fieldClassName}
              />
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-slate-600">
              Password (at least 4 characters)
              <input
                name="password"
                type="password"
                required
                minLength={4}
                maxLength={1024}
                autoComplete="new-password"
                value={form.password}
                onChange={updateField}
                className={fieldClassName}
              />
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-slate-600">
              Confirm password
              <input
                name="confirm_password"
                type="password"
                required
                minLength={4}
                maxLength={1024}
                autoComplete="new-password"
                value={form.confirm_password}
                onChange={updateField}
                className={fieldClassName}
              />
            </label>
          </div>
        </section>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex justify-end border-t border-slate-100 pt-5">
          <button
            type="submit"
            disabled={isSaving}
            className="h-10 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Creating shop…" : "Create shop"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ShopSetup;
