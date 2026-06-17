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
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-black text-slate-950">
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
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {getTeamName(teams, invite.teamId)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminJoinLinkButton
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-black text-white hover:bg-blue-700"
            joinPath={joinPath}
            label="Copy Link"
          />
          <Link
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
            href={joinPath}
            target="_blank"
          >
            View Page
          </Link>
        </div>
      </div>

      {!isArchived && (
        <div className="mt-4 flex flex-wrap gap-2">
          {status === "open" ? (
            <button
              className="rounded-md border border-orange-200 px-3 py-2 text-sm font-black text-orange-700 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              onClick={() => onSave(getPayload("close"))}
              type="button"
            >
              Close Registration
            </button>
          ) : (
            <button
              className="rounded-md border border-emerald-200 px-3 py-2 text-sm font-black text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              onClick={() => onSave(getPayload("open"))}
              type="button"
            >
              Open Registration
            </button>
          )}
          <button
            className="rounded-md border border-red-200 px-3 py-2 text-sm font-black text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            onClick={() => onSave(getPayload("archive"))}
            type="button"
          >
            Archive
          </button>
        </div>
      )}

      {!isArchived && (
        <details className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
          <summary className="cursor-pointer text-sm font-black text-slate-700">
            Edit link settings
          </summary>
          <div className="mt-3 grid gap-3">
            <label className="block">
              <span className="text-xs font-bold uppercase text-slate-500">
                Link Name
              </span>
              <input
                className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                onChange={(event) => setTitle(event.target.value)}
                value={title}
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-slate-500">
                Parent Message
              </span>
              <textarea
                className="mt-2 min-h-20 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                onChange={(event) => setDescription(event.target.value)}
                value={description}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="text-xs font-bold uppercase text-slate-500">
                  Opens
                </span>
                <input
                  className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) => setOpensAt(event.target.value)}
                  type="datetime-local"
                  value={opensAt}
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase text-slate-500">
                  Closes
                </span>
                <input
                  className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) => setClosesAt(event.target.value)}
                  type="datetime-local"
                  value={closesAt}
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase text-slate-500">
                  Player Limit
                </span>
                <input
                  className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  min="1"
                  onChange={(event) => setMaxAthletes(event.target.value)}
                  placeholder="No limit"
                  type="number"
                  value={maxAthletes}
                />
              </label>
            </div>
            <button
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
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
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-black">Registration Link</h2>
          <p className="mt-1 text-sm text-slate-500">
            Create the real link parents use from a QR code, text, or handout.
          </p>
        </div>
        {hasVisibleInvites && (
          <button
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-black text-white hover:bg-blue-700"
            onClick={() => setShowCreateForm((currentValue) => !currentValue)}
            type="button"
          >
            {showCreateForm ? "Close" : "New Link +"}
          </button>
        )}
      </div>

      {message && (
        <p className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-bold text-blue-700">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
          {error}
        </p>
      )}

      {activeTeams.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
          Create an active team before opening registration.
        </p>
      ) : (
        <>
          {(!hasVisibleInvites || showCreateForm) && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
                <label className="block">
                  <span className="text-xs font-bold uppercase text-slate-500">
                    Team
                  </span>
                  {isSingleTeamWorkspace && activeTeams.length === 1 ? (
                    <p className="mt-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-black">
                      {activeTeams[0].name}
                    </p>
                  ) : (
                    <select
                      className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
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
                  <span className="text-xs font-bold uppercase text-slate-500">
                    Link Name
                  </span>
                  <input
                    className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    onChange={(event) => setTitle(event.target.value)}
                    value={title}
                  />
                </label>
                <button
                  className="self-end rounded-md bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSaving || !selectedTeam}
                  onClick={() => void createOpenInvite()}
                  type="button"
                >
                  Create Link
                </button>
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-black text-slate-600">
                  Parent message
                </summary>
                <textarea
                  className="mt-2 min-h-20 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) => setDescription(event.target.value)}
                  value={description}
                />
              </details>
            </div>
          )}

          <div className="mt-5 flex items-center justify-between gap-3">
            <h3 className="text-lg font-black">Current Links</h3>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-500">
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
              <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                No registration links yet.
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
