"use client";

import Link from "next/link";
import { useState } from "react";
import { createFirebaseClientAuthAdapter } from "../infrastructure/firebaseClientAuth";

type SessionControlsRole = "parent" | "coach" | "admin";

type SessionControlsProps = {
  role: SessionControlsRole;
};

function getRoleLabel(role: SessionControlsRole) {
  if (role === "admin") {
    return "Admin";
  }

  return role === "coach" ? "Coach" : "Parent";
}

export default function SessionControls({ role }: SessionControlsProps) {
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

  return (
    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-white">
            {getRoleLabel(role)} Account
          </p>
          <Link
            className="mt-1 inline-block font-semibold text-blue-300"
            href={`/login?role=${role}`}
          >
            Back to sign in
          </Link>
        </div>

        <button
          className="shrink-0 rounded-xl border border-slate-700 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSigningOut}
          onClick={handleSignOut}
          type="button"
        >
          {isSigningOut ? "Signing Out..." : "Sign Out"}
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 font-semibold text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
