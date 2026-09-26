import { useCallback, useEffect, useState } from "react";
import { Ban, Pencil, Plus, Search, X } from "lucide-react";

import { useAuth } from "../../../contexts/useAuth";
import { apiRequest } from "../../../lib/api";

function ContactForm({ config, record, onClose, onSave }) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      config.fields.map(({ name }) => [name, record?.[name] ?? ""]),
    ),
  );
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      await onSave(
        Object.fromEntries(
          Object.entries(values).map(([key, value]) => [
            key,
            value === "" ? null : value,
          ]),
        ),
      );
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setIsSaving(false);
    }
  };

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
        aria-labelledby="contact-form-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3
            id="contact-form-title"
            className="text-base font-semibold text-slate-900"
          >
            {record ? `Edit ${config.label.toLowerCase()}` : `Add ${config.label.toLowerCase()}`}
          </h3>
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
            {config.fields.map((field) => (
              <div
                key={field.name}
                className={field.multiline ? "sm:col-span-2" : ""}
              >
                <label
                  htmlFor={`contact-${field.name}`}
                  className="mb-1.5 block text-xs font-medium text-slate-600"
                >
                  {field.label}
                </label>
                {field.multiline ? (
                  <textarea
                    id={`contact-${field.name}`}
                    name={field.name}
                    rows={3}
                    maxLength={field.maxLength}
                    value={values[field.name]}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [field.name]: event.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  />
                ) : (
                  <input
                    id={`contact-${field.name}`}
                    name={field.name}
                    type={field.type || "text"}
                    required={field.required}
                    maxLength={field.maxLength}
                    autoComplete={field.autoComplete}
                    value={values[field.name]}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [field.name]: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
                  />
                )}
              </div>
            ))}
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
              {isSaving ? "Saving…" : `Save ${config.label.toLowerCase()}`}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ContactManager({ config }) {
  const { activeShopId } = useAuth();
  const [recordsState, setRecordsState] = useState({
    shopId: null,
    records: [],
  });
  const [search, setSearch] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [editingRecord, setEditingRecord] = useState(undefined);
  const [loadingShopId, setLoadingShopId] = useState(null);
  const [loadedShopId, setLoadedShopId] = useState(null);
  const [error, setError] = useState("");

  const loadRecords = useCallback(
    async (signal) => {
      if (!activeShopId) {
        setRecordsState({ shopId: null, records: [] });
        setLoadingShopId(null);
        setError("");
        return;
      }
      setLoadingShopId(activeShopId);
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set("q", search.trim());
        if (includeInactive) params.set("include_inactive", "true");
        const suffix = params.size ? `?${params.toString()}` : "";
        const result = await apiRequest(`/${config.endpoint}${suffix}`, {
          shopId: activeShopId,
          signal,
        });
        setRecordsState({ shopId: activeShopId, records: result });
        setLoadedShopId(activeShopId);
        setError("");
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setLoadedShopId(activeShopId);
          setError(requestError.message);
        }
      } finally {
        if (!signal?.aborted) setLoadingShopId(null);
      }
    },
    [activeShopId, config.endpoint, includeInactive, search],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(
      () => loadRecords(controller.signal),
      search ? 250 : 0,
    );
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadRecords, search]);

  const saveRecord = async (values) => {
    const isEditing = Boolean(editingRecord);
    await apiRequest(
      isEditing
        ? `/${config.endpoint}/${editingRecord[config.idField]}`
        : `/${config.endpoint}`,
      {
        method: isEditing ? "PUT" : "POST",
        shopId: activeShopId,
        body: JSON.stringify(values),
      },
    );
    setEditingRecord(undefined);
    await loadRecords();
  };

  const deactivateRecord = async (record) => {
    if (!window.confirm(`Deactivate "${record.name}"?`)) return;
    setError("");
    try {
      await apiRequest(
        `/${config.endpoint}/${record[config.idField]}`,
        { method: "DELETE", shopId: activeShopId },
      );
      await loadRecords();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const isLoading =
    Boolean(activeShopId) &&
    (loadingShopId === activeShopId || loadedShopId !== activeShopId);
  const records =
    recordsState.shopId === activeShopId ? recordsState.records : [];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            {config.title}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage {config.title.toLowerCase()} for this shop.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditingRecord(null)}
          disabled={!activeShopId}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          <Plus size={16} />
          Add {config.label}
        </button>
      </div>

      <section className="mb-5 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${config.title.toLowerCase()}...`}
              className="h-10 w-full rounded-md border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(event) => setIncludeInactive(event.target.checked)}
              className="rounded border-slate-300"
            />
            Show deactivated
          </label>
        </div>
      </section>

      {error && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {error}
        </p>
      )}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                {config.columns.map((column) => (
                  <th key={column.name} className="px-4 py-3 font-medium">
                    {column.label}
                  </th>
                ))}
                <th className="px-4 py-3 font-medium">Status / Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={config.columns.length + 1}
                    className="px-5 py-10 text-center text-slate-500"
                  >
                    Loading {config.title.toLowerCase()}…
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td
                    colSpan={config.columns.length + 1}
                    className="px-5 py-10 text-center text-slate-500"
                  >
                    No {config.title.toLowerCase()} found.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr
                    key={record[config.idField]}
                    className="border-b border-slate-100 last:border-0"
                  >
                    {config.columns.map((column) => (
                      <td
                        key={column.name}
                        className="px-4 py-4 text-slate-600"
                      >
                        {record[column.name] || "—"}
                      </td>
                    ))}
                    <td className="px-4 py-4">
                      {record.is_active ? (
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                            Active
                          </span>
                          <button
                            type="button"
                            aria-label={`Edit ${record.name}`}
                            onClick={() => setEditingRecord(record)}
                            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            aria-label={`Deactivate ${record.name}`}
                            onClick={() => deactivateRecord(record)}
                            className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
                          >
                            <Ban size={15} />
                          </button>
                        </div>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
                          Deactivated
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {editingRecord !== undefined && (
        <ContactForm
          config={config}
          record={editingRecord}
          onClose={() => setEditingRecord(undefined)}
          onSave={saveRecord}
        />
      )}
    </div>
  );
}

export default ContactManager;
