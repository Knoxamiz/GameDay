"use client";

import { useMemo, useState } from "react";
import type { CoachAssignment } from "../data/coachAssignmentRecords";
import type { Coach } from "../data/coaches";
import AdminJoinLinkButton from "./AdminJoinLinkButton";

type AdminTeamCoachAccessManagerProps = {
  activeOrganizationId: string;
  coachAssignments: CoachAssignment[];
  coaches: Coach[];
  teamId: string;
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

function getCoachName(
  assignment: CoachAssignment,
  coaches: Coach[],
  fallbackName = "Coach",
) {
  const coach = coaches.find((candidate) => candidate.id === assignment.coachId);

  return coach?.name || assignment.email || fallbackName;
}

async function readResponseError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as ApiResponse | null;

  return typeof body?.error === "string" ? body.error : fallback;
}

export default function AdminTeamCoachAccessManager({
  activeOrganizationId,
  coachAssignments,
  coaches,
  teamId,
}: AdminTeamCoachAccessManagerProps) {
  const [coachEmail, setCoachEmail] = useState("");
  const [coachName, setCoachName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
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

    if (!response.ok) {
      throw new Error(
        await readResponseError(response, "Could not update coach access."),
      );
    }

    const body = (await response.json().catch(() => null)) as ApiResponse | null;

    return body?.message ?? "Coach access saved.";
  }

  async function addCoach() {
    clearStatus();
    setSavingKey("coach-add");

    try {
      const email = normalizeEmail(coachEmail);

      if (!email) {
        throw new Error("Enter the coach email they will use to sign in.");
      }

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
        addError instanceof Error
          ? addError.message
          : "Could not add this coach.",
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

  return (
    <section className="gd-card-dark rounded-lg p-3 backdrop-blur">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-black text-white">Coach access</h2>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-black text-blue-100">
              {activeTeamCoachAssignments.length} assigned
            </span>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Add the coach email, then send the access link.
          </p>
        </div>
        <AdminJoinLinkButton
          className="shrink-0 rounded-md border border-blue-300/25 px-2.5 py-1.5 text-xs font-black text-blue-100 hover:bg-blue-500/10"
          errorMessage="Could not copy the coach access link."
          joinPath="/signup?intent=invite"
          label="Copy coach link"
          successMessage="Coach access link copied."
        />
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

      <div className="mt-3 grid gap-2 md:grid-cols-[1fr_1.3fr_auto]">
        <input
          className="rounded-md border border-blue-300/20 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-blue-300"
          onChange={(event) => {
            setCoachName(event.target.value);
            setError(null);
          }}
          placeholder="Coach name"
          value={coachName}
        />
        <input
          className="rounded-md border border-blue-300/20 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-blue-300"
          onChange={(event) => {
            setCoachEmail(event.target.value);
            setError(null);
          }}
          placeholder="Coach sign-in email"
          type="email"
          value={coachEmail}
        />
        <button
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-black text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={Boolean(savingKey)}
          onClick={() => void addCoach()}
          type="button"
        >
          {savingKey === "coach-add" ? "Adding..." : "Add coach"}
        </button>
      </div>

      <div className="mt-3 divide-y divide-white/10 rounded-md border border-blue-300/10 bg-white/[0.035]">
        {activeTeamCoachAssignments.length === 0 ? (
          <p className="px-3 py-2 text-sm font-semibold text-slate-400">
            No coaches assigned yet.
          </p>
        ) : (
          activeTeamCoachAssignments.map((assignment) => (
            <div
              className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              key={assignment.id}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-white">
                  {getCoachName(assignment, coaches)}
                </span>
                <span className="block truncate text-xs font-semibold text-slate-400">
                  {assignment.email}
                </span>
              </span>
              <div className="flex shrink-0 items-center gap-2">
                <AdminJoinLinkButton
                  className="rounded-md border border-blue-300/25 px-2.5 py-1.5 text-xs font-black text-blue-100 hover:bg-blue-500/10"
                  errorMessage="Could not copy the coach access link."
                  joinPath="/signup?intent=invite"
                  label="Copy link"
                  successMessage="Coach access link copied."
                />
                <button
                  className="rounded-md border border-red-300/25 px-2.5 py-1.5 text-xs font-black text-red-100 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
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
    </section>
  );
}
