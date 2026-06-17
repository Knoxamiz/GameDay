"use client";

import { useState } from "react";

type AdminArchiveButtonProps = {
  buttonLabel: string;
  confirmMessage: string;
  payload: Record<string, unknown>;
  redirectHref: string;
  successDelayMs?: number;
};

type SetupResponse = {
  error?: string;
  message?: string;
};

export default function AdminArchiveButton({
  buttonLabel,
  confirmMessage,
  payload,
  redirectHref,
  successDelayMs = 500,
}: AdminArchiveButtonProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function archiveRecord() {
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setError(null);
    setMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/setup", {
        body: JSON.stringify(payload),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as
        | SetupResponse
        | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Could not remove this item.");
      }

      setMessage(body?.message ?? "Removed.");
      window.setTimeout(() => window.location.assign(redirectHref), successDelayMs);
    } catch (archiveError) {
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : "Could not remove this item.",
      );
      setIsSaving(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-2">
      <button
        className="rounded-md border border-red-200 px-3 py-2 text-sm font-black text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSaving}
        onClick={() => void archiveRecord()}
        type="button"
      >
        {isSaving ? "Removing..." : buttonLabel}
      </button>
      {message && (
        <span className="text-xs font-semibold text-blue-700">{message}</span>
      )}
      {error && (
        <span className="text-xs font-semibold text-red-700">{error}</span>
      )}
    </span>
  );
}
