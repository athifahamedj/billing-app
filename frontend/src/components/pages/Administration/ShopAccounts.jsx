import { useEffect, useState } from "react";

import { useAuth } from "../../../contexts/useAuth";
import { apiRequest } from "../../../lib/api";

const inputClassName =
  "h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-slate-400";

function SuperAdminCredentials({ user, onUsernameChange }) {
  const [username, setUsername] = useState(user.username);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const hasUsernameChange = username.trim() !== user.username;
  const hasPasswordChange = password.length > 0;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!hasUsernameChange && !hasPasswordChange) {
      setError("Enter a new username or password.");
      return;
    }
    if (hasPasswordChange && password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    const updates = {};
    if (hasUsernameChange) updates.username = username.trim();
    if (hasPasswordChange) updates.password = password;

    setIsSaving(true);
    try {
      const result = await apiRequest("/admin/me/credentials", {
        method: "PUT",
        body: JSON.stringify(updates),
      });
      onUsernameChange(result.username);
      setUsername(result.username);
      setPassword("");
      setConfirmPassword("");
      setSuccess("Super-admin login updated.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-4">
        <h3 className="font-semibold text-slate-900">Your super-admin login</h3>
        <p className="mt-1 text-sm text-slate-500">
          Set your username to super-admin if you want. Choose a private
          password; it is never displayed.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-xs font-medium text-slate-600">
          Username
          <input
            required
            maxLength={100}
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className={inputClassName}
          />
        </label>
        <label className="grid gap-1.5 text-xs font-medium text-slate-600">
          New password (leave blank to keep current)
          <input
            type="password"
            minLength={4}
            maxLength={1024}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClassName}
          />
        </label>
        {hasPasswordChange && (
          <label className="grid gap-1.5 text-xs font-medium text-slate-600 sm:col-span-2">
            Confirm new password
            <input
              type="password"
              required
              minLength={4}
              maxLength={1024}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={inputClassName}
            />
          </label>
        )}
        {(error || success) && (
          <p
            role={error ? "alert" : "status"}
            className={`text-sm sm:col-span-2 ${
              error ? "text-red-600" : "text-emerald-700"
            }`}
          >
            {error || success}
          </p>
        )}
        <div className="flex justify-end sm:col-span-2">
          <button
            type="submit"
            disabled={
              isSaving ||
              (!hasUsernameChange && !hasPasswordChange) ||
              (hasPasswordChange && password !== confirmPassword)
            }
            className="h-10 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save my login"}
          </button>
        </div>
      </form>
    </section>
  );
}

function ShopUserCard({ account, onUpdated }) {
  const [username, setUsername] = useState(account.username);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const hasUsernameChange = username.trim() !== account.username;
  const hasPasswordChange = password.length > 0;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!hasUsernameChange && !hasPasswordChange) {
      setError("Enter a new username or password.");
      return;
    }
    if (hasPasswordChange && password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    const updates = {};
    if (hasUsernameChange) updates.username = username.trim();
    if (hasPasswordChange) updates.password = password;

    setIsSaving(true);
    try {
      const updatedAccount = await apiRequest(
        `/admin/shop-users/${account.user_id}/credentials`,
        {
          method: "PUT",
          body: JSON.stringify(updates),
        },
      );
      onUpdated(updatedAccount);
      setUsername(updatedAccount.username);
      setPassword("");
      setConfirmPassword("");
      setSuccess("Login details updated.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-4">
        <h3 className="font-semibold text-slate-900">{account.shop_name}</h3>
        <p className="mt-1 text-sm text-slate-500">{account.display_name}</p>
      </div>
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-xs font-medium text-slate-600">
          Username
          <input
            required
            maxLength={100}
            autoComplete="off"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className={inputClassName}
          />
        </label>
        <label className="grid gap-1.5 text-xs font-medium text-slate-600">
          New password (leave blank to keep current)
          <input
            type="password"
            minLength={4}
            maxLength={1024}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClassName}
          />
        </label>
        {hasPasswordChange && (
          <label className="grid gap-1.5 text-xs font-medium text-slate-600 sm:col-span-2">
            Confirm new password
            <input
              type="password"
              required
              minLength={4}
              maxLength={1024}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={inputClassName}
            />
          </label>
        )}
        {(error || success) && (
          <p
            role={error ? "alert" : "status"}
            className={`text-sm sm:col-span-2 ${
              error ? "text-red-600" : "text-emerald-700"
            }`}
          >
            {error || success}
          </p>
        )}
        <div className="flex justify-end sm:col-span-2">
          <button
            type="submit"
            disabled={
              isSaving ||
              (!hasUsernameChange && !hasPasswordChange) ||
              (hasPasswordChange && password !== confirmPassword)
            }
            className="h-10 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save login"}
          </button>
        </div>
      </form>
    </article>
  );
}

function ShopAccounts() {
  const { user, updateUsername } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const loadAccounts = async () => {
      try {
        const result = await apiRequest("/admin/shop-users", {
          signal: controller.signal,
        });
        setAccounts(result);
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setError(requestError.message);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };
    loadAccounts();
    return () => controller.abort();
  }, []);

  const updateAccount = (updatedAccount) => {
    setAccounts((current) =>
      current.map((account) =>
        account.user_id === updatedAccount.user_id
          ? updatedAccount
          : account,
      ),
    );
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          Shop logins
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Update a shop login’s username or set a new password. Passwords are
          never displayed.
        </p>
      </div>

      {user && (
        <SuperAdminCredentials
          user={user}
          onUsernameChange={updateUsername}
        />
      )}

      {error && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {error}
        </p>
      )}
      {isLoading ? (
        <p role="status" className="py-12 text-center text-sm text-slate-500">
          Loading shop logins…
        </p>
      ) : accounts.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500">
          No active shop logins found.
        </p>
      ) : (
        <div className="space-y-4">
          {accounts.map((account) => (
            <ShopUserCard
              key={account.user_id}
              account={account}
              onUpdated={updateAccount}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ShopAccounts;
