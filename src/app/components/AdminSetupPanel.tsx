"use client";

import { useState } from "react";
import type { Coach, CoachAssignmentStatus } from "../data/coaches";
import type { RegistrationInvite } from "../data/invites";
import type { Organization } from "../data/organizations";
import type { Team } from "../data/teams";
import RegistrationInviteManager from "./RegistrationInviteManager";

type AdminSetupPanelProps = {
  activeOrganizationId?: string;
  canCreateOrganization: boolean;
  canManageSetup: boolean;
  coaches: Coach[];
  organizations: Organization[];
  registrationInvites: RegistrationInvite[];
  teams: Team[];
};

type SetupResponse = {
  error?: string;
  id?: string;
  message?: string;
};

function getCurrentSeasonLabel() {
  return `${new Date().getFullYear()} Season`;
}

function getOrganizationNameFromId(organizationId: string) {
  return organizationId
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export default function AdminSetupPanel({
  activeOrganizationId,
  canCreateOrganization,
  canManageSetup,
  coaches,
  organizations,
  registrationInvites,
  teams,
}: AdminSetupPanelProps) {
  const organizationId = activeOrganizationId ?? "";
  const [organizationName, setOrganizationName] = useState(
    organizations[0]?.name ?? getOrganizationNameFromId(organizationId),
  );
  const [teamName, setTeamName] = useState("");
  const [teamDivision, setTeamDivision] = useState("");
  const [teamSeason, setTeamSeason] = useState(getCurrentSeasonLabel());
  const [teamStatus, setTeamStatus] = useState<"Active" | "Inactive">("Active");
  const [coachName, setCoachName] = useState("");
  const [coachEmail, setCoachEmail] = useState("");
  const [coachUid, setCoachUid] = useState("");
  const [coachStatus, setCoachStatus] =
    useState<CoachAssignmentStatus>("Active");
  const [coachTeamIds, setCoachTeamIds] = useState<string[]>([]);
  const [newOrganizationName, setNewOrganizationName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeTeams = teams.filter(
    (team) =>
      team.lifecycleStatus !== "Inactive" &&
      team.organizationId === organizationId,
  );
  const activeTeamIdSet = new Set(activeTeams.map((team) => team.id));
  const selectedCoachTeamIds = coachTeamIds.filter((teamId) =>
    activeTeamIdSet.has(teamId),
  );

  function toggleCoachTeam(teamId: string) {
    setCoachTeamIds((currentTeamIds) =>
      currentTeamIds.includes(teamId)
        ? currentTeamIds.filter((currentTeamId) => currentTeamId !== teamId)
        : [...currentTeamIds, teamId],
    );
  }

  async function saveSetup(payload: Record<string, unknown>) {
    setError(null);
    setMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/setup", {
        body: JSON.stringify({ activeOrganizationId, ...payload }),
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as
        | SetupResponse
        | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Could not save setup.");
      }

      setMessage(body?.message ?? "Setup saved.");
      window.setTimeout(() => window.location.reload(), 600);
    } catch (setupError) {
      setError(
        setupError instanceof Error ? setupError.message : "Could not save setup.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!canManageSetup) {
    if (canCreateOrganization) {
      return (
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-bold">Create Organization</h2>
          <p className="mt-2 text-sm text-slate-300">
            Create a real organization and owner membership for this account.
          </p>
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="text-sm font-semibold text-slate-300">
                Organization Name
              </span>
              <input
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
                onChange={(event) => setNewOrganizationName(event.target.value)}
                value={newOrganizationName}
              />
            </label>
            <button
              className="w-full rounded-xl bg-blue-500 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              onClick={() =>
                void saveSetup({
                  actionType: "organization-provisioning",
                  name: newOrganizationName,
                })
              }
              type="button"
            >
              Create Organization
            </button>
          </div>
          {message && (
            <p className="mt-4 rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-sm font-semibold text-blue-200">
              {message}
            </p>
          )}
          {error && (
            <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-semibold text-red-300">
              {error}
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300">
        Sign in as an admin with organization setup access.
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {message && (
        <p className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-sm font-semibold text-blue-200">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-semibold text-red-300">
          {error}
        </p>
      )}

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Step 1
        </p>
        <h2 className="mt-2 text-xl font-bold">Organization</h2>
        <p className="mt-2 text-sm text-slate-300">
          Manage the real organization record for the active context.
        </p>
        <div className="mt-4 space-y-3">
          <div className="rounded-xl bg-slate-800 p-3 text-sm text-slate-300">
            Organization ID: {organizationId}
          </div>
          <label className="block">
            <span className="text-sm font-semibold text-slate-300">Name</span>
            <input
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
              onChange={(event) => setOrganizationName(event.target.value)}
              value={organizationName}
            />
          </label>
          <button
            className="w-full rounded-xl bg-blue-500 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            onClick={() =>
              void saveSetup({
                actionType: "organization",
                name: organizationName,
                organizationId,
              })
            }
            type="button"
          >
            Save Organization
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Step 2
        </p>
        <h2 className="mt-2 text-xl font-bold">Team / Division</h2>
        <p className="mt-2 text-sm text-slate-300">
          Registration cannot open until a real team exists.
        </p>
        {organizations.length === 0 ? (
          <p className="mt-4 rounded-xl bg-slate-800 p-3 text-sm text-slate-300">
            Create the organization first.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="text-sm font-semibold text-slate-300">
                Team Name
              </span>
              <input
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
                onChange={(event) => setTeamName(event.target.value)}
                value={teamName}
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-300">
                Division
              </span>
              <input
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
                onChange={(event) => setTeamDivision(event.target.value)}
                placeholder="10U, 12U, High School"
                value={teamDivision}
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-300">
                Season
              </span>
              <input
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
                onChange={(event) => setTeamSeason(event.target.value)}
                value={teamSeason}
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-300">
                Status
              </span>
              <select
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                onChange={(event) =>
                  setTeamStatus(
                    event.target.value === "Inactive" ? "Inactive" : "Active",
                  )
                }
                value={teamStatus}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </label>
            <button
              className="w-full rounded-xl bg-blue-500 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              onClick={() =>
                void saveSetup({
                  actionType: "team",
                  division: teamDivision,
                  name: teamName,
                  organizationId,
                  season: teamSeason,
                  status: teamStatus,
                })
              }
              type="button"
            >
              Create Team
            </button>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Step 3
        </p>
        <h2 className="mt-2 text-xl font-bold">Coach Assignment</h2>
        <p className="mt-2 text-sm text-slate-300">
          Assign a real coach account to one or more real teams.
        </p>
        {activeTeams.length === 0 ? (
          <p className="mt-4 rounded-xl bg-slate-800 p-3 text-sm text-slate-300">
            Create an active team first.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="text-sm font-semibold text-slate-300">
                Coach Name
              </span>
              <input
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
                onChange={(event) => setCoachName(event.target.value)}
                value={coachName}
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-300">
                Coach Email
              </span>
              <input
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
                onChange={(event) => setCoachEmail(event.target.value)}
                type="email"
                value={coachEmail}
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-300">
                Firebase UID
              </span>
              <input
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
                onChange={(event) => setCoachUid(event.target.value)}
                placeholder="Optional"
                value={coachUid}
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-300">
                Status
              </span>
              <select
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                onChange={(event) =>
                  setCoachStatus(
                    event.target.value === "Inactive" ? "Inactive" : "Active",
                  )
                }
                value={coachStatus}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </label>
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold text-slate-300">
                Teams
              </legend>
              {activeTeams.map((team) => (
                <label
                  className="flex items-center justify-between gap-3 rounded-xl bg-slate-800 p-3 text-sm font-semibold text-slate-300"
                  key={team.id}
                >
                  {team.name}
                  <input
                    checked={selectedCoachTeamIds.includes(team.id)}
                    onChange={() => toggleCoachTeam(team.id)}
                    type="checkbox"
                  />
                </label>
              ))}
            </fieldset>
            <button
              className="w-full rounded-xl bg-blue-500 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              onClick={() =>
                void saveSetup({
                  actionType: "coach-assignment",
                  email: coachEmail,
                  name: coachName,
                  organizationId,
                  status: coachStatus,
                  teamIds: selectedCoachTeamIds,
                  uid: coachUid,
                })
              }
              type="button"
            >
              Save Coach Assignment
            </button>
          </div>
        )}
      </section>

      <RegistrationInviteManager
        organizationId={organizationId}
        registrationInvites={registrationInvites}
        teams={teams}
      />

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-lg font-bold">Current Setup</h2>
        <div className="mt-3 space-y-2 text-sm text-slate-300">
          <p>{organizations.length} organization record(s)</p>
          <p>{teams.length} team record(s)</p>
          <p>{coaches.length} coach assignment(s)</p>
          <p>{registrationInvites.length} registration invite(s)</p>
        </div>
      </section>
    </div>
  );
}
