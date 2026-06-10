"use client";

import Link from "next/link";
import { useState } from "react";
import type { RegistrationInvite } from "../data/invites";
import {
  summarizeDocumentRequirements,
  type DocumentRequirementStatus,
} from "../data/documents";
import type { Organization } from "../data/organizations";
import {
  summarizePaymentRequirements,
  type PaymentRequirementStatus,
} from "../data/payments";
import type { RegistrationRequirementStatus } from "../data/registrations";
import type {
  RegistrationSubmissionPayload,
  RegistrationSubmissionResult,
} from "../data/registrationSubmission";
import type { Team } from "../data/teams";

type JoinRegistrationFlowProps = {
  invite: RegistrationInvite;
  organization?: Organization;
  team?: Team;
};

type JoinFormState = {
  athleteFirstName: string;
  athleteLastName: string;
  grade: string;
  parentEmail: string;
  parentName: string;
  parentPhone: string;
  school: string;
};

type RegistrationSubmissionResponse = RegistrationSubmissionResult & {
  error?: string;
  reason?: string;
};

const emptyForm: JoinFormState = {
  athleteFirstName: "",
  athleteLastName: "",
  grade: "",
  parentEmail: "",
  parentName: "",
  parentPhone: "",
  school: "",
};

function TextField({
  label,
  name,
  onChange,
  value,
}: {
  label: string;
  name: keyof JoinFormState;
  onChange: (name: keyof JoinFormState, value: string) => void;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-300">{label}</span>
      <input
        className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
        onChange={(event) => onChange(name, event.target.value)}
        type="text"
        value={value}
      />
    </label>
  );
}

