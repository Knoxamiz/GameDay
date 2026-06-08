"use client";

import { getAthleteById } from "../data/athletes";
import {
  getDocumentRequirementsByRegistrationId,
  getDocumentRequirementsByRegistrationIds,
  isDocumentBlocked,
  isDocumentMissing,
  isDocumentNeedsReview,
  isDocumentOpen,
  summarizeDocumentRequirements,
  type DocumentRequirement,
  type DocumentRequirementStatus,
} from "../data/documents";
import {
  getPaymentRequirementsByRegistrationId,
  getPaymentRequirementsByRegistrationIds,
  isPaymentBlocked,
  isPaymentMissing,
  isPaymentNeedsReview,
  isPaymentOpen,
  summarizePaymentRequirements,
  type PaymentRequirement,
  type PaymentRequirementStatus,
} from "../data/payments";
import { getParentById } from "../data/parents";
import {
  isRequirementBlocked,
  isRequirementMissing,
  isRequirementNeedsReview,
  isRequirementOpen,
  registrationAdminDecisionOptions,
  summarizeRegistrationRequirements,
  type Registration,
  type RegistrationRequirementStatus,
  type RegistrationStatus,
} from "../data/registrations";
import { getTeamById } from "../data/teams";
import {
  saveDocumentRequirementStatus,
  useDocumentRequirements,
} from "./documentRequirementState";
import {
  savePaymentRequirementStatus,
  usePaymentRequirements,
} from "./paymentRequirementState";
import RegistrationStatusBadge from "./RegistrationStatusBadge";
import {
  saveRegistrationRequirementStatus,
  useRegistrationRequirements,
} from "./registrationRequirementState";
import {
  saveRegistrationStatus,
  useRegistrationStatus,
  useRegistrationSummary,
} from "./registrationStatusState";

type RegistrationReviewBoardProps = {
  registrations: Registration[];
};

type RegistrationReviewCardProps = {
  registration: Registration;
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

function DocumentReviewSection({
  documents,
}: {
  documents: DocumentRequirement[];
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
                    onClick={() =>
                      saveDocumentRequirementStatus(document.id, option)
                    }
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
  payments,
}: {
  payments: PaymentRequirement[];
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
                    onClick={() => savePaymentRequirementStatus(payment.id, option)}
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

function RegistrationReviewCard({ registration }: RegistrationReviewCardProps) {
  const athlete = getAthleteById(registration.athleteId);
  const parent = getParentById(registration.parentId);
  const team = getTeamById(registration.teamId);
  const status = useRegistrationStatus(registration.id, registration.status);
  const requirements = useRegistrationRequirements(
    registration.id,
    registration.requirements,
  );
  const documents = useDocumentRequirements(
    getDocumentRequirementsByRegistrationId(registration.id),
  );
  const payments = usePaymentRequirements(
    getPaymentRequirementsByRegistrationId(registration.id),
  );
  const requirementSummary = summarizeRegistrationRequirements(requirements);
  const openRequirements = requirements.filter(isRequirementOpen);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {team?.label ?? "Team TBD"}
          </p>
          <h2 className="mt-2 text-xl font-bold">
            {athlete?.name ?? registration.athleteId}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Parent: {parent?.name ?? registration.parentName}
          </p>
        </div>
        <RegistrationStatusBadge status={status} />
      </div>

      <p className="mt-4 text-sm text-slate-300">
        {getStatusDetails(status, registration.details)}
      </p>

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
                      onClick={() =>
                        saveRegistrationRequirementStatus(
                          registration.id,
                          requirement.label,
                          option,
                        )
                      }
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

      <DocumentReviewSection documents={documents} />
      <PaymentReviewSection payments={payments} />

      <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-semibold">
        {registrationAdminDecisionOptions.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              saveRegistrationStatus(registration.id, option);
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
  registrations,
}: RegistrationReviewBoardProps) {
  const summary = useRegistrationSummary(registrations);
  const registrationIds = registrations.map((registration) => registration.id);
  const documents = useDocumentRequirements(
    getDocumentRequirementsByRegistrationIds(registrationIds),
  );
  const payments = usePaymentRequirements(
    getPaymentRequirementsByRegistrationIds(registrationIds),
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
        {registrations.map((registration) => (
          <RegistrationReviewCard
            key={registration.id}
            registration={registration}
          />
        ))}
      </div>
    </>
  );
}
