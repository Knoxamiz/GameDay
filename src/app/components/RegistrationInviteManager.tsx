"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  getRegistrationInviteStatus,
  type RegistrationInvite,
  type RegistrationInviteStatus,
} from "../data/invites";
import type { OrganizationWorkspaceType } from "../data/organizations";
import { isActiveTeam, type Team } from "../data/teams";
import AdminJoinLinkButton from "./AdminJoinLinkButton";

type RegistrationInviteManagerProps = {
  organizationId: string;
  registrationInvites: RegistrationInvite[];
  teams: Team[];
  workspaceType?: OrganizationWorkspaceType;
};

type SetupResponse = {
  error?: string;
  message?: string;
};

function toDateTimeLocal(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function toIsoDate(value: string) {
  return value ? new Date(value).toISOString() : "";
}

function getStatusLabel(status: RegistrationInviteStatus) {
  return `${status.charAt(0).toUpperCase()}${status.slice(1)}`;
}

function getStatusClass(status: RegistrationInviteStatus) {
  if (status === "open") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "draft") {
    return "bg-slate-100 text-slate-600";
  }

  if (status === "closed") {
    return "bg-orange-50 text-orange-700";
  }

  return "bg-red-50 text-red-700";
}

function getTeamName(teams: Team[], teamId: string) {
  return teams.find((team) => team.id === teamId)?.name ?? "Team";
}

