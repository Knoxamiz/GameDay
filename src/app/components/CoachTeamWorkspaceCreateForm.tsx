"use client";

import { useState } from "react";
import { withActiveOrganization } from "../data/activeOrganization";

type CoachWorkspaceCreateResponse = {
  error?: string;
  message?: string;
  organizationId?: string;
  teamId?: string;
};

async function readResponseError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as
    | CoachWorkspaceCreateResponse
    | null;

  return typeof body?.error === "string" ? body.error : fallback;
}

function getTeamLaunchHref(body: CoachWorkspaceCreateResponse | null) {
  if (body?.organizationId && body.teamId) {
    return withActiveOrganization(
      `/admin/teams/${encodeURIComponent(body.teamId)}`,
      body.organizationId,
    );
  }

  if (body?.organizationId) {
    return withActiveOrganization("/admin", body.organizationId);
  }

  return "/account";
}

export default function CoachTeamWorkspaceCreateForm() {
  const [teamName, setTeamName] = useState("");
  const [division, setDivision] = useState("");
  const [season, setSeason] = useState("2026 Season");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function createTeamWorkspace() {
    setError(null);
    setMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/coach/workspaces", {
        body: JSON.stringify({
          division,
          season,
          teamName,
        }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as
        | CoachWorkspaceCreateResponse
        | null;

      if (!response.ok) {
        throw new Error(
          body?.error ??
            (await readResponseError(
              response,
              "Could not create this team workspace.",
            )),
        );
      }

      setMessage(body?.message ?? "Team workspace created.");
      window.setTimeout(() => window.location.assign(getTeamLaunchHref(body)), 500);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not create this team workspace.",
      );
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-md border border-emerald-300/20 bg-emerald-500/10 p-2.5 shadow-[0_16px_38px_rgba(0,0,0,0.24)]">
      <div>
        <p className="text-[11px] font-black uppercase tracking-wide text-emerald-200">
          Start here
        </p>
        <h2 className="mt-0.5 text-base font-black text-white">
          Create your team
        </h2>
        <p className="mt-0.5 text-xs font-semibold text-slate-300">
          Creates one team workspace, then opens invite and roster tools.
        </p>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <label className="block sm:col-span-3">
          <span className="text-xs font-black text-slate-300">Team name</span>
          <input
            className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/80 px-2.5 py-2 text-sm font-semibold text-white outline-none focus:border-emerald-300"
            onChange={(event) => setTeamName(event.target.value)}
            placeholder="Pineboys Tackle"
            value={teamName}
          />
        </label>
        <label className="block sm:col-span-1">
          <span className="text-xs font-black text-slate-300">Division</span>
          <input
            className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/80 px-2.5 py-2 text-sm font-semibold text-white outline-none focus:border-emerald-300"
            onChange={(event) => setDivision(event.target.value)}
            placeholder="10U"
            value={division}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-black text-slate-300">Season</span>
          <input
            className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/80 px-2.5 py-2 text-sm font-semibold text-white outline-none focus:border-emerald-300"
            onChange={(event) => setSeason(event.target.value)}
            placeholder="2026 Season"
            value={season}
          />
        </label>
      </div>

      {message && (
        <p className="mt-2 rounded-md border border-emerald-300/25 bg-emerald-500/10 p-2 text-xs font-black text-emerald-100">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-2 rounded-md border border-red-300/30 bg-red-500/10 p-2 text-xs font-black text-red-100">
          {error}
        </p>
      )}

      <button
        className="mt-2 w-full rounded-md bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSaving}
        onClick={() => void createTeamWorkspace()}
        type="button"
      >
        {isSaving ? "Creating team..." : "Create team workspace"}
      </button>
    </section>
  );
}
