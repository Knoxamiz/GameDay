"use client";

import { useState } from "react";
import {
  getTeamLifecycleStatus,
  getTeamStatusLabel,
  isArchivedTeam,
  type Team,
  type TeamLifecycleStatus,
} from "../data/teams";

type TeamLifecycleManagerProps = {
  activeOrganizationId: string;
  embedded?: boolean;
  teams: Team[];
};

type SetupResponse = {
  error?: string;
  message?: string;
};

function TeamLifecycleEditor({
  activeOrganizationId,
  isSaving,
  onSave,
  team,
}: {
  activeOrganizationId: string;
  isSaving: boolean;
  onSave: (teamId: string, payload: Record<string, unknown>) => Promise<void>;
  team: Team;
}) {
  const [name, setName] = useState(team.name);
  const [division, setDivision] = useState(
    team.division ?? team.ageGroup ?? team.label,
  );
  const [season, setSeason] = useState(team.season ?? "");
  const [status, setStatus] = useState<TeamLifecycleStatus>(
    getTeamLifecycleStatus(team),
  );

  return (
    <details className="rounded-lg border border-blue-300/20 bg-slate-950/75">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-3 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <p className="font-semibold text-white">{team.name}</p>
          <p className="mt-1 text-xs text-slate-400">
            {team.division ?? team.ageGroup ?? team.label}
          </p>
        </div>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
          {getTeamStatusLabel(team)}
        </span>
      </summary>

      <div className="space-y-2.5 border-t border-white/10 p-3">
        <label className="block">
          <span className="text-xs font-black uppercase text-slate-400">Name</span>
          <input
            className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/75 px-3 py-2 text-white outline-none"
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        </label>
        <label className="block">
          <span className="text-xs font-black uppercase text-slate-400">Division</span>
          <input
            className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/75 px-3 py-2 text-white outline-none"
            onChange={(event) => setDivision(event.target.value)}
            value={division}
          />
        </label>
        <label className="block">
          <span className="text-xs font-black uppercase text-slate-400">Season</span>
          <input
            className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/75 px-3 py-2 text-white outline-none"
            onChange={(event) => setSeason(event.target.value)}
            value={season}
          />
        </label>
        <label className="block">
          <span className="text-xs font-black uppercase text-slate-400">Status</span>
          <select
            className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/75 px-3 py-2 text-white"
            onChange={(event) =>
              setStatus(event.target.value as TeamLifecycleStatus)
            }
            value={status}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <button
          className="w-full rounded-md bg-blue-500 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving}
          onClick={() =>
            void onSave(team.id, {
              actionType: "team-update",
              division,
              name,
              organizationId: activeOrganizationId,
              season,
              status,
              teamId: team.id,
            })
          }
          type="button"
        >
          {isSaving ? "Saving Team..." : "Save Team Changes"}
        </button>
        {status === "archived" && !isArchivedTeam(team) && (
          <p className="text-xs text-yellow-200">
            Archiving removes this team from new operational choices while
            preserving registrations, events, invites, and assignments.
          </p>
        )}
        <details className="text-xs text-slate-500">
          <summary className="cursor-pointer font-semibold">
            Technical details
          </summary>
          <p className="mt-2 break-all">Internal Team ID: {team.id}</p>
        </details>
      </div>
    </details>
  );
}

export default function TeamLifecycleManager({
  activeOrganizationId,
  embedded = false,
  teams,
}: TeamLifecycleManagerProps) {
  const [showArchived, setShowArchived] = useState(false);
  const [savingTeamId, setSavingTeamId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const visibleTeams = teams.filter(
    (team) => showArchived || !isArchivedTeam(team),
  );

  async function saveTeam(teamId: string, payload: Record<string, unknown>) {
    setError(null);
    setMessage(null);
    setSavingTeamId(teamId);

    try {
      const response = await fetch("/api/admin/setup", {
        body: JSON.stringify({ activeOrganizationId, ...payload }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as
        | SetupResponse
        | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Could not update team.");
      }

      setMessage(body?.message ?? "Team updated.");
      window.setTimeout(() => window.location.reload(), 600);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not update team.",
      );
    } finally {
      setSavingTeamId(null);
    }
  }

  return (
    <section
      className={
        embedded
          ? ""
          : "gd-card-dark rounded-lg p-3"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black">Manage Teams</h2>
          <p className="mt-1 text-sm text-slate-300">
            Edit team details or lifecycle status. Technical ownership remains fixed.
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-400">
          <input checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} type="checkbox" />
          Archived
        </label>
      </div>

      {message && (
        <p className="mt-3 rounded-md border border-blue-500/30 bg-blue-500/10 p-2.5 text-sm font-semibold text-blue-200">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-2.5 text-sm font-semibold text-red-300">
          {error}
        </p>
      )}

      <div className="mt-3 space-y-2">
        {visibleTeams.length === 0 ? (
          <p className="rounded-md border border-white/10 bg-white/5 p-2.5 text-sm text-slate-300">
            No teams in this view.
          </p>
        ) : (
          visibleTeams.map((team) => (
            <TeamLifecycleEditor
              activeOrganizationId={activeOrganizationId}
              isSaving={savingTeamId === team.id}
              key={team.id}
              onSave={saveTeam}
              team={team}
            />
          ))
        )}
      </div>
    </section>
  );
}
