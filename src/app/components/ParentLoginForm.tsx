"use client";

import { FormEvent, useState } from "react";
import {
  createFirebaseClientAuthAdapter,
  signInFirebaseAdminWithEmailPassword,
  signInFirebaseParentWithEmailPassword,
} from "../infrastructure/firebaseClientAuth";

type LoginRole = "parent" | "admin";

type SessionResponse = {
  error?: string;
  landingRoute?: string;
  role?: LoginRole;
};

export default function ParentLoginForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<LoginRole>("parent");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const loginResult =
        role === "admin"
          ? await signInFirebaseAdminWithEmailPassword({
              email,
              password,
            })
          : await signInFirebaseParentWithEmailPassword({
              email,
              password,
            });

      if (!loginResult) {
        throw new Error("Firebase client login is not configured.");
      }

      const response = await fetch("/api/session", {
        body: JSON.stringify({ idToken: loginResult.idToken }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | SessionResponse
          | null;
        throw new Error(body?.error ?? "Could not create parent session.");
      }

      const body = (await response.json().catch(() => null)) as
        | SessionResponse
        | null;

      window.location.assign(body?.landingRoute ?? `/${role}`);
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Could not sign in.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    setError(null);
    setIsSubmitting(true);

    try {
      await fetch("/api/session", { method: "DELETE" });
      const adapter = await createFirebaseClientAuthAdapter();
      await adapter?.logout();
      window.location.assign(role === "admin" ? "/admin" : "/parent");
    } catch (logoutError) {
      setError(
        logoutError instanceof Error
          ? logoutError.message
          : "Could not sign out.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
      <h2 className="text-xl font-bold">Firebase Login</h2>
      <p className="mt-2 text-sm text-slate-400">
        Sign in with a Firebase parent or admin account. If Firebase is not
        configured, GameDay still falls back to the demo views.
      </p>

      <form className="mt-5 space-y-4" onSubmit={handleLogin}>
        <div className="grid grid-cols-2 gap-2 text-sm font-semibold">
          {(["parent", "admin"] as const).map((option) => (
            <button
              className={`rounded-xl border px-4 py-3 ${
                role === option
                  ? "border-blue-500 bg-blue-500/20 text-blue-200"
                  : "border-slate-700 bg-slate-950 text-slate-300"
              }`}
              key={option}
              onClick={() => setRole(option)}
              type="button"
            >
              {option === "parent" ? "Parent" : "Admin"}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-slate-300">Email</span>
          <input
            autoComplete="email"
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-300">Password</span>
          <input
            autoComplete="current-password"
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </label>

        {error && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-semibold text-red-300">
            {error}
          </p>
        )}

        <button
          className="w-full rounded-xl bg-blue-500 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Signing In..." : "Sign In"}
        </button>
      </form>

      <button
        className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-900 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        onClick={handleLogout}
        type="button"
      >
        Sign Out
      </button>
    </div>
  );
}
