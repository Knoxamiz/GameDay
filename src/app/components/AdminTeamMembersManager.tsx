"use client";

import { useMemo, useState } from "react";
import type { CoachAssignment } from "../data/coachAssignmentRecords";
import type { Coach } from "../data/coaches";
import type { Registration } from "../data/registrations";

type AdminTeamMembersManagerProps = {
  activeOrganizationId: string;
  coachAssignments: CoachAssignment[];
  coaches: Coach[];
  defaultOpen?: boolean;
  playersDefaultOpen?: boolean;
  rosteredRegistrations: Registration[];
  showCoaches?: boolean;
  teamId: string;
  title?: string;
};

type ApiResponse = {
  error?: string;
  message?: string;
};

function normalizeText(value: string) {
  return value.trim();
}

function normalizeEmail(value: string) {
  return normalizeText(value).toLowerCase();
}

function uniqueStringList(values: string[]) {
  return [...new Set(values.map(normalizeText).filter(Boolean))];
}

async function readResponseError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as ApiResponse | null;

  return typeof body?.error === "string" ? body.error : fallback;
}

function getCoachName(
  assignment: CoachAssignment,
  coaches: Coach[],
  fallbackName = "Coach",
) {
  const coach = coaches.find((candidate) => candidate.id === assignment.coachId);

  return coach?.name || assignment.email || fallbackName;
}

function getEmailFromLine(line: string) {
  return line.match(/[^\s,;|<>]+@[^\s,;|<>]+/)?.[0] ?? "";
}

function parseRosterLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[-*]\s*/, ""))
    .filter(Boolean)
    .map((line) => {
      const parentEmail = getEmailFromLine(line);
      const namePart = line
        .replace(parentEmail, "")
        .replace(/[|,;-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const [athleteFirstName = "", ...lastNameParts] = namePart.split(" ");

      return {
        athleteFirstName,
        athleteLastName: lastNameParts.join(" "),
        parentEmail,
      };
    });
}

export default function AdminTeamMembersManager({
  activeOrganizationId,
  coachAssignments,
  coaches,
  defaultOpen = false,
  playersDefaultOpen = false,
  rosteredRegistrations,
  showCoaches = true,
  teamId,
  title = "Players & Coaches",
}: AdminTeamMembersManagerProps) {
  const [athleteFirstName, setAthleteFirstName] = useState("");
  const [athleteLastName, setAthleteLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [grade, setGrade] = useState("");
  const [jerseySize, setJerseySize] = useState("");
  const [school, setSchool] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [coachName, setCoachName] = useState("");
  const [coachEmail, setCoachEmail] = useState("");
  const [bulkRosterText, setBulkRosterText] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeTeamCoachAssignments = useMemo(
    () =>
      coachAssignments
        .filter(
          (assignment) =>
            assignment.status === "active" && assignment.teamIds.includes(teamId),
        )
        .sort((first, second) =>
          getCoachName(first, coaches).localeCompare(
            getCoachName(second, coaches),
          ),
        ),
    [coachAssignments, coaches, teamId],
  );

  function clearStatus() {
    setError(null);
    setMessage(null);
  }

  function refreshAfterSuccess(successMessage: string) {
    setMessage(successMessage);
    window.setTimeout(() => window.location.reload(), 650);
  }

  async function addPlayer() {
    clearStatus();
    setSavingKey("player-add");

    try {
      const response = await fetch(`/api/admin/teams/${teamId}/members`, {
        body: JSON.stringify({
          activeOrganizationId,
          actionType: "player-add",
          athleteFirstName,
          athleteLastName,
          dateOfBirth,
          grade,
          jerseySize,
          organizationId: activeOrganizationId,
          parentEmail,
          parentName,
          parentPhone,
          school,
        }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as
        | ApiResponse
        | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Could not add this player.");
      }

      refreshAfterSuccess(body?.message ?? "Player added.");
    } catch (addError) {
      setError(
        addError instanceof Error ? addError.message : "Could not add this player.",
      );
      setSavingKey(null);
    }
  }

  async function addBulkPlayers() {
    clearStatus();
    const players = parseRosterLines(bulkRosterText);

    if (players.length === 0) {
      setError("Enter at least one player name.");
      return;
    }

    if (
      players.some(
        (player) => !player.athleteFirstName || !player.athleteLastName,
      )
    ) {
      setError("Each line needs a first and last name.");
      return;
    }

    setSavingKey("players-bulk-add");

    try {
      const response = await fetch(`/api/admin/teams/${teamId}/members`, {
        body: JSON.stringify({
          activeOrganizationId,
          actionType: "players-bulk-add",
          organizationId: activeOrganizationId,
          players,
        }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as
        | ApiResponse
        | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Could not save this roster.");
      }

      setBulkRosterText("");
      refreshAfterSuccess(body?.message ?? "Roster saved.");
    } catch (addError) {
      setError(
        addError instanceof Error ? addError.message : "Could not save this roster.",
      );
      setSavingKey(null);
    }
  }

  async function removePlayer(registration: Registration) {
    if (
      !window.confirm(
        `Remove ${registration.athleteName ?? "this player"} from this roster?`,
      )
    ) {
      return;
    }

    clearStatus();
    setSavingKey(`player-remove-${registration.id}`);

    try {
      const response = await fetch(`/api/admin/teams/${teamId}/members`, {
        body: JSON.stringify({
          activeOrganizationId,
          actionType: "player-remove",
          organizationId: activeOrganizationId,
          registrationId: registration.id,
        }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const body = (await response.json().catch(() => null)) as
        | ApiResponse
        | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Could not remove this player.");
      }

      refreshAfterSuccess(body?.message ?? "Player removed.");
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Could not remove this player.",
      );
      setSavingKey(null);
    }
  }

  async function saveCoachAssignment(payload: Record<string, unknown>) {
    const response = await fetch("/api/admin/setup", {
      body: JSON.stringify({
        activeOrganizationId,
        ...payload,
      }),
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const body = (await response.json().catch(() => null)) as ApiResponse | null;

    if (!response.ok) {
      throw new Error(
        body?.error ?? (await readResponseError(response, "Could not update coach.")),
      );
    }

    return body?.message ?? "Coach assignment saved.";
  }

  async function addCoach() {
    clearStatus();
    setSavingKey("coach-add");

    try {
      const email = normalizeEmail(coachEmail);
      const existingAssignment = coachAssignments.find(
        (assignment) =>
          assignment.organizationId === activeOrganizationId &&
          normalizeEmail(assignment.email) === email,
      );
      const existingCoach = coaches.find(
        (coach) =>
          normalizeEmail(coach.email) === email ||
          coach.id === existingAssignment?.coachId,
      );
      const teamIds = uniqueStringList([
        ...(existingAssignment?.teamIds ?? []),
        teamId,
      ]);
      const successMessage = await saveCoachAssignment({
        actionType: "coach-assignment",
        assignmentId: existingAssignment?.id,
        coachId: existingAssignment?.coachId ?? existingCoach?.id,
        email,
        name:
          normalizeText(coachName) ||
          existingCoach?.name ||
          existingAssignment?.email ||
          email,
        organizationId: activeOrganizationId,
        status: "active",
        teamIds,
        uid: existingAssignment?.uid ?? existingCoach?.uid,
      });

      refreshAfterSuccess(successMessage);
    } catch (addError) {
      setError(
        addError instanceof Error ? addError.message : "Could not add this coach.",
      );
      setSavingKey(null);
    }
  }

  async function removeCoach(assignment: CoachAssignment) {
    const name = getCoachName(assignment, coaches);

    if (!window.confirm(`Remove ${name} from this team?`)) {
      return;
    }

    clearStatus();
    setSavingKey(`coach-remove-${assignment.id}`);

    try {
      const remainingTeamIds = assignment.teamIds.filter(
        (assignedTeamId) => assignedTeamId !== teamId,
      );
      const coach = coaches.find((candidate) => candidate.id === assignment.coachId);
      const successMessage = await saveCoachAssignment({
        actionType: "coach-assignment",
        assignmentId: assignment.id,
        coachId: assignment.coachId,
        email: assignment.email,
        name: coach?.name ?? assignment.email,
        organizationId: activeOrganizationId,
        status: remainingTeamIds.length > 0 ? "active" : "inactive",
        teamIds: remainingTeamIds.length > 0 ? remainingTeamIds : [teamId],
        uid: assignment.uid ?? coach?.uid,
      });

      refreshAfterSuccess(successMessage);
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Could not remove this coach.",
      );
      setSavingKey(null);
    }
  }

  if (!showCoaches) {
    return (
      <section className="gd-card-dark rounded-lg p-3 backdrop-blur">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-white">{title}</h2>
            <p className="mt-0.5 text-sm text-slate-400">
              Paste names, then save once. Add parent email after a comma when
              you have it.
            </p>
          </div>
          <span className="rounded-full bg-white/10 px-2 py-1 text-xs font-black text-blue-100">
            {rosteredRegistrations.length} rostered
          </span>
        </div>

        {message && (
          <p className="mt-2 rounded-md border border-emerald-300/25 bg-emerald-500/10 p-2 text-xs font-bold text-emerald-100">
            {message}
          </p>
        )}
        {error && (
          <p className="mt-2 rounded-md border border-red-300/25 bg-red-500/10 p-2 text-xs font-bold text-red-100">
            {error}
          </p>
        )}

        <div className="mt-3 grid gap-2 lg:grid-cols-[1fr_auto]">
          <textarea
            className="min-h-24 rounded-md border border-blue-300/15 bg-slate-950/60 px-3 py-2 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-blue-300"
            onChange={(event) => setBulkRosterText(event.target.value)}
            placeholder={"Zimmy Zith, parent@email.com\nAlex Morgan\nTaylor Smith"}
            value={bulkRosterText}
          />
          <button
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 lg:self-start"
            disabled={Boolean(savingKey)}
            onClick={() => void addBulkPlayers()}
            type="button"
          >
            {savingKey === "players-bulk-add" ? "Saving..." : "Save roster"}
          </button>
        </div>

        <div className="mt-3 divide-y divide-white/10 rounded-md border border-blue-300/10 bg-white/[0.035]">
          {rosteredRegistrations.length === 0 ? (
            <p className="px-3 py-2 text-sm font-semibold text-slate-400">
              No rostered players yet.
            </p>
          ) : (
            rosteredRegistrations.map((registration) => (
              <div
                className="flex items-center justify-between gap-3 px-3 py-2"
                key={registration.id}
              >
                <span className="min-w-0 truncate text-sm font-black text-white">
                  {registration.athleteName ?? "Rostered player"}
                </span>
                <button
                  className="rounded-md border border-red-300/25 px-2 py-1 text-xs font-black text-red-100 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={Boolean(savingKey)}
                  onClick={() => void removePlayer(registration)}
                  type="button"
                >
                  {savingKey === `player-remove-${registration.id}`
                    ? "Removing..."
                    : "Remove"}
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    );
  }

  return (
    <details
      className="gd-card-light gd-card-interactive group overflow-hidden rounded-lg"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3">
        <span>
          <span className="block text-base font-black text-slate-950">
            {title}
          </span>
          <span className="mt-0.5 block text-xs text-slate-500">
            {showCoaches
              ? `${rosteredRegistrations.length} rostered / ${activeTeamCoachAssignments.length} coaches`
              : `${rosteredRegistrations.length} rostered players`}
          </span>
        </span>
        <span className="text-lg font-black text-blue-600 transition group-open:rotate-90">
          &rsaquo;
        </span>
      </summary>

      {message && (
        <p className="mx-3 mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-bold text-emerald-700">
          {message}
        </p>
      )}
      {error && (
        <p className="mx-3 mb-3 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs font-bold text-red-700">
          {error}
        </p>
      )}

      <div className="space-y-2 border-t border-slate-200 p-3">
        <details
          className="gd-card-light group/player overflow-hidden rounded-lg"
          open={playersDefaultOpen}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3">
            <span>
              <span className="block font-black text-slate-950">Players</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                {rosteredRegistrations.length} rostered
              </span>
            </span>
            <span className="text-lg font-black text-blue-600 transition group-open/player:rotate-90">
              &rsaquo;
            </span>
          </summary>
          <div className="border-t border-slate-200 p-3">
            <details className="group/add-player overflow-hidden rounded-lg border border-blue-100/70 bg-white/70">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3">
                <span className="font-black text-slate-950">Add player</span>
                <span className="text-xl font-black text-blue-600 transition group-open/add-player:rotate-90">
                  &rsaquo;
                </span>
              </summary>
              <div className="grid gap-3 border-t border-slate-200 p-3 sm:grid-cols-2">
                <input
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) => setAthleteFirstName(event.target.value)}
                  placeholder="Player first name"
                  value={athleteFirstName}
                />
                <input
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) => setAthleteLastName(event.target.value)}
                  placeholder="Player last name"
                  value={athleteLastName}
                />
                <input
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) => setGrade(event.target.value)}
                  placeholder="Grade"
                  value={grade}
                />
                <input
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) => setJerseySize(event.target.value)}
                  placeholder="Uniform size"
                  value={jerseySize}
                />
                <input
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) => setSchool(event.target.value)}
                  placeholder="School"
                  value={school}
                />
                <input
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) => setDateOfBirth(event.target.value)}
                  type="date"
                  value={dateOfBirth}
                />
                <input
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 sm:col-span-2"
                  onChange={(event) => setParentName(event.target.value)}
                  placeholder="Parent or guardian name, optional"
                  value={parentName}
                />
                <input
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) => setParentEmail(event.target.value)}
                  placeholder="Parent email, optional"
                  type="email"
                  value={parentEmail}
                />
                <input
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) => setParentPhone(event.target.value)}
                  placeholder="Parent phone, optional"
                  value={parentPhone}
                />
                <button
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
                  disabled={Boolean(savingKey)}
                  onClick={() => void addPlayer()}
                  type="button"
                >
                  {savingKey === "player-add" ? "Adding..." : "+ Add player"}
                </button>
              </div>
            </details>

            <div className="mt-3 space-y-2">
              {rosteredRegistrations.length === 0 ? (
                <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                  No rostered players yet.
                </p>
              ) : (
                rosteredRegistrations.map((registration) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-md border border-blue-100/70 bg-white/70 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
                    key={registration.id}
                  >
                    <span className="min-w-0 truncate text-sm font-black">
                      {registration.athleteName ?? "Rostered player"}
                    </span>
                    <button
                      className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-black text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={Boolean(savingKey)}
                      onClick={() => void removePlayer(registration)}
                      type="button"
                    >
                      {savingKey === `player-remove-${registration.id}`
                        ? "Removing..."
                        : "Remove"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </details>

        {showCoaches && (
        <details className="gd-card-light group/coach overflow-hidden rounded-lg">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3">
            <span>
              <span className="block font-black text-slate-950">Coaches</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                {activeTeamCoachAssignments.length} assigned
              </span>
            </span>
            <span className="text-lg font-black text-blue-600 transition group-open/coach:rotate-90">
              &rsaquo;
            </span>
          </summary>
          <div className="border-t border-slate-200 p-3">
            <details className="group/add-coach overflow-hidden rounded-lg border border-blue-100/70 bg-white/70">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3">
                <span className="font-black text-slate-950">Add coach</span>
                <span className="text-xl font-black text-blue-600 transition group-open/add-coach:rotate-90">
                  &rsaquo;
                </span>
              </summary>
              <div className="grid gap-3 border-t border-slate-200 p-3 sm:grid-cols-2">
                <p className="rounded-md border border-blue-100 bg-blue-50 p-3 text-sm font-bold text-blue-800 sm:col-span-2">
                  Use the exact email this coach signs in with. That email
                  unlocks their coach dashboard for this team.
                </p>
                <input
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) => setCoachName(event.target.value)}
                  placeholder="Coach name"
                  value={coachName}
                />
                <input
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) => setCoachEmail(event.target.value)}
                  placeholder="Coach email"
                  type="email"
                  value={coachEmail}
                />
                <button
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
                  disabled={Boolean(savingKey)}
                  onClick={() => void addCoach()}
                  type="button"
                >
                  {savingKey === "coach-add" ? "Adding..." : "+ Add coach"}
                </button>
              </div>
            </details>

            <div className="mt-3 space-y-2">
              {activeTeamCoachAssignments.length === 0 ? (
                <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                  No coaches assigned yet.
                </p>
              ) : (
                activeTeamCoachAssignments.map((assignment) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-md border border-blue-100/70 bg-white/70 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
                    key={assignment.id}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black">
                        {getCoachName(assignment, coaches)}
                      </span>
                      <span className="block truncate text-xs font-semibold text-slate-500">
                        {assignment.email}
                      </span>
                    </span>
                    <button
                      className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-black text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={Boolean(savingKey)}
                      onClick={() => void removeCoach(assignment)}
                      type="button"
                    >
                      {savingKey === `coach-remove-${assignment.id}`
                        ? "Removing..."
                        : "Remove"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </details>
        )}
      </div>
    </details>
  );
}
