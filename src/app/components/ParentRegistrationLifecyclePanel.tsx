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
    <section className="mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black">Update Player Info</h2>
      <p className="mt-2 text-sm font-semibold text-slate-600">
        {directCorrectionAllowed
          ? "These contact and player details can be corrected before review."
          : "Review has started. Changes and withdrawal now require staff approval."}
      </p>
      <p className="mt-2 text-xs font-semibold text-slate-500">
        Team placement, roster status, document approvals, and payment review
        are handled by your organization.
      </p>

      {registration.parentChangeRequest && (
        <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm font-semibold text-slate-600">
          Correction request: {registration.parentChangeRequest.status}
        </p>
      )}
      {registration.withdrawalRequest && (
        <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm font-semibold text-slate-600">
          Withdrawal request: {registration.withdrawalRequest.status}
        </p>
      )}
      {message && (
        <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
          {error}
        </p>
      )}

      {!lifecycleClosed && (
        <form className="mt-4 space-y-3" onSubmit={submitCorrection}>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-black text-slate-500">
                Player First Name
              </span>
              <input
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                onChange={(event) => setAthleteFirstName(event.target.value)}
                required
                value={athleteFirstName}
              />
            </label>
            <label className="block">
              <span className="text-xs font-black text-slate-500">
                Player Last Name
              </span>
              <input
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                onChange={(event) => setAthleteLastName(event.target.value)}
                required
                value={athleteLastName}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-black text-slate-500">Grade</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                onChange={(event) => setGrade(event.target.value)}
                value={grade}
              />
            </label>
            <label className="block">
              <span className="text-xs font-black text-slate-500">School</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                onChange={(event) => setSchool(event.target.value)}
                value={school}
              />
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-black text-slate-500">
              Parent or Guardian Name
            </span>
            <input
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              onChange={(event) => setParentName(event.target.value)}
              required
              value={parentName}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-black text-slate-500">Email</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                onChange={(event) => setParentEmail(event.target.value)}
                type="email"
                value={parentEmail}
              />
            </label>
            <label className="block">
              <span className="text-xs font-black text-slate-500">Phone</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                onChange={(event) => setParentPhone(event.target.value)}
                type="tel"
                value={parentPhone}
              />
            </label>
          </div>
          <button
            className="w-full rounded-md bg-blue-600 py-3 font-black text-white hover:bg-blue-700 disabled:opacity-60"
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
        <details className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
          <summary className="cursor-pointer font-black text-slate-950">
            Withdraw Registration
          </summary>
          <p className="mt-3 text-sm font-semibold text-slate-600">
            {directCorrectionAllowed
              ? "This registration has not been reviewed and will be withdrawn immediately."
              : "Staff approval is required because review has started."}
          </p>
          <label className="mt-3 block">
            <span className="text-xs font-black text-slate-500">
              Reason (optional)
            </span>
            <textarea
              className="mt-1 min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              onChange={(event) => setWithdrawalReason(event.target.value)}
              value={withdrawalReason}
            />
          </label>
          <button
            className="mt-3 w-full rounded-md border border-red-200 bg-white py-3 font-black text-red-700 hover:bg-red-50 disabled:opacity-60"
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
        <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-600">
          This registration is {registration.status.toLowerCase()} and its
          history remains available to the organization.
        </p>
      )}
    </section>
  );
}