function InviteCard({
  invite,
  isSaving,
  onSave,
  teams,
}: {
  invite: RegistrationInvite;
  isSaving: boolean;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
  teams: Team[];
}) {
  const status = getRegistrationInviteStatus(invite);
  const isArchived = status === "archived";
  const joinPath = `/join/${invite.inviteCode}`;
  const [title, setTitle] = useState(invite.title);
  const [description, setDescription] = useState(invite.description ?? "");
  const [opensAt, setOpensAt] = useState(toDateTimeLocal(invite.opensAt));
  const [closesAt, setClosesAt] = useState(toDateTimeLocal(invite.closesAt));
  const [maxAthletes, setMaxAthletes] = useState(
    invite.maxAthletes ? String(invite.maxAthletes) : "",
  );

  function getPayload(operation: "archive" | "close" | "open" | "update") {
    return {
      actionType: "registration-invite-update",
      closesAt: toIsoDate(closesAt),
      description,
      inviteCode: invite.inviteCode,
      maxAthletes,
      opensAt: toIsoDate(opensAt),
      operation,
      teamId: invite.teamId,
      title,
    };
  }

  return (
    <article className="gd-card-dark rounded-lg px-3 py-2.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-black text-white">
              {invite.title}
            </h3>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-black ${getStatusClass(
                status,
              )}`}
            >
              {getStatusLabel(status)}
            </span>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            {getTeamName(teams, invite.teamId)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminJoinLinkButton
            className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-black text-white hover:bg-blue-500"
            joinPath={joinPath}
            label="Copy Link"
          />
          <Link
            className="rounded-md border border-white/15 px-2.5 py-1.5 text-xs font-black text-slate-200 hover:bg-white/10"
            href={joinPath}
            target="_blank"
          >
            View Page
          </Link>
        </div>
      </div>

      {!isArchived && (
        <div className="mt-2 flex flex-wrap gap-2">
          {status === "open" ? (
            <button
              className="rounded-md border border-orange-300/30 px-2.5 py-1.5 text-xs font-black text-orange-200 hover:bg-orange-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              onClick={() => onSave(getPayload("close"))}
              type="button"
            >
              Close Registration
            </button>
          ) : (
            <button
              className="rounded-md border border-emerald-300/30 px-2.5 py-1.5 text-xs font-black text-emerald-200 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              onClick={() => onSave(getPayload("open"))}
              type="button"
            >
              Open Registration
            </button>
          )}
          <button
            className="rounded-md border border-red-300/30 px-2.5 py-1.5 text-xs font-black text-red-200 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            onClick={() => onSave(getPayload("archive"))}
            type="button"
          >
            Archive
          </button>
        </div>
      )}

      {!isArchived && (
        <details className="mt-3 rounded-md border border-white/10 bg-white/[0.04] p-3">
          <summary className="cursor-pointer text-xs font-black text-slate-200">
            Edit link settings
          </summary>
          <div className="mt-3 grid gap-3">
            <label className="block">
              <span className="text-xs font-bold uppercase text-slate-400">
                Link Name
              </span>
              <input
                className="mt-1.5 w-full rounded-md border border-white/15 bg-slate-950/75 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
                onChange={(event) => setTitle(event.target.value)}
                value={title}
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-slate-400">
                Parent Message
              </span>
              <textarea
                className="mt-1.5 min-h-20 w-full rounded-md border border-white/15 bg-slate-950/75 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
                onChange={(event) => setDescription(event.target.value)}
                value={description}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="text-xs font-bold uppercase text-slate-400">
                  Opens
                </span>
                <input
                  className="mt-1.5 w-full rounded-md border border-white/15 bg-slate-950/75 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
                  onChange={(event) => setOpensAt(event.target.value)}
                  type="datetime-local"
                  value={opensAt}
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase text-slate-400">
                  Closes
                </span>
                <input
                  className="mt-1.5 w-full rounded-md border border-white/15 bg-slate-950/75 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
                  onChange={(event) => setClosesAt(event.target.value)}
                  type="datetime-local"
                  value={closesAt}
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase text-slate-400">
                  Player Limit
                </span>
                <input
                  className="mt-1.5 w-full rounded-md border border-white/15 bg-slate-950/75 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
                  min="1"
                  onChange={(event) => setMaxAthletes(event.target.value)}
                  placeholder="No limit"
                  type="number"
                  value={maxAthletes}
                />
              </label>
            </div>
            <button
              className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-black text-slate-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              onClick={() => onSave(getPayload("update"))}
              type="button"
            >
              Save Link Settings
            </button>
          </div>
        </details>
      )}
    </article>
  );
}

export default function RegistrationInviteManager({
  organizationId,
  registrationInvites,
  teams,
  workspaceType = "organization",
}: RegistrationInviteManagerProps) {
  const activeTeams = teams.filter(
    (team) => team.organizationId === organizationId && isActiveTeam(team),
  );
  const isSingleTeamWorkspace = workspaceType === "single_team";
  const defaultTeamId = activeTeams[0]?.id ?? "";
  const [inviteTeamId, setInviteTeamId] = useState(defaultTeamId);
  const selectedTeam = activeTeams.find((team) => team.id === inviteTeamId) ??
    activeTeams[0];
  const [title, setTitle] = useState(
    selectedTeam ? `${selectedTeam.name} Registration` : "",
  );
  const [description, setDescription] = useState(
    selectedTeam ? `Register your athlete for ${selectedTeam.name}.` : "",
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const organizationInvites = useMemo(
    () =>
      registrationInvites.filter(
        (invite) => invite.organizationId === organizationId,
      ),
    [organizationId, registrationInvites],
  );
  const visibleInvites = organizationInvites.filter(
    (invite) =>
      showArchived || getRegistrationInviteStatus(invite) !== "archived",
  );
  const hasVisibleInvites = visibleInvites.length > 0;

  async function saveInvite(payload: Record<string, unknown>) {
    setError(null);
    setMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/setup", {
        body: JSON.stringify({
          activeOrganizationId: organizationId,
          ...payload,
        }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as
        | SetupResponse
        | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Could not save registration link.");
      }

      setMessage(body?.message ?? "Registration link saved.");
      window.setTimeout(() => window.location.reload(), 600);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save registration link.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function createOpenInvite() {
    return saveInvite({
      actionType: "registration-invite",
      closesAt: "",
      description,
      maxAthletes: "",
      opensAt: "",
      organizationId,
      status: "open",
      teamId: selectedTeam?.id ?? "",
      title,
    });
  }

  return (
    <section className="gd-card-dark rounded-lg p-3 backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-black text-white">Registration Link</h2>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Create the real link parents use from a QR code, text, or handout.
          </p>
        </div>
        {hasVisibleInvites && (
          <button
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-black text-white hover:bg-blue-500"
            onClick={() => setShowCreateForm((currentValue) => !currentValue)}
            type="button"
          >
            {showCreateForm ? "Close" : "New Link +"}
          </button>
        )}
      </div>

      {message && (
        <p className="mt-3 rounded-md border border-blue-300/30 bg-blue-500/10 p-2.5 text-xs font-bold text-blue-100">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-md border border-red-300/30 bg-red-500/10 p-2.5 text-xs font-bold text-red-100">
          {error}
        </p>
      )}

      {activeTeams.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed border-white/15 bg-white/[0.04] p-3 text-xs font-semibold text-slate-400">
          Create an active team before opening registration.
        </p>
      ) : (
        <>
          {(!hasVisibleInvites || showCreateForm) && (
            <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
              <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
                <label className="block">
                  <span className="text-xs font-bold uppercase text-slate-400">
                    Team
                  </span>
                  {isSingleTeamWorkspace && activeTeams.length === 1 ? (
                    <p className="mt-1.5 rounded-md border border-white/15 bg-slate-950/75 px-3 py-2 text-sm font-black text-white">
                      {activeTeams[0].name}
                    </p>
                  ) : (
                    <select
                      className="mt-1.5 w-full rounded-md border border-white/15 bg-slate-950/75 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
                      onChange={(event) => {
                        const nextTeam = activeTeams.find(
                          (team) => team.id === event.target.value,
                        );
                        setInviteTeamId(event.target.value);
                        if (nextTeam) {
                          setTitle(`${nextTeam.name} Registration`);
                          setDescription(
                            `Register your athlete for ${nextTeam.name}.`,
                          );
                        }
                      }}
                      value={selectedTeam?.id ?? ""}
                    >
                      {activeTeams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  )}
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase text-slate-400">
                    Link Name
                  </span>
                  <input
                    className="mt-1.5 w-full rounded-md border border-white/15 bg-slate-950/75 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
                    onChange={(event) => setTitle(event.target.value)}
                    value={title}
                  />
                </label>
                <button
                  className="self-end rounded-md bg-blue-600 px-4 py-2 text-xs font-black text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSaving || !selectedTeam}
                  onClick={() => void createOpenInvite()}
                  type="button"
                >
                  Create Link
                </button>
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-black text-slate-300">
                  Parent message
                </summary>
                <textarea
                  className="mt-1.5 min-h-20 w-full rounded-md border border-white/15 bg-slate-950/75 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
                  onChange={(event) => setDescription(event.target.value)}
                  value={description}
                />
              </details>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-3">
            <h3 className="text-sm font-black text-white">Current Links</h3>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-400">
              <input
                checked={showArchived}
                onChange={(event) => setShowArchived(event.target.checked)}
                type="checkbox"
              />
              Show archived
            </label>
          </div>
          <div className="mt-3 grid gap-3">
            {visibleInvites.length > 0 ? (
              visibleInvites.map((invite) => (
                <InviteCard
                  invite={invite}
                  isSaving={isSaving}
                  key={invite.id}
                  onSave={saveInvite}
                  teams={activeTeams}
                />
              ))
            ) : (
              <p className="rounded-md border border-dashed border-white/15 bg-white/[0.04] p-3 text-xs font-semibold text-slate-400">
                No registration links yet.
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