export default function JoinRegistrationFlow({
  invite,
  organization,
  team,
}: JoinRegistrationFlowProps) {
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] =
    useState<RegistrationSubmissionResult | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [documentStatusByRequirement, setDocumentStatusByRequirement] = useState<
    Record<string, DocumentRequirementStatus>
  >(
    Object.fromEntries(
      invite.documentRequirements.map((requirement) => [
        requirement.label,
        "Missing",
      ]),
    ),
  );
  const [paymentStatusByRequirement, setPaymentStatusByRequirement] = useState<
    Record<string, PaymentRequirementStatus>
  >(
    Object.fromEntries(
      invite.paymentRequirements.map((requirement) => [
        requirement.label,
        "Missing",
      ]),
    ),
  );
  const documentRequirements = invite.documentRequirements.map((requirement) => ({
    ...requirement,
    athleteId: "new-athlete",
    id: `new-document-${requirement.label}`,
    organizationId: invite.organizationId,
    parentId: "new-parent",
    registrationId: "new-registration",
    status: documentStatusByRequirement[requirement.label] ?? "Missing",
    teamId: invite.teamId,
  }));
  const paymentRequirements = invite.paymentRequirements.map((requirement) => ({
    ...requirement,
    amountPaid:
      paymentStatusByRequirement[requirement.label] === "Submitted"
        ? requirement.amountDue
        : 0,
    athleteId: "new-athlete",
    id: `new-payment-${requirement.label}`,
    organizationId: invite.organizationId,
    parentId: "new-parent",
    registrationId: "new-registration",
    status: paymentStatusByRequirement[requirement.label] ?? "Missing",
    teamId: invite.teamId,
  }));
  const documentSummary = summarizeDocumentRequirements(documentRequirements);
  const paymentSummary = summarizePaymentRequirements(paymentRequirements);
  const missingTotal = documentSummary.missing + paymentSummary.missing;
  const athleteName = [form.athleteFirstName, form.athleteLastName]
    .filter(Boolean)
    .join(" ");

  function updateForm(name: keyof JoinFormState, value: string) {
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function setDocumentStatus(
    requirementLabel: string,
    status: DocumentRequirementStatus,
  ) {
    setDocumentStatusByRequirement((currentStatuses) => ({
      ...currentStatuses,
      [requirementLabel]: status,
    }));
  }

  function setPaymentStatus(
    requirementLabel: string,
    status: PaymentRequirementStatus,
  ) {
    setPaymentStatusByRequirement((currentStatuses) => ({
      ...currentStatuses,
      [requirementLabel]: status,
    }));
  }

  async function submitRegistration() {
    const requirementStatuses = Object.fromEntries(
      documentRequirements.map((requirement) => [
        requirement.label,
        requirement.status as RegistrationRequirementStatus,
      ]),
    );
    const paymentStatuses = Object.fromEntries(
      paymentRequirements.map((requirement) => [
        requirement.label,
        requirement.status,
      ]),
    );
    const payload: RegistrationSubmissionPayload = {
      athlete: {
        firstName: form.athleteFirstName,
        grade: form.grade,
        lastName: form.athleteLastName,
        school: form.school,
      },
      inviteCode: invite.code,
      parent: {
        email: form.parentEmail,
        name: form.parentName,
        phone: form.parentPhone,
      },
      paymentStatuses,
      requirementStatuses,
    };

    setIsSubmitting(true);
    setSubmissionError(null);
    setSubmissionResult(null);

    try {
      const response = await fetch("/api/registrations", {
        body: JSON.stringify(payload),
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const result = (await response.json().catch(() => null)) as
        | RegistrationSubmissionResponse
        | null;

      if (!response.ok) {
        throw new Error(result?.error ?? "Could not submit registration.");
      }

      if (!result?.registrationId || !result.status) {
        throw new Error("Registration submitted without a confirmation ID.");
      }

      setSubmissionResult(result);
      setSubmitted(true);
    } catch (submitError) {
      setSubmissionError(
        submitError instanceof Error
          ? submitError.message
          : "Could not submit registration.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted && submissionResult) {
    const confirmedAthleteName =
      submissionResult.athleteName || athleteName || "New Athlete";
    const confirmedParentName = submissionResult.parentName || form.parentName;
    const confirmationMessage = `Registration submitted for ${confirmedAthleteName}. Parent: ${confirmedParentName}. Registration ID: ${submissionResult.registrationId}. Status: ${submissionResult.status}.`;

    return (
      <>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            {submissionResult.source === "firestore"
              ? "Registration Submitted"
              : "Preview Registration Submitted"}
          </p>
          <h1 className="mt-3 text-3xl font-bold">
            {confirmedAthleteName}
          </h1>
          <p className="mt-2 text-slate-300">{team?.name ?? "Team TBD"}</p>
          <p className="mt-5 text-sm font-semibold text-blue-300">
            {confirmationMessage}
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm">
          <p className="font-semibold text-slate-400">Registration ID</p>
          <p className="mt-1 break-words font-semibold text-white">
            {submissionResult.registrationId}
          </p>
          <p className="mt-4 font-semibold text-slate-400">Status</p>
          <p className="mt-1 font-semibold text-blue-300">
            {submissionResult.status}
          </p>
          <p className="mt-4 font-semibold text-slate-400">Parent</p>
          <p className="mt-1 font-semibold text-white">
            {confirmedParentName}
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">What Is Still Needed?</h2>
          <p
            className={`mt-3 text-sm font-semibold ${
              missingTotal > 0
                ? "text-yellow-200"
                : "text-blue-300"
            }`}
          >
            {missingTotal > 0
              ? `${missingTotal} item${
                  missingTotal === 1 ? "" : "s"
                } still missing. Admin can review or waive when appropriate.`
              : "All documents and payments were submitted for review."}
          </p>
          <div className="mt-4 space-y-2 text-sm text-slate-300">
            {documentRequirements.map((requirement) => (
              <p key={requirement.label} className="flex justify-between gap-3">
                <span>{requirement.label}</span>
                <span
                  className={
                    requirement.status === "Uploaded"
                      ? "font-semibold text-yellow-200"
                      : "font-semibold text-slate-300"
                  }
                >
                  {requirement.status}
                </span>
              </p>
            ))}
            {paymentRequirements.map((requirement) => (
              <p key={requirement.label} className="flex justify-between gap-3">
                <span>{requirement.label}</span>
                <span
                  className={
                    requirement.status === "Submitted"
                      ? "font-semibold text-yellow-200"
                      : "font-semibold text-slate-300"
                  }
                >
                  {requirement.status}
                </span>
              </p>
            ))}
          </div>
        </div>

        <Link
          href="/parent"
          className="mt-4 block w-full rounded-xl bg-blue-500 py-3 text-center font-semibold text-white"
        >
          Go To Parent Home
        </Link>
      </>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Team Invite
        </p>
        <h1 className="mt-3 text-3xl font-bold">{invite.title}</h1>
        <p className="mt-3 text-slate-300">
          {organization?.name ?? invite.organizationId}
        </p>
        <p className="mt-1 text-sm text-slate-400">{team?.name ?? "Team TBD"}</p>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
        <h2 className="text-lg font-bold">Parent / Guardian</h2>
        <div className="mt-4 space-y-4">
          <TextField
            label="Full Name"
            name="parentName"
            onChange={updateForm}
            value={form.parentName}
          />
          <TextField
            label="Email"
            name="parentEmail"
            onChange={updateForm}
            value={form.parentEmail}
          />
          <TextField
            label="Phone"
            name="parentPhone"
            onChange={updateForm}
            value={form.parentPhone}
          />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
        <h2 className="text-lg font-bold">Add Athlete</h2>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="First Name"
              name="athleteFirstName"
              onChange={updateForm}
              value={form.athleteFirstName}
            />
            <TextField
              label="Last Name"
              name="athleteLastName"
              onChange={updateForm}
              value={form.athleteLastName}
            />
          </div>
          <TextField
            label="Grade"
            name="grade"
            onChange={updateForm}
            value={form.grade}
          />
          <TextField
            label="School"
            name="school"
            onChange={updateForm}
            value={form.school}
          />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Required Documents</h2>
            <p className="mt-1 text-sm text-slate-400">
              Missing items warn the parent, but do not block submission.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              documentSummary.missing > 0
                ? "bg-yellow-500/20 text-yellow-200"
                : "bg-blue-500/20 text-blue-300"
            }`}
          >
            {documentSummary.missing} Missing
          </span>
        </div>

        <div className="mt-4 space-y-3 text-sm text-slate-300">
          {documentRequirements.map((requirement) => (
            <div key={requirement.label} className="rounded-xl bg-slate-800 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{requirement.label}</p>
                  {requirement.description && (
                    <p className="mt-1 text-xs text-slate-400">
                      {requirement.description}
                    </p>
                  )}
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    requirement.status === "Uploaded"
                      ? "bg-yellow-500/20 text-yellow-200"
                      : "bg-slate-700 text-slate-300"
                  }`}
                >
                  {requirement.status}
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setDocumentStatus(
                    requirement.label,
                    requirement.status === "Uploaded" ? "Missing" : "Uploaded",
                  )
                }
                className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-900 py-3 font-semibold text-white"
              >
                {requirement.status === "Uploaded"
                  ? "Remove Upload"
                  : "Mark Uploaded"}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Payment</h2>
            <p className="mt-1 text-sm text-slate-400">
              No real payment provider yet. This records the parent payment
              intent for admin review.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              paymentSummary.missing > 0
                ? "bg-yellow-500/20 text-yellow-200"
                : "bg-blue-500/20 text-blue-300"
            }`}
          >
            {paymentSummary.missing} Missing
          </span>
        </div>

        <div className="mt-4 space-y-3 text-sm text-slate-300">
          {paymentRequirements.map((requirement) => (
            <div key={requirement.label} className="rounded-xl bg-slate-800 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{requirement.label}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    ${requirement.amountDue} due. {requirement.description}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    requirement.status === "Submitted"
                      ? "bg-yellow-500/20 text-yellow-200"
                      : "bg-slate-700 text-slate-300"
                  }`}
                >
                  {requirement.status}
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setPaymentStatus(
                    requirement.label,
                    requirement.status === "Submitted" ? "Missing" : "Submitted",
                  )
                }
                className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-900 py-3 font-semibold text-white"
              >
                {requirement.status === "Submitted"
                  ? "Remove Payment Record"
                  : "Record Payment"}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-lg font-bold">Registration Readiness</h2>
        <p
          className={`mt-3 text-sm font-semibold ${
            missingTotal > 0 ? "text-yellow-200" : "text-blue-300"
          }`}
        >
          {missingTotal > 0
            ? `${missingTotal} item${
                missingTotal === 1 ? "" : "s"
              } still missing. You can submit now and finish later.`
            : "Ready to submit for admin review."}
        </p>
      </div>

      {submissionError && (
        <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-semibold text-red-300">
          {submissionError}
        </p>
      )}

      <button
        type="button"
        disabled={isSubmitting}
        onClick={submitRegistration}
        className="mt-4 w-full rounded-xl bg-blue-500 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting
          ? "Submitting..."
          : missingTotal > 0
            ? "Submit With Missing Items"
            : "Submit Registration"}
      </button>
    </>
  );
}
