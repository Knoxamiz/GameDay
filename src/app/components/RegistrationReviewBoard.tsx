"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminRegistrationReviewPayload } from "../data/adminRegistrationReview";
import {
  isDocumentBlocked,
  isDocumentMissing,
  isDocumentNeedsReview,
  isDocumentOpen,
  summarizeDocumentRequirements,
  type DocumentRequirement,
  type DocumentRequirementStatus,
} from "../data/documents";
import {
  isPaymentBlocked,
  isPaymentMissing,
  isPaymentNeedsReview,
  isPaymentOpen,
  summarizePaymentRequirements,
  type PaymentRequirement,
  type PaymentRequirementStatus,
} from "../data/payments";
import {
  isRequirementBlocked,
  isRequirementMissing,
  isRequirementNeedsReview,
  isRequirementOpen,
  registrationAdminDecisionOptions,
  getRegistrationRosterStatus,
  getRosterStatusLabel,
  rosterStatusValues,
  summarizeRegistrationRequirements,
  type Registration,
  type RegistrationRequirementStatus,
  type RegistrationStatus,
} from "../data/registrations";
import { useDocumentRequirements } from "./documentRequirementState";
import { usePaymentRequirements } from "./paymentRequirementState";
import RegistrationStatusBadge from "./RegistrationStatusBadge";
import { useRegistrationRequirements } from "./registrationRequirementState";
import {
  useRegistrationStatus,
  useRegistrationSummary,
} from "./registrationStatusState";

type RegistrationReviewBoardProps = {
  activeOrganizationId: string;
  registrations: Registration[];
  source?: RegistrationReviewSource;
};

type RegistrationReviewCardProps = {
  activeOrganizationId: string;
  onReviewError: (message: string | null) => void;
  onReviewSuccess: (message: string) => void;
  registration: Registration;
  source: RegistrationReviewSource;
};

type RegistrationReviewSource = "empty" | "firestore";

type ReviewSyncOptions = {
  activeOrganizationId: string;
  onError: (message: string | null) => void;
  onSuccess: () => void;
  payload: AdminRegistrationReviewPayload;
  source: RegistrationReviewSource;
};

const requirementDecisionOptions: RegistrationRequirementStatus[] = [
  "Approved",
  "Waived",
  "Rejected",
];
const documentDecisionOptions: DocumentRequirementStatus[] = [
  "Approved",
  "Waived",
  "Rejected",
];
const paymentDecisionOptions: PaymentRequirementStatus[] = [
  "Paid",
  "Waived",
  "Rejected",
];

function getRequirementTone(status: RegistrationRequirementStatus) {
  if (status === "Approved" || status === "Waived") {
    return "bg-blue-500/20 text-blue-300";
  }

  if (status === "Submitted" || status === "Uploaded") {
    return "bg-yellow-500/20 text-yellow-200";
  }

  if (status === "Rejected") {
    return "bg-red-500/20 text-red-300";
  }

  return "bg-slate-700 text-slate-300";
}

function getDocumentTone(status: DocumentRequirementStatus) {
  if (status === "Approved" || status === "Waived") {
    return "bg-blue-500/20 text-blue-300";
  }

  if (status === "Submitted" || status === "Uploaded") {
    return "bg-yellow-500/20 text-yellow-200";
  }

  if (status === "Rejected") {
    return "bg-red-500/20 text-red-300";
  }

  return "bg-slate-700 text-slate-300";
}

function getPaymentTone(status: PaymentRequirementStatus) {
  if (status === "Paid" || status === "Waived") {
    return "bg-blue-500/20 text-blue-300";
  }

  if (status === "Submitted") {
    return "bg-yellow-500/20 text-yellow-200";
  }

  if (status === "Rejected") {
    return "bg-red-500/20 text-red-300";
  }

  return "bg-slate-700 text-slate-300";
}

async function getResponseError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as {
    error?: unknown;
  } | null;

  return typeof body?.error === "string" ? body.error : fallback;
}

async function syncAdminRegistrationReview(
  payload: AdminRegistrationReviewPayload,
  activeOrganizationId: string,
) {
  if (!payload.registrationId) {
    return;
  }

  const response = await fetch(
    `/api/admin/registrations/${payload.registrationId}/review`,
    {
    body: JSON.stringify({ ...payload, activeOrganizationId }),
      credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    method: "PATCH",
    },
  );

  if (!response.ok) {
    throw new Error(
      await getResponseError(response, "Could not review this registration."),
    );
  }
}

