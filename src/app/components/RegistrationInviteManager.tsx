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

type RegistrationInviteManagerProps = {
  embedded?: boolean;
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

function InviteEditor({
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
  const [title, setTitle] = useState(invite.title);
  const [description, setDescription] = useState(invite.description ?? "");
  const [opensAt, setOpensAt] = useState(toDateTimeLocal(invite.opensAt));
  const [closesAt, setClosesAt] = useState(toDateTimeLocal(invite.closesAt));
  const [maxAthletes, setMaxAthletes] = useState(
    invite.maxAthletes ? String(invite.maxAthletes) : "",
  );
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const joinPath = `/join/${invite.inviteCode}`;

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
    <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words font-semibold text-white">{invite.title}</p>
          <p className="mt-1 text-xs text-slate-400">
            {teams.find((team) => team.id === invite.teamId)?.name ?? "Team invite"}
          </p>
        </div>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
          {getStatusLabel(status)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <button
          className="rounded-lg border border-slate-700 px-3 py-2 font-semibold text-slate-200"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(
                `${window.location.origin}${joinPath}`,
              );
              setCopyMessage("Join link copied.");
            } catch {
              setCopyMessage("Could not copy the join link.");
            }
          }}
          type="button"
        >
          Copy Join Link
        </button>
        <Link
          className="rounded-lg border border-slate-700 px-3 py-2 font-semibold text-slate-200"
          href={joinPath}
          target="_blank"
        >
          View Join Page
        </Link>
      </div>
      {copyMessage && (
        <p className="mt-2 text-xs font-semibold text-slate-400">
          {copyMessage}
        </p>
      )}
      <p className="mt-2 text-xs text-slate-500">
        Use this real link for a QR code or printed handout. It only starts
        parent registration and never grants staff access.
      </p>

      <details className="mt-3 text-xs text-slate-500">
        <summary className="cursor-pointer font-semibold">
          Technical details
        </summary>
        <p className="mt-2 break-all">Join path: {joinPath}</p>
        <p className="mt-1 break-all">Invite code: {invite.inviteCode}</p>
      </details>

      {!isArchived && (
        <div className="mt-4 space-y-3 border-t border-slate-800 pt-4">
          <p className="text-sm text-slate-400">
            Team: {teams.find((team) => team.id === invite.teamId)?.name ?? invite.teamId}
          </p>
          <label className="block">
            <span className="text-sm font-semibold text-slate-300">Title</span>
            <input
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"
              onChange={(event) => setTitle(event.target.value)}
              value={title}
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-300">
              Description
            </span>
            <textarea
              className="mt-2 min-h-24 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"
              onChange={(event) => setDescription(event.target.value)}
              value={description}
            />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-slate-300">
                Opens At
              </span>
              <input
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-white"
                onChange={(event) => setOpensAt(event.target.value)}
                type="datetime-local"
                value={opensAt}
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-300">
                Closes At
              </span>
              <input
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-white"
                onChange={(event) => setClosesAt(event.target.value)}
                type="datetime-local"
                value={closesAt}
              />
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-semibold text-slate-300">
              Athlete Limit
            </span>
            <input
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"
              min="1"
              onChange={(event) => setMaxAthletes(event.target.value)}
              placeholder="No limit"
              type="number"
              value={maxAthletes}
            />
          </label>
          <button
            className="w-full rounded-xl border border-slate-600 py-3 font-semibold text-white disabled:opacity-60"
            disabled={isSaving}
            onClick={() => onSave(getPayload("update"))}
            type="button"
          >
            Save Invite Changes
          </button>
          <div className="grid grid-cols-2 gap-2">
            {status !== "open" ? (
              <button
                className="rounded-xl bg-blue-500 py-3 font-semibold text-white disabled:opacity-60"
                disabled={isSaving}
                onClick={() => onSave(getPayload("open"))}
                type="button"
              >
                Open Invite
              </button>
            ) : (
              <button
                className="rounded-xl bg-slate-700 py-3 font-semibold text-white disabled:opacity-60"
                disabled={isSaving}
                onClick={() => onSave(getPayload("close"))}
                type="button"
              >
                Close Invite
              </button>
            )}
            <button
              className="rounded-xl border border-red-500/50 py-3 font-semibold text-red-200 disabled:opacity-60"
              disabled={isSaving}
              onClick={() => onSave(getPayload("archive"))}
              type="button"
            >
              Archive Invite
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RegistrationInviteManager({
  embedded = false,
  organizationId,
  registrationInvites,
  teams,
  workspaceType = "organization",
}: RegistrationInviteManagerProps) {
  const activeTeams = teams.filter(
    (team) =>
      team.organizationId === organizationId &&
      isActiveTeam(team),
  );
  const isSingleTeamWorkspace = workspaceType === "single_team";
  const defaultInviteTitle = activeTeams[0]
    ? `${activeTeams[0].name} Registration`
    : "";
  const defaultInviteDescription = activeTeams[0]
    ? `Register your athlete for ${activeTeams[0].name}.`
    : "";
  const [inviteTeamId, setInviteTeamId] = useState(activeTeams[0]?.id ?? "");
  const [title, setTitle] = useState(defaultInviteTitle);
  const [description, setDescription] = useState(defaultInviteDescription);
  const [status, setStatus] = useState<Exclude<
    RegistrationInviteStatus,
    "archived"
  >>("draft");
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [maxAthletes, setMaxAthletes] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedTeamId = activeTeams.some((team) => team.id === inviteTeamId)
    ? inviteTeamId
    : activeTeams[0]?.id ?? "";
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
        throw new Error(body?.error ?? "Could not save registration invite.");
      }

      setMessage(body?.message ?? "Registration invite saved.");
      window.setTimeout(() => window.location.reload(), 600);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save registration invite.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section
      className={
        embedded
          ? ""
          : "rounded-2xl border border-slate-800 bg-slate-900 p-5"
      }
      id="registration-invites"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Step 4
      </p>
      <h2 className="mt-2 text-xl font-bold">
        {isSingleTeamWorkspace ? "Team Registration Link" : "Registration Invites"}
      </h2>
      <p className="mt-2 text-sm text-slate-300">
        {isSingleTeamWorkspace
          ? "Create and open the real join link parents will use from a QR code or message."
          : "Parent registration opens only through a real open invite."}
      </p>

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

      {activeTeams.length === 0 ? (
        <p className="mt-4 rounded-xl bg-slate-800 p-3 text-sm text-slate-300">
          Create an active team first.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {isSingleTeamWorkspace && activeTeams.length === 1 ? (
            <div className="rounded-xl bg-slate-800 p-3 text-sm">
              <p className="font-semibold text-white">{activeTeams[0].name}</p>
              <p className="mt-1 text-slate-400">
                This Team Builder workspace has one registration team.
              </p>
            </div>
          ) : (
            <label className="block">
              <span className="text-sm font-semibold text-slate-300">Team</span>
              <select
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                onChange={(event) => setInviteTeamId(event.target.value)}
                value={selectedTeamId}
              >
                {activeTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block">
            <span className="text-sm font-semibold text-slate-300">Title</span>
            <input
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Fall registration"
              value={title}
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-300">
              Description
            </span>
            <textarea
              className="mt-2 min-h-24 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
              onChange={(event) => setDescription(event.target.value)}
              value={description}
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-300">Status</span>
            <select
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              onChange={(event) =>
                setStatus(
                  event.target.value === "open"
                    ? "open"
                    : event.target.value === "closed"
                      ? "closed"
                      : "draft",
                )
              }
              value={status}
            >
              <option value="draft">Draft</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-slate-300">
                Opens At
              </span>
              <input
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white"
                onChange={(event) => setOpensAt(event.target.value)}
                type="datetime-local"
                value={opensAt}
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-300">
                Closes At
              </span>
              <input
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white"
                onChange={(event) => setClosesAt(event.target.value)}
                type="datetime-local"
                value={closesAt}
              />
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-semibold text-slate-300">
              Athlete Limit
            </span>
            <input
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
              min="1"
              onChange={(event) => setMaxAthletes(event.target.value)}
              placeholder="No limit"
              type="number"
              value={maxAthletes}
            />
          </label>
          <button
            className="w-full rounded-xl bg-blue-500 py-3 font-semibold text-white disabled:opacity-60"
            disabled={isSaving}
            onClick={() =>
              saveInvite({
                actionType: "registration-invite",
                closesAt: toIsoDate(closesAt),
                description,
                maxAthletes,
                opensAt: toIsoDate(opensAt),
                organizationId,
                status,
                teamId: selectedTeamId,
                title,
              })
            }
            type="button"
          >
            {isSingleTeamWorkspace ? "Create registration link" : "Create Invite"}
          </button>
        </div>
      )}

      <div className="mt-6 border-t border-slate-800 pt-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-bold">
            {isSingleTeamWorkspace ? "Team Registration Links" : "Organization Invites"}
          </h3>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <input
              checked={showArchived}
              onChange={(event) => setShowArchived(event.target.checked)}
              type="checkbox"
            />
            Show archived
          </label>
        </div>
        <div className="mt-3 space-y-3">
          {visibleInvites.length > 0 ? (
            visibleInvites.map((invite) => (
              <InviteEditor
                invite={invite}
                isSaving={isSaving}
                key={invite.id}
                onSave={saveInvite}
                teams={activeTeams}
              />
            ))
          ) : (
            <p className="rounded-xl bg-slate-800 p-3 text-sm text-slate-300">
              No registration invites in this view.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
