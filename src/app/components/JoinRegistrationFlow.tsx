"use client";

import Link from "next/link";
import { useState } from "react";
import type { RegistrationInvite } from "../data/invites";
import {
  summarizeDocumentRequirements,
  type DocumentRequirementStatus,
} from "../data/documents";
import type { Organization } from "../data/organizations";
import { getOrganizationWorkspaceType } from "../data/organizations";
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
      <span className="text-sm font-black text-slate-700">{label}</span>
      <input
        className="mt-2 w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
  const isTeamBuilderInvite =
    getOrganizationWorkspaceType(organization) === "single_team";
  const teamName = team?.name ?? invite.title;
  const teamDivision = team?.division ?? team?.ageGroup ?? team?.label;
  const teamSeason = team?.season;

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
      inviteCode: invite.inviteCode,
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
        <div className="rounded-lg border border-emerald-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-black uppercase text-emerald-700">
            Registration Submitted
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">
            {confirmedAthleteName}
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            {team?.name ?? "Team TBD"}
          </p>
          <p className="mt-5 rounded-md bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
            {confirmationMessage}
          </p>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 text-sm shadow-sm">
          <p className="font-black text-slate-500">Registration ID</p>
          <p className="mt-1 break-words font-black text-slate-950">
            {submissionResult.registrationId}
          </p>
          <p className="mt-4 font-black text-slate-500">Status</p>
          <p className="mt-1 font-black text-blue-700">
            {submissionResult.status}
          </p>
          <p className="mt-4 font-black text-slate-500">Parent</p>
          <p className="mt-1 font-black text-slate-950">
            {confirmedParentName}
          </p>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">What Is Still Needed?</h2>
          <p
            className={`mt-3 text-sm font-semibold ${
              missingTotal > 0
                ? "text-orange-700"
                : "text-emerald-700"
            }`}
          >
            {missingTotal > 0
              ? `${missingTotal} item${
                  missingTotal === 1 ? "" : "s"
                } still missing. You can finish these from your parent home.`
              : "All requested documents and payment records were submitted for review."}
          </p>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            {documentRequirements.map((requirement) => (
              <p key={requirement.label} className="flex justify-between gap-3">
                <span>{requirement.label}</span>
                <span
                  className={
                    requirement.status === "Uploaded"
                      ? "font-black text-orange-700"
                      : "font-black text-slate-500"
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
                      ? "font-black text-orange-700"
                      : "font-black text-slate-500"
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
          className="mt-4 block w-full rounded-md bg-blue-600 py-3 text-center font-black text-white hover:bg-blue-700"
        >
          Go To Parent Home
        </Link>
      </>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-black uppercase text-blue-700">
          {isTeamBuilderInvite ? "Team Builder Registration" : "Team Registration"}
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">{teamName}</h1>
        <p className="mt-3 text-sm font-semibold text-slate-600">
          {organization?.name ?? "GameDay registration"}
        </p>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-md bg-slate-50 p-3">
            <p className="font-semibold text-slate-500">Team</p>
            <p className="mt-1 font-black text-slate-950">{teamName}</p>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="font-semibold text-slate-500">Division</p>
            <p className="mt-1 font-black text-slate-950">
              {teamDivision ?? "Not listed"}
            </p>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="font-semibold text-slate-500">Season</p>
            <p className="mt-1 font-black text-slate-950">
              {teamSeason ?? "Not listed"}
            </p>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="font-semibold text-slate-500">Next step</p>
            <p className="mt-1 font-black text-slate-950">
              Add parent and player info
            </p>
          </div>
        </div>
        {invite.description && (
          <p className="mt-3 text-sm font-semibold text-slate-600">
            {invite.description}
          </p>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black">Parent / Guardian</h2>
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

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black">Add Player</h2>
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
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

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">Documents</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Upload now if you have the files. You can also finish later.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              documentSummary.missing > 0
                ? "bg-orange-50 text-orange-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {documentSummary.missing} Missing
          </span>
        </div>

        <div className="mt-4 space-y-3 text-sm text-slate-600">
          {documentRequirements.length > 0 ? (
            documentRequirements.map((requirement) => (
            <div key={requirement.label} className="rounded-md bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-slate-950">{requirement.label}</p>
                  {requirement.description && (
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {requirement.description}
                    </p>
                  )}
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    requirement.status === "Uploaded"
                      ? "bg-orange-50 text-orange-700"
                      : "bg-white text-slate-500"
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
                className="mt-3 w-full rounded-md border border-slate-200 bg-white py-3 font-black text-slate-700 hover:bg-slate-100"
              >
                {requirement.status === "Uploaded"
                  ? "Remove Upload"
                  : "Mark Uploaded"}
              </button>
            </div>
            ))
          ) : (
            <p className="rounded-md bg-slate-50 p-4 font-semibold text-slate-600">
              No document uploads are requested right now.
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">Payment</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              If your organization asks for a payment record, mark it here so
              staff can review it.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              paymentSummary.missing > 0
                ? "bg-orange-50 text-orange-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {paymentSummary.missing} Missing
          </span>
        </div>

        <div className="mt-4 space-y-3 text-sm text-slate-600">
          {paymentRequirements.length > 0 ? (
            paymentRequirements.map((requirement) => (
            <div key={requirement.label} className="rounded-md bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-slate-950">{requirement.label}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    ${requirement.amountDue} due. {requirement.description}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    requirement.status === "Submitted"
                      ? "bg-orange-50 text-orange-700"
                      : "bg-white text-slate-500"
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
                className="mt-3 w-full rounded-md border border-slate-200 bg-white py-3 font-black text-slate-700 hover:bg-slate-100"
              >
                {requirement.status === "Submitted"
                  ? "Remove Payment Record"
                  : "Record Payment"}
              </button>
            </div>
            ))
          ) : (
            <p className="rounded-md bg-slate-50 p-4 font-semibold text-slate-600">
              No payment record is requested right now.
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black">Ready to submit?</h2>
        <p
          className={`mt-3 text-sm font-semibold ${
            missingTotal > 0 ? "text-orange-700" : "text-emerald-700"
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
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
          {submissionError}
        </p>
      )}

      <button
        type="button"
        disabled={isSubmitting}
        onClick={submitRegistration}
        className="mt-4 w-full rounded-md bg-blue-600 py-3 font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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