function saveAdminReviewChange({
  activeOrganizationId,
  onError,
  onSuccess,
  payload,
  source,
}: ReviewSyncOptions) {
  onError(null);

  if (source !== "firestore") {
    onError("Live registration review is not available.");
    return;
  }

  void syncAdminRegistrationReview(payload, activeOrganizationId)
    .then(onSuccess)
    .catch((error) =>
      onError(
        error instanceof Error
          ? error.message
          : "Could not review this registration.",
      ),
    );
}

function DocumentReviewSection({
  activeOrganizationId,
  documents,
  onReviewError,
  onReviewSaved,
  registrationId,
  source,
}: {
  activeOrganizationId: string;
  documents: DocumentRequirement[];
  onReviewError: (message: string | null) => void;
  onReviewSaved: () => void;
  registrationId: string;
  source: RegistrationReviewSource;
}) {
  const openDocuments = documents.filter(isDocumentOpen);
  const summary = summarizeDocumentRequirements(documents);

  return (
    <div className="mt-4 rounded-xl bg-slate-800 p-4 text-sm">
      <p className="font-semibold text-white">Documents</p>
      <p
        className={`mt-2 ${
          summary.open > 0 ? "text-yellow-200" : "text-blue-300"
        }`}
      >
        {summary.open > 0
          ? `${summary.open} open document${summary.open === 1 ? "" : "s"}`
          : "Documents clear"}
      </p>
      {openDocuments.length > 0 && (
        <div className="mt-3 space-y-3">
          {openDocuments.map((document) => (
            <div key={document.id} className="rounded-xl bg-slate-900 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{document.label}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {isDocumentBlocked(document)
                      ? "Parent needs to resubmit this document."
                      : isDocumentMissing(document)
                        ? "Parent still needs to upload this document."
                        : isDocumentNeedsReview(document)
                          ? "Ready for admin review."
                          : "Open document."}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getDocumentTone(
                    document.status,
                  )}`}
                >
                  {document.status}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs font-semibold">
                {documentDecisionOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      saveAdminReviewChange({
                        activeOrganizationId,
                        onError: onReviewError,
                        onSuccess: onReviewSaved,
                        payload: {
                          actionType: "requirement-status",
                          registrationId,
                          requirementId: document.id,
                          requirementLabel: document.label,
                          status: option,
                        },
                        source,
                      });
                    }}
                    className={`rounded-xl border px-2 py-2 ${
                      option === document.status
                        ? "border-blue-500 bg-blue-500/20 text-blue-200"
                        : "border-slate-700 bg-slate-950 text-slate-300"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PaymentReviewSection({
  activeOrganizationId,
  onReviewError,
  onReviewSaved,
  payments,
  registrationId,
  source,
}: {
  activeOrganizationId: string;
  onReviewError: (message: string | null) => void;
  onReviewSaved: () => void;
  payments: PaymentRequirement[];
  registrationId: string;
  source: RegistrationReviewSource;
}) {
  const openPayments = payments.filter(isPaymentOpen);
  const summary = summarizePaymentRequirements(payments);

  return (
    <div className="mt-4 rounded-xl bg-slate-800 p-4 text-sm">
      <p className="font-semibold text-white">Payments</p>
      <p
        className={`mt-2 ${
          summary.open > 0 ? "text-yellow-200" : "text-blue-300"
        }`}
      >
        {summary.open > 0
          ? `${summary.open} open payment${summary.open === 1 ? "" : "s"}`
          : "Payments clear"}
      </p>
      {openPayments.length > 0 && (
        <div className="mt-3 space-y-3">
          {openPayments.map((payment) => (
            <div key={payment.id} className="rounded-xl bg-slate-900 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{payment.label}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {isPaymentBlocked(payment)
                      ? "Parent needs to resubmit this payment."
                      : isPaymentMissing(payment)
                        ? `$${payment.amountDue} is still unpaid.`
                        : isPaymentNeedsReview(payment)
                          ? "Payment is ready for admin review."
                          : "Open payment."}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getPaymentTone(
                    payment.status,
                  )}`}
                >
                  {payment.status}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs font-semibold">
                {paymentDecisionOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      saveAdminReviewChange({
                        activeOrganizationId,
                        onError: onReviewError,
                        onSuccess: onReviewSaved,
                        payload: {
                          actionType: "payment-status",
                          amountDue: payment.amountDue,
                          description: payment.description,
                          label: payment.label,
                          paymentRequirementId: payment.id,
                          registrationId,
                          required: payment.required,
                          status: option,
                        },
                        source,
                      });
                    }}
                    className={`rounded-xl border px-2 py-2 ${
                      option === payment.status
                        ? "border-blue-500 bg-blue-500/20 text-blue-200"
                        : "border-slate-700 bg-slate-950 text-slate-300"
                    }`}
                  >
                    {option === "Paid" ? "Mark Paid" : option}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getStatusDetails(status: RegistrationStatus, details: string) {
  if (status === "Approved") {
    return "Registration is approved and cleared for team activities.";
  }

  if (status === "Rejected") {
    return "Registration has been rejected by admin review.";
  }

  return details;
}

function getRegistrationDocumentRequirements(
  registration: Registration,
): DocumentRequirement[] {
  return registration.requirements.map((requirement) => ({
    athleteId: registration.athleteId,
    description: requirement.description ?? "",
    id: `${registration.id}-${requirement.label.toLowerCase().replaceAll(" ", "-")}`,
    label: requirement.label,
    organizationId: registration.organizationId,
    parentId: registration.parentId,
    registrationId: registration.id,
    required: requirement.required ?? true,
    status: requirement.status,
    teamId: registration.teamId,
  }));
}

function RegistrationReviewCard({
  activeOrganizationId,
  onReviewError,
  onReviewSuccess,
  registration,
  source,
}: RegistrationReviewCardProps) {
  const router = useRouter();
  const status = useRegistrationStatus(registration.id, registration.status);
  const rosterStatus = getRegistrationRosterStatus(registration);
  const requirements = useRegistrationRequirements(
    registration.id,
    registration.requirements,
  );
  const documents = useDocumentRequirements(
    getRegistrationDocumentRequirements(registration),
  );
  const payments = usePaymentRequirements(
    registration.paymentRequirements ?? [],
  );
  const requirementSummary = summarizeRegistrationRequirements(requirements);
  const openRequirements = requirements.filter(isRequirementOpen);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {registration.teamId || "Team TBD"}
          </p>
          <h2 className="mt-2 text-xl font-bold">
            {registration.athleteName ?? registration.athleteId}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Parent: {registration.parentName}
          </p>
        </div>
        <RegistrationStatusBadge status={status} />
      </div>

      <p className="mt-4 text-sm text-slate-300">
        {getStatusDetails(status, registration.details)}
      </p>

      <div className="mt-4 rounded-xl bg-slate-800 p-4 text-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-white">Roster Status</p>
            <p className="mt-1 text-xs text-slate-400">
              Coach rosters only include rostered athletes.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              rosterStatus === "rostered"
                ? "bg-blue-500/20 text-blue-300"
                : rosterStatus === "inactive"
                  ? "bg-red-500/20 text-red-300"
                  : "bg-yellow-500/20 text-yellow-200"
            }`}
          >
            {getRosterStatusLabel(rosterStatus)}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs font-semibold">
          {rosterStatusValues.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                saveAdminReviewChange({
                  activeOrganizationId,
                  onError: onReviewError,
                  onSuccess: () => {
                    onReviewSuccess(
                      `${registration.athleteName ?? registration.athleteId} is ${getRosterStatusLabel(
                        option,
                      ).toLowerCase()}.`,
                    );
                    router.refresh();
                  },
                  payload: {
                    actionType: "roster-status",
                    registrationId: registration.id,
                    rosterStatus: option,
                  },
                  source,
                });
              }}
              className={`rounded-xl border px-2 py-2 ${
                option === rosterStatus
                  ? "border-blue-500 bg-blue-500/20 text-blue-200"
                  : "border-slate-700 bg-slate-950 text-slate-300"
              }`}
            >
              {getRosterStatusLabel(option)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-slate-800 p-4 text-sm">
        <p className="font-semibold text-white">Requirements</p>
        <p
          className={`mt-2 ${
            requirementSummary.open > 0 ? "text-yellow-200" : "text-blue-300"
          }`}
        >
          {requirementSummary.open > 0
            ? `${requirementSummary.open} open item${
                requirementSummary.open === 1 ? "" : "s"
              }`
            : "No open requirements"}
        </p>
        {openRequirements.length > 0 && (
          <div className="mt-3 space-y-3">
            {openRequirements.map((requirement) => (
              <div
                key={requirement.label}
                className="rounded-xl bg-slate-900 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">
                      {requirement.label}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {isRequirementBlocked(requirement)
                        ? "Parent needs to resubmit this item."
                        : isRequirementMissing(requirement)
                          ? "Parent still needs to submit this item."
                          : isRequirementNeedsReview(requirement)
                            ? "Ready for admin review."
                            : "Open item."}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getRequirementTone(
                      requirement.status,
                    )}`}
                  >
                    {requirement.status}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs font-semibold">
                  {requirementDecisionOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        saveAdminReviewChange({
                          activeOrganizationId,
                          onError: onReviewError,
                          onSuccess: () => router.refresh(),
                          payload: {
                            actionType: "requirement-status",
                            registrationId: registration.id,
                            requirementLabel: requirement.label,
                            status: option,
                          },
                          source,
                        });
                      }}
                      className={`rounded-xl border px-2 py-2 ${
                        option === requirement.status
                          ? "border-blue-500 bg-blue-500/20 text-blue-200"
                          : "border-slate-700 bg-slate-950 text-slate-300"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <DocumentReviewSection
        activeOrganizationId={activeOrganizationId}
        documents={documents}
        onReviewError={onReviewError}
        onReviewSaved={() => router.refresh()}
        registrationId={registration.id}
        source={source}
      />
      <PaymentReviewSection
        activeOrganizationId={activeOrganizationId}
        onReviewError={onReviewError}
        onReviewSaved={() => router.refresh()}
        payments={payments}
        registrationId={registration.id}
        source={source}
      />

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-semibold">
        {registrationAdminDecisionOptions.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              saveAdminReviewChange({
                activeOrganizationId,
                onError: onReviewError,
                onSuccess: () => router.refresh(),
                payload: {
                  actionType: "registration-status",
                  registrationId: registration.id,
                  status: option,
                },
                source,
              });
            }}
            className={`rounded-xl border px-2 py-3 ${
              option === status
                ? "border-blue-500 bg-blue-500/20 text-blue-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            {option === "Incomplete" ? "Incomplete" : option}
          </button>
        ))}
      </div>

      {registration.submittedDate && (
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Submitted {registration.submittedDate}
        </p>
      )}
    </div>
  );
}

export default function RegistrationReviewBoard({
  activeOrganizationId,
  registrations,
  source = "empty",
}: RegistrationReviewBoardProps) {
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

  const summary = useRegistrationSummary(registrations);
  const documents = useDocumentRequirements(
    registrations.flatMap(getRegistrationDocumentRequirements),
  );
  const payments = usePaymentRequirements(
    registrations.flatMap((registration) => registration.paymentRequirements ?? []),
  );
  const documentSummary = summarizeDocumentRequirements(documents);
  const paymentSummary = summarizePaymentRequirements(payments);

  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-slate-400">Pending</p>
          <p className="mt-2 text-2xl font-bold text-white">
            {summary.pendingRegistrations}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-slate-400">Incomplete</p>
          <p className="mt-2 text-2xl font-bold text-red-300">
            {summary.incompleteRegistrations}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-slate-400">Missing Docs</p>
          <p className="mt-2 text-2xl font-bold text-red-300">
            {documentSummary.missing}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-slate-400">Payments Open</p>
          <p className="mt-2 text-2xl font-bold text-yellow-200">
            {paymentSummary.open}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {reviewMessage && (
          <p className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-sm font-semibold text-blue-200">
            {reviewMessage}
          </p>
        )}
        {reviewError && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-semibold text-red-300">
            {reviewError}
          </p>
        )}
        {registrations.length === 0 && (
          <p className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300">
            No registrations exist for the active organization.
          </p>
        )}
        {registrations.map((registration) => (
          <RegistrationReviewCard
            activeOrganizationId={activeOrganizationId}
            key={registration.id}
            onReviewError={(message) => {
              setReviewMessage(null);
              setReviewError(message);
            }}
            onReviewSuccess={(message) => {
              setReviewError(null);
              setReviewMessage(message);
            }}
            registration={registration}
            source={source}
          />
        ))}
      </div>
    </>
  );
}
