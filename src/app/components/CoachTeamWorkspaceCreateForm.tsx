"use client";

import { useState } from "react";

type CoachWorkspaceCreateResponse = {
  error?: string;
  message?: string;
};

async function readResponseError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as
    | CoachWorkspaceCreateResponse
    | null;

  return typeof body?.error === "string" ? body.error : fallback;
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
      window.setTimeout(() => window.location.assign("/coach"), 700);
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
    <section className="rounded-md border border-blue-100 bg-blue-50/70 p-2.5">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-blue-700">
          Start here
        </p>
        <h2 className="mt-0.5 text-base font-black text-slate-950">
          Create your team
        </h2>
        <p className="mt-0.5 text-xs font-semibold text-slate-600">
          This creates one team workspace with you as the assigned coach.
        </p>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <label className="block sm:col-span-3">
          <span className="text-xs font-black text-slate-700">Team name</span>
          <input
            className="mt-1 w-full rounded-md border border-blue-200 bg-white px-2.5 py-2 text-sm font-semibold text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            onChange={(event) => setTeamName(event.target.value)}
            placeholder="Pineboys Tackle"
            value={teamName}
          />
        </label>
        <label className="block sm:col-span-1">
          <span className="text-xs font-black text-slate-700">Division</span>
          <input
            className="mt-1 w-full rounded-md border border-blue-200 bg-white px-2.5 py-2 text-sm font-semibold text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            onChange={(event) => setDivision(event.target.value)}
            placeholder="10U"
            value={division}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-black text-slate-700">Season</span>
          <input
            className="mt-1 w-full rounded-md border border-blue-200 bg-white px-2.5 py-2 text-sm font-semibold text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            onChange={(event) => setSeason(event.target.value)}
            placeholder="2026 Season"
            value={season}
          />
        </label>
      </div>

      {message && (
        <p className="mt-2 rounded-md border border-emerald-200 bg-white p-2 text-xs font-black text-emerald-700">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-2 rounded-md border border-red-200 bg-white p-2 text-xs font-black text-red-700">
          {error}
        </p>
      )}

      <button
        className="mt-2 w-full rounded-md bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSaving}
        onClick={() => void createTeamWorkspace()}
        type="button"
      >
        {isSaving ? "Creating team..." : "Create team workspace"}
      </button>
    </section>
  );
}
