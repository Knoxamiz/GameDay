"use client";

import { FormEvent, useState } from "react";
import { signInFirebaseUserWithEmailPassword } from "../infrastructure/firebaseClientAuth";

type LoginRole = "authenticated" | "parent" | "coach" | "admin";

type SessionResponse = {
  configured?: boolean;
  email?: string;
  error?: string;
  landingRoute?: string;
  role?: LoginRole;
  status?: "signed-in" | "signed-out";
};

type ParentLoginFormProps = {
  nextPath?: string;
};

export default function ParentLoginForm({ nextPath }: ParentLoginFormProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setIsSubmitting(true);

    try {
      const loginResult = await signInFirebaseUserWithEmailPassword({
        email: email.trim(),
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

      if (!body?.landingRoute) {
        throw new Error("GameDay could not open this account.");
      }

      window.location.assign(nextPath ?? body.landingRoute);
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
    <div className="gd-card-dark rounded-lg p-3">
      <h2 className="text-base font-black text-white">Account details</h2>
      <p className="mt-0.5 text-xs font-semibold text-slate-300">
        Your access comes from verified memberships, assignments, and player
        records.
      </p>

      <form className="mt-3 space-y-2.5" noValidate onSubmit={handleLogin}>
        <label className="block">
          <span className="text-xs font-black uppercase text-slate-500">
            Email
          </span>
          <input
            autoComplete="email"
            className="mt-1.5 w-full rounded-md border border-blue-300/25 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />
        </label>
        <label className="block">
          <span className="text-xs font-black uppercase text-slate-500">
            Password
          </span>
          <input
            autoComplete="current-password"
            className="mt-1.5 w-full rounded-md border border-blue-300/25 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </label>

        {error && (
          <p className="rounded-md border border-red-400/30 bg-red-500/10 p-2.5 text-xs font-black text-red-100">
            {error}
          </p>
        )}

        <button
          className="w-full rounded-md bg-blue-600 py-2 text-sm font-black text-white shadow-[0_0_24px_rgba(37,99,235,0.24)] hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
