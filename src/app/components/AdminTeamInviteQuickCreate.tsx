"use client";

import { useState } from "react";

type AdminTeamInviteQuickCreateProps = {
  organizationId: string;
  teamId: string;
  teamName: string;
};

type SetupResponse = {
  error?: string;
  message?: string;
};

export default function AdminTeamInviteQuickCreate({
  organizationId,
  teamId,
  teamName,
}: AdminTeamInviteQuickCreateProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function createInvite() {
    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/setup", {
        body: JSON.stringify({
          activeOrganizationId: organizationId,
          actionType: "registration-invite",
          closesAt: "",
          description: `Register your athlete for ${teamName}.`,
          maxAthletes: "",
          opensAt: "",
          organizationId,
          status: "open",
          teamId,
          title: `${teamName} Registration`,
        }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as
        | SetupResponse
        | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Could not create this team link.");
      }

      window.location.reload();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not create this team link.",
      );
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <button
        className="inline-flex shrink-0 items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSaving}
        onClick={() => void createInvite()}
        type="button"
      >
        {isSaving ? "Creating..." : "Create QR team link"}
      </button>
      {error && (
        <p className="max-w-xs text-xs font-bold text-red-200">{error}</p>
      )}
    </div>
  );
}
