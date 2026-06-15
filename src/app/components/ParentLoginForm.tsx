"use client";

import { FormEvent, useState } from "react";
import { signInFirebaseUserWithEmailPassword } from "../infrastructure/firebaseClientAuth";

type LoginRole = "parent" | "coach" | "admin";

type SessionResponse = {
  configured?: boolean;
  email?: string;
  error?: string;
  landingRoute?: string;
  role?: LoginRole;
  status?: "signed-in" | "signed-out";
};

export default function ParentLoginForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const loginResult = await signInFirebaseUserWithEmailPassword({
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
        throw new Error(body?.error ?? "Could not create GameDay session.");
      }

      const body = (await response.json().catch(() => null)) as
        | SessionResponse
        | null;

      if (!body?.landingRoute || !body.role) {
        throw new Error("GameDay could not determine this account's role.");
      }

      window.location.assign(body.landingRoute);
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

  return (
    <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
      <h2 className="text-xl font-bold">Sign in to GameDay</h2>
      <p className="mt-2 text-sm text-slate-400">
        Firebase verifies your account, role, and organization membership.
      </p>

      <form className="mt-5 space-y-4" onSubmit={handleLogin}>
        <label className="block">
          <span className="text-sm font-semibold text-slate-300">Email</span>
          <input
            autoComplete="email"
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
            onChange={(event) => setEmail(event.target.value)}
            required
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
            required
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
    </div>
  );
}
