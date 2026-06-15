"use client";

import { FormEvent, useState } from "react";
import type { Athlete } from "../data/athletes";
import type { ParentGuardian } from "../data/parents";
import type { ParentRegistrationLifecycleResult } from "../data/parentRegistrationLifecycle";
import {
  canParentDirectlyCorrectRegistration,
  isRegistrationTerminal,
  type Registration,
} from "../data/registrations";

type ParentRegistrationLifecyclePanelProps = {
  athlete: Athlete;
  parent: ParentGuardian;
  registration: Registration;
};

async function getResponseError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as {
    error?: unknown;
  } | null;

  return typeof body?.error === "string" ? body.error : fallback;
}

export default function ParentRegistrationLifecyclePanel({
  athlete,
  parent,
  registration,
}: ParentRegistrationLifecyclePanelProps) {
  const [athleteFirstName, setAthleteFirstName] = useState(athlete.firstName);
  const [athleteLastName, setAthleteLastName] = useState(athlete.lastName);
  const [grade, setGrade] = useState(athlete.grade);
  const [parentEmail, setParentEmail] = useState(parent.email);
  const [parentName, setParentName] = useState(parent.name);
  const [parentPhone, setParentPhone] = useState(parent.phone);
  const [school, setSchool] = useState(athlete.school);
  const [withdrawalReason, setWithdrawalReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const directCorrectionAllowed =
    canParentDirectlyCorrectRegistration(registration);
  const lifecycleClosed = isRegistrationTerminal(registration.status);
  const hasPendingChange =
    registration.parentChangeRequest?.status === "pending";
  const hasPendingWithdrawal =
    registration.withdrawalRequest?.status === "pending";

  async function save(payload: Record<string, unknown>) {
    setError(null);
    setMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/registrations/${registration.id}`, {
        body: JSON.stringify(payload),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });

      if (!response.ok) {
        throw new Error(
          await getResponseError(response, "Could not update registration."),
        );
      }

      const result = (await response.json()) as ParentRegistrationLifecycleResult;
      setMessage(result.message);
      window.setTimeout(() => window.location.reload(), 700);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not update registration.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function submitCorrection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void save({
      actionType: "correction",
      correction: {
        athleteFirstName,
        athleteLastName,
        grade,
        parentEmail,
        parentName,
        parentPhone,
        school,
      },
    });
  }

  return (
    <section className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-lg font-bold">Registration Changes</h2>
      <p className="mt-2 text-sm text-slate-300">
        {directCorrectionAllowed
          ? "These contact and athlete details can be corrected before admin review."
          : "Admin review has started. Changes and withdrawal now require approval."}
      </p>
      <p className="mt-2 text-xs text-slate-400">
        Organization, team, invite, registration status, roster status,
        document approvals, and payment status remain admin-controlled.
      </p>

      {registration.parentChangeRequest && (
        <p className="mt-3 rounded-xl bg-slate-800 p-3 text-sm text-slate-300">
          Correction request: {registration.parentChangeRequest.status}
        </p>
      )}
      {registration.withdrawalRequest && (
        <p className="mt-3 rounded-xl bg-slate-800 p-3 text-sm text-slate-300">
          Withdrawal request: {registration.withdrawalRequest.status}
        </p>
      )}
      {message && (
        <p className="mt-3 rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-sm font-semibold text-blue-200">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-semibold text-red-300">
          {error}
        </p>
      )}

      {!lifecycleClosed && (
        <form className="mt-4 space-y-3" onSubmit={submitCorrection}>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-slate-400">
                Athlete First Name
              </span>
              <input
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white"
                onChange={(event) => setAthleteFirstName(event.target.value)}
                required
                value={athleteFirstName}
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-400">
                Athlete Last Name
              </span>
              <input
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white"
                onChange={(event) => setAthleteLastName(event.target.value)}
                required
                value={athleteLastName}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-slate-400">Grade</span>
              <input
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white"
                onChange={(event) => setGrade(event.target.value)}
                value={grade}
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-400">School</span>
              <input
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white"
                onChange={(event) => setSchool(event.target.value)}
                value={school}
              />
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-semibold text-slate-400">
              Parent or Guardian Name
            </span>
            <input
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white"
              onChange={(event) => setParentName(event.target.value)}
              required
              value={parentName}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-slate-400">Email</span>
              <input
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white"
                onChange={(event) => setParentEmail(event.target.value)}
                type="email"
                value={parentEmail}
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-400">Phone</span>
              <input
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white"
                onChange={(event) => setParentPhone(event.target.value)}
                type="tel"
                value={parentPhone}
              />
            </label>
          </div>
          <button
            className="w-full rounded-xl bg-blue-500 py-3 font-semibold text-white disabled:opacity-60"
            disabled={isSaving || hasPendingChange || hasPendingWithdrawal}
            type="submit"
          >
            {isSaving
              ? "Saving..."
              : directCorrectionAllowed
                ? "Save Corrections"
                : "Request Corrections"}
          </button>
        </form>
      )}

      {!lifecycleClosed && (
        <details className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-4">
          <summary className="cursor-pointer font-semibold text-white">
            Withdraw Registration
          </summary>
          <p className="mt-3 text-sm text-slate-400">
            {directCorrectionAllowed
              ? "This registration has not been reviewed and will be withdrawn immediately."
              : "Admin approval is required because review has started."}
          </p>
          <label className="mt-3 block">
            <span className="text-xs font-semibold text-slate-400">
              Reason (optional)
            </span>
            <textarea
              className="mt-1 min-h-24 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-white"
              onChange={(event) => setWithdrawalReason(event.target.value)}
              value={withdrawalReason}
            />
          </label>
          <button
            className="mt-3 w-full rounded-xl border border-red-500/50 py-3 font-semibold text-red-200 disabled:opacity-60"
            disabled={isSaving || hasPendingChange || hasPendingWithdrawal}
            onClick={() =>
              void save({
                actionType: "withdrawal",
                reason: withdrawalReason,
              })
            }
            type="button"
          >
            {directCorrectionAllowed
              ? "Withdraw Registration"
              : "Request Withdrawal"}
          </button>
        </details>
      )}

      {lifecycleClosed && (
        <p className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-300">
          This registration is {registration.status.toLowerCase()} and its
          history remains available to the organization.
        </p>
      )}
    </section>
  );
}
