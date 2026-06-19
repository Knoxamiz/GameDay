"use client";

import { useState } from "react";
import {
  getCoachAssignmentStatusLabel,
  isArchivedCoachAssignment,
  type CoachAssignment,
  type CoachAssignmentStatus,
} from "../data/coachAssignmentRecords";
import type { Coach } from "../data/coaches";
import {
  getTeamStatusLabel,
  isActiveTeam,
  type Team,
} from "../data/teams";

type CoachAssignmentLifecycleManagerProps = {
  activeOrganizationId: string;
  assignments: CoachAssignment[];
  coaches: Coach[];
  embedded?: boolean;
  teams: Team[];
};

type SetupResponse = {
  error?: string;
  message?: string;
};

function AssignmentEditor({
  activeOrganizationId,
  assignment,
  coach,
  isSaving,
  onSave,
  teams,
}: {
  activeOrganizationId: string;
  assignment: CoachAssignment;
  coach?: Coach;
  isSaving: boolean;
  onSave: (
    assignmentId: string,
    payload: Record<string, unknown>,
  ) => Promise<void>;
  teams: Team[];
}) {
  const [name, setName] = useState(coach?.name ?? assignment.email);
  const [email, setEmail] = useState(assignment.email);
  const [uid, setUid] = useState(assignment.uid ?? coach?.uid ?? "");
  const [status, setStatus] = useState<CoachAssignmentStatus>(
    assignment.status,
  );
  const [teamIds, setTeamIds] = useState(assignment.teamIds);

  function toggleTeam(teamId: string) {
    setTeamIds((currentTeamIds) =>
      currentTeamIds.includes(teamId)
        ? currentTeamIds.filter((currentTeamId) => currentTeamId !== teamId)
        : [...currentTeamIds, teamId],
    );
  }

  return (
    <details className="rounded-lg border border-blue-300/20 bg-slate-950/75">
      <summary className="cursor-pointer list-none p-3 [&::-webkit-details-marker]:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-white">
              {coach?.name ?? assignment.email}
            </p>
            <p className="mt-1 text-xs text-slate-400">{assignment.email}</p>
          </div>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
            {getCoachAssignmentStatusLabel(assignment)}
          </span>
        </div>
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
          <span className="text-xs font-black uppercase text-slate-400">Email</span>
          <input
            className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/75 px-3 py-2 text-white outline-none"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />
        </label>
        <details className="rounded-md border border-white/10 bg-white/5 p-2.5">
          <summary className="cursor-pointer text-sm font-semibold text-slate-300">
            Technical details
          </summary>
          <p className="mt-3 break-all text-xs text-slate-500">
            Internal Assignment ID: {assignment.id}
          </p>
          <label className="mt-3 block">
            <span className="text-sm font-semibold text-slate-300">
              Firebase UID
            </span>
            <input
              className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/75 px-3 py-2 text-white outline-none"
              onChange={(event) => setUid(event.target.value)}
              value={uid}
            />
          </label>
        </details>
        <label className="block">
          <span className="text-xs font-black uppercase text-slate-400">Status</span>
          <select
            className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/75 px-3 py-2 text-white"
            onChange={(event) =>
              setStatus(event.target.value as CoachAssignmentStatus)
            }
            value={status}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>
        </label>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-slate-300">
            Teams
          </legend>
          {teams.map((team) => {
            const isSelected = teamIds.includes(team.id);
            const canSelect = isActiveTeam(team) || isSelected;

            return (
              <label
                className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/5 p-2.5 text-sm font-semibold text-slate-300"
                key={team.id}
              >
                <span>
                  {team.name} ({getTeamStatusLabel(team)})
                </span>
                <input
                  checked={isSelected}
                  disabled={!canSelect}
                  onChange={() => toggleTeam(team.id)}
                  type="checkbox"
                />
              </label>
            );
          })}
        </fieldset>

        {(status === "inactive" || status === "archived") && (
          <p className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-2.5 text-xs text-yellow-100">
            This coach will lose roster and event access for this organization.
            Other organizations remain unchanged.
          </p>
        )}

        <button
          className="w-full rounded-md bg-blue-500 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving}
          onClick={() =>
            void onSave(assignment.id, {
              actionType: "coach-assignment",
              assignmentId: assignment.id,
              coachId: assignment.coachId,
              email,
              name,
              organizationId: activeOrganizationId,
              status,
              teamIds,
              uid,
            })
          }
          type="button"
        >
          {isSaving ? "Saving Assignment..." : "Save Assignment"}
        </button>
      </div>
    </details>
  );
}

export default function CoachAssignmentLifecycleManager({
  activeOrganizationId,
  assignments,
  coaches,
  embedded = false,
  teams,
}: CoachAssignmentLifecycleManagerProps) {
  const [showArchived, setShowArchived] = useState(false);
  const [savingAssignmentId, setSavingAssignmentId] = useState<string | null>(
    null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const coachById = new Map(coaches.map((coach) => [coach.id, coach]));
  const visibleAssignments = assignments.filter(
    (assignment) =>
      showArchived || !isArchivedCoachAssignment(assignment),
  );

  async function saveAssignment(
    assignmentId: string,
    payload: Record<string, unknown>,
  ) {
    setError(null);
    setMessage(null);
    setSavingAssignmentId(assignmentId);

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
        throw new Error(body?.error ?? "Could not update coach assignment.");
      }

      setMessage(body?.message ?? "Coach assignment updated.");
      window.setTimeout(() => window.location.reload(), 600);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not update coach assignment.",
      );
    } finally {
      setSavingAssignmentId(null);
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
          <h2 className="text-base font-black">Manage Coach Assignments</h2>
          <p className="mt-1 text-sm text-slate-300">
            Assignment lifecycle applies only to the active organization.
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-400">
          <input
            checked={showArchived}
            onChange={(event) => setShowArchived(event.target.checked)}
            type="checkbox"
          />
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
        {visibleAssignments.length === 0 ? (
          <p className="rounded-md border border-white/10 bg-white/5 p-2.5 text-sm text-slate-300">
            No coach assignments in this view.
          </p>
        ) : (
          visibleAssignments.map((assignment) => (
            <AssignmentEditor
              activeOrganizationId={activeOrganizationId}
              assignment={assignment}
              coach={coachById.get(assignment.coachId)}
              isSaving={savingAssignmentId === assignment.id}
              key={assignment.id}
              onSave={saveAssignment}
              teams={teams}
            />
          ))
        )}
      </div>
    </section>
  );
}
