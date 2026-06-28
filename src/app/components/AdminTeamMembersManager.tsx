"use client";

import { useMemo, useRef, useState } from "react";
import type { CoachAssignment } from "../data/coachAssignmentRecords";
import type { Coach } from "../data/coaches";
import type { Registration } from "../data/registrations";
import AdminJoinLinkButton from "./AdminJoinLinkButton";

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

type RosterDraftRow = {
  athleteFirstName: string;
  athleteLastName: string;
  id: string;
  parentEmail: string;
  parentPhone: string;
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

function getPhoneFromLine(line: string) {
  return (
    line.match(
      /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/,
    )?.[0] ?? ""
  );
}

function createRosterDraftRow(
  values: Partial<Omit<RosterDraftRow, "id">> = {},
): RosterDraftRow {
  return {
    athleteFirstName: values.athleteFirstName ?? "",
    athleteLastName: values.athleteLastName ?? "",
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,
    parentEmail: values.parentEmail ?? "",
    parentPhone: values.parentPhone ?? "",
  };
}

function parseRosterLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[-*]\s*/, ""))
    .filter(Boolean)
    .map((line) => {
      const parentEmail = getEmailFromLine(line);
      const parentPhone = getPhoneFromLine(line);
      const namePart = line
        .replace(parentEmail, "")
        .replace(parentPhone, "")
        .replace(/[|,;-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const [athleteFirstName = "", ...lastNameParts] = namePart.split(" ");

      return {
        athleteFirstName,
        athleteLastName: lastNameParts.join(" "),
        parentEmail,
        parentPhone,
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
  const [draftRosterRows, setDraftRosterRows] = useState<RosterDraftRow[]>([
    createRosterDraftRow(),
  ]);
  const pasteRosterTextareaRef = useRef<HTMLTextAreaElement | null>(null);
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
  const readyRosterRows = useMemo(
    () =>
      draftRosterRows.filter((row) => normalizeText(row.athleteFirstName)),
    [draftRosterRows],
  );
  const rosterRowsNeedingDetails = useMemo(
    () =>
      readyRosterRows.filter(
        (row) =>
          !normalizeText(row.athleteLastName) ||
          (!normalizeText(row.parentEmail) && !normalizeText(row.parentPhone)),
      ),
    [readyRosterRows],
  );

  function updateDraftRosterRow(
    rowId: string,
    field: keyof Omit<RosterDraftRow, "id">,
    value: string,
  ) {
    setDraftRosterRows((rows) =>
      rows.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
    );
    setError(null);
  }

  function addDraftRosterRow() {
    setDraftRosterRows((rows) => [...rows, createRosterDraftRow()]);
    setError(null);
  }

  function removeDraftRosterRow(rowId: string) {
    setDraftRosterRows((rows) => {
      const nextRows = rows.filter((row) => row.id !== rowId);

      return nextRows.length > 0 ? nextRows : [createRosterDraftRow()];
    });
    setError(null);
  }

  function clearDraftRosterRows() {
    setBulkRosterText("");
    setDraftRosterRows([createRosterDraftRow()]);
    setError(null);
  }

  function pasteRosterRows() {
    const rows = parseRosterLines(bulkRosterText).map((player) =>
      createRosterDraftRow(player),
    );

    if (rows.length === 0) {
      setError("Paste at least one player name.");
      return;
    }

    setDraftRosterRows((currentRows) => [
      ...currentRows.filter((row) => normalizeText(row.athleteFirstName)),
      ...rows,
    ]);
    setBulkRosterText("");
    setError(null);
  }

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
    const players = readyRosterRows.map((row) => ({
      athleteFirstName: normalizeText(row.athleteFirstName),
      athleteLastName: normalizeText(row.athleteLastName),
      parentEmail: normalizeEmail(row.parentEmail),
      parentPhone: normalizeText(row.parentPhone),
    }));

    if (players.length === 0) {
      setError("Enter at least one player name.");
      return;
    }

    if (players.some((player) => !player.athleteFirstName)) {
      setError("Each line needs a player name.");
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
      setDraftRosterRows([createRosterDraftRow()]);
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
        <div className="flex flex-col gap-2 border-b border-white/10 pb-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black text-white">Roster Builder</h2>
              <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-black text-blue-100">
                {rosteredRegistrations.length} rostered
              </span>
              <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-[11px] font-black text-emerald-100">
                {readyRosterRows.length} ready to save
              </span>
              {rosterRowsNeedingDetails.length > 0 && (
                <span className="rounded-full bg-orange-400/15 px-2 py-1 text-[11px] font-black text-orange-100">
                  {rosterRowsNeedingDetails.length} can finish later
                </span>
              )}
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              Add names fast. Parent contact and missing details can be added
              when you have them.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-black text-white hover:bg-blue-500"
              onClick={addDraftRosterRow}
              type="button"
            >
              + Add player
            </button>
            <button
              className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-black text-slate-100 hover:bg-white/10"
              onClick={() => pasteRosterTextareaRef.current?.focus()}
              type="button"
            >
              Paste list
            </button>
            <button
              className="px-1.5 py-1 text-xs font-black text-blue-200 hover:text-white"
              onClick={clearDraftRosterRows}
              type="button"
            >
              Clear all
            </button>
          </div>
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

        <div className="mt-3 overflow-hidden rounded-lg border border-blue-300/15 bg-slate-950/25">
          <div className="hidden grid-cols-[1.2rem_1fr_1fr_1.25fr_1fr_4.5rem_2.25rem] gap-2 border-b border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-400 lg:grid">
            <span />
            <span>First name</span>
            <span>Last name</span>
            <span>Parent email</span>
            <span>Parent phone</span>
            <span>Status</span>
            <span />
          </div>
          {draftRosterRows.map((row, index) => {
            const hasFirstName = Boolean(normalizeText(row.athleteFirstName));
            const hasLastName = Boolean(normalizeText(row.athleteLastName));
            const hasContact = Boolean(
              normalizeText(row.parentEmail) || normalizeText(row.parentPhone),
            );
            const statusLabel = !hasFirstName
              ? "Draft"
              : hasLastName && hasContact
                ? "Complete"
                : "Name saved";

            return (
              <div
                className="grid gap-2 border-b border-white/10 p-2 last:border-b-0 lg:grid-cols-[1.2rem_1fr_1fr_1.25fr_1fr_4.5rem_2.25rem] lg:items-end"
                key={row.id}
              >
                <span className="hidden items-center pb-1.5 text-sm font-black text-slate-500 lg:flex">
                  {index + 1}
                </span>
                <label className="block">
                  <span className="text-[10px] font-black uppercase text-slate-400 lg:hidden">
                    First name
                  </span>
                  <input
                    className="mt-1 w-full rounded-md border border-blue-300/20 bg-slate-950/70 px-2 py-1.5 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-blue-300 lg:mt-0"
                    onChange={(event) =>
                      updateDraftRosterRow(
                        row.id,
                        "athleteFirstName",
                        event.target.value,
                      )
                    }
                    placeholder={index === 0 ? "Ryan" : "First name"}
                    value={row.athleteFirstName}
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-black uppercase text-slate-400 lg:hidden">
                    Last name
                  </span>
                  <input
                    className="mt-1 w-full rounded-md border border-blue-300/20 bg-slate-950/70 px-2 py-1.5 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-blue-300 lg:mt-0"
                    onChange={(event) =>
                      updateDraftRosterRow(
                        row.id,
                        "athleteLastName",
                        event.target.value,
                      )
                    }
                    placeholder="Last name"
                    value={row.athleteLastName}
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-black uppercase text-slate-400 lg:hidden">
                    Parent email
                  </span>
                  <input
                    className="mt-1 w-full rounded-md border border-blue-300/20 bg-slate-950/70 px-2 py-1.5 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-blue-300 lg:mt-0"
                    onChange={(event) =>
                      updateDraftRosterRow(
                        row.id,
                        "parentEmail",
                        event.target.value,
                      )
                    }
                    placeholder="Parent email"
                    value={row.parentEmail}
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-black uppercase text-slate-400 lg:hidden">
                    Parent phone
                  </span>
                  <input
                    className="mt-1 w-full rounded-md border border-blue-300/20 bg-slate-950/70 px-2 py-1.5 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-blue-300 lg:mt-0"
                    onChange={(event) =>
                      updateDraftRosterRow(
                        row.id,
                        "parentPhone",
                        event.target.value,
                      )
                    }
                    placeholder="Parent phone"
                    value={row.parentPhone}
                  />
                </label>
                <span
                  className={`self-end rounded-full px-2 py-1 text-center text-[11px] font-black ${
                    hasLastName && hasContact
                      ? "bg-emerald-400/20 text-emerald-100"
                      : hasFirstName
                        ? "bg-blue-400/15 text-blue-100"
                        : "bg-white/10 text-slate-300"
                  }`}
                >
                  {statusLabel}
                </span>
                <button
                  aria-label="Remove row"
                  className="self-end rounded-md border border-white/15 px-2 py-1 text-xs font-black text-slate-200 hover:bg-white/10"
                  onClick={() => removeDraftRosterRow(row.id)}
                  type="button"
                >
                  X
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-3 grid gap-2 rounded-lg border border-dashed border-blue-300/20 bg-white/[0.025] p-2 lg:grid-cols-[11rem_1fr_auto]">
          <p className="text-xs font-bold text-slate-300">
            <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
              Bulk add
            </span>
            Paste one player per line. Full names are best, but first names
            work when you are building the roster quickly.
          </p>
            <textarea
              ref={pasteRosterTextareaRef}
              className="min-h-16 rounded-md border border-blue-300/20 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-blue-300"
              onChange={(event) => {
                setBulkRosterText(event.target.value);
                setError(null);
              }}
              placeholder="Paste or type to add multiple players..."
              value={bulkRosterText}
            />
            <button
              className="rounded-md border border-white/15 px-3 py-2 text-xs font-black text-slate-100 hover:bg-white/10"
              onClick={pasteRosterRows}
              type="button"
            >
              Add from paste
            </button>
        </div>

        <button
          className="mt-3 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={Boolean(savingKey) || readyRosterRows.length === 0}
          onClick={() => void addBulkPlayers()}
          type="button"
        >
          {savingKey === "players-bulk-add" ? "Saving..." : "Save roster"}
        </button>
        <p className="mt-2 text-center text-[11px] font-semibold text-slate-500">
          No changes are saved until you click Save roster. Name-only rows can
          be finished later.
        </p>

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
                    <div className="flex shrink-0 items-start gap-2">
                      <AdminJoinLinkButton
                        className="rounded-md border border-blue-200 px-2.5 py-1.5 text-xs font-black text-blue-700 hover:bg-blue-50"
                        errorMessage="Could not copy the coach access link."
                        joinPath="/signup?intent=invite"
                        label="Copy access"
                        successMessage="Coach access link copied."
                      />
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
