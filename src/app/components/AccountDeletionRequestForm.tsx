"use client";

import { useState } from "react";

type DeletionRequestStatus = "idle" | "submitting" | "success" | "error";

export default function AccountDeletionRequestForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<DeletionRequestStatus>("idle");

  async function handleSubmit() {
    setMessage(null);
    setStatus("submitting");

    try {
      const response = await fetch("/api/account/deletion-request", {
        credentials: "same-origin",
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
        requestId?: string;
      } | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Could not request account deletion.");
      }

      setStatus("success");
      setMessage(
        body?.requestId
          ? `Deletion request received: ${body.requestId}`
          : "Deletion request received.",
      );
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not request account deletion.",
      );
    }
  }

  return (
    <div className="gd-card-light rounded-lg p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-black">Request account deletion</h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-300">
            This starts a verified deletion review tied to your signed-in
            account. GameDay will remove or anonymize account data that is not
            required for legal, safety, or transaction records.
          </p>
        </div>
        <button
          className="shrink-0 rounded-md border border-red-300/30 bg-red-500/10 px-3 py-2 text-xs font-black text-red-100 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={status === "submitting" || status === "success"}
          onClick={() => void handleSubmit()}
          type="button"
        >
          {status === "submitting" ? "Requesting..." : "Request deletion"}
        </button>
      </div>
      {message && (
        <p
          className={`mt-3 rounded-md border p-2 text-xs font-bold ${
            status === "success"
              ? "border-emerald-300/30 bg-emerald-500/10 text-emerald-100"
              : "border-red-300/30 bg-red-500/10 text-red-100"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
