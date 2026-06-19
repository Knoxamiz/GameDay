"use client";

import { useState } from "react";
import { createFirebaseClientAuthAdapter } from "../infrastructure/firebaseClientAuth";

type SessionControlsRole = "account" | "parent" | "coach" | "admin";

type SessionControlsProps = {
  compact?: boolean;
  role: SessionControlsRole;
  surface?: "dark" | "light";
};

function getRoleLabel(role: SessionControlsRole) {
  if (role === "account") {
    return "GameDay";
  }

  if (role === "admin") {
    return "Admin";
  }

  return role === "coach" ? "Coach" : "Parent";
}

export default function SessionControls({
  compact = false,
  role,
  surface = "dark",
}: SessionControlsProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setError(null);
    setIsSigningOut(true);

    try {
      const response = await fetch("/api/session", {
        credentials: "same-origin",
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Could not clear GameDay session.");
      }

      const adapter = await createFirebaseClientAuthAdapter();
      await adapter?.logout();
      window.location.assign("/login");
    } catch (signOutError) {
      setError(
        signOutError instanceof Error
          ? signOutError.message
          : "Could not sign out.",
      );
      setIsSigningOut(false);
    }
  }

  if (compact) {
    return (
      <div className="text-right text-xs">
        <button
          className={`rounded-md border px-2.5 py-1.5 font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
            surface === "light"
              ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              : "border-slate-700 text-slate-200"
          }`}
          disabled={isSigningOut}
          onClick={handleSignOut}
          type="button"
        >
          {isSigningOut ? "Signing Out..." : "Sign Out"}
        </button>
        {error && (
          <p className="mt-2 max-w-xs text-left text-xs font-semibold text-red-300">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`mt-3 rounded-lg border p-3 text-sm shadow-lg ${
        surface === "light"
          ? "border-slate-200 bg-white"
          : "border-slate-800 bg-slate-900"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p
            className={`font-semibold ${
              surface === "light" ? "text-slate-950" : "text-white"
            }`}
          >
            {getRoleLabel(role)} Account
          </p>
          <p
            className={`mt-1 ${
              surface === "light" ? "text-slate-500" : "text-slate-400"
            }`}
          >
            Access is based on your verified GameDay session.
          </p>
        </div>

        <button
          className={`shrink-0 rounded-md border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
            surface === "light"
              ? "border-slate-200 text-slate-700 hover:bg-slate-50"
              : "border-slate-700 text-white"
          }`}
          disabled={isSigningOut}
          onClick={handleSignOut}
          type="button"
        >
          {isSigningOut ? "Signing Out..." : "Sign Out"}
        </button>
      </div>

      {error && (
        <p className="mt-2 rounded-md border border-red-500/30 bg-red-500/10 p-2.5 font-semibold text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
