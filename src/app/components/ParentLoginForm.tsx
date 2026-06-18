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
    <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black">Account details</h2>
      <p className="mt-2 text-sm font-semibold text-slate-600">
        Your access comes from verified memberships, assignments, and player
        records.
      </p>

      <form className="mt-5 space-y-4" onSubmit={handleLogin}>
        <label className="block">
          <span className="text-sm font-black text-slate-700">Email</span>
          <input
            autoComplete="email"
            className="mt-2 w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label className="block">
          <span className="text-sm font-black text-slate-700">Password</span>
          <input
            autoComplete="current-password"
            className="mt-2 w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-black text-red-700">
            {error}
          </p>
        )}

        <button
          className="w-full rounded-md bg-blue-600 py-3 font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
