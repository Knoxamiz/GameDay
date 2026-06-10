"use client";

import { useState } from "react";
import {
  isDocumentBlocked,
  isDocumentCleared,
  isDocumentMissing,
  isDocumentNeedsReview,
  summarizeDocumentRequirements,
  type DocumentRequirement,
  type DocumentRequirementStatus,
} from "../data/documents";
import {
  isPaymentBlocked,
  isPaymentCleared,
  isPaymentMissing,
  isPaymentNeedsReview,
  summarizePaymentRequirements,
  type PaymentRequirement,
  type PaymentRequirementStatus,
} from "../data/payments";
import type { ParentPaymentRequirementUpdatePayload } from "../data/paymentRequirementUpdate";
import {
  isRequirementBlocked,
  isRequirementCleared,
  isRequirementMissing,
  isRequirementNeedsReview,
  summarizeRegistrationRequirements,
  type RegistrationRequirement,
  type RegistrationRequirementStatus,
} from "../data/registrations";
import {
  saveDocumentRequirementStatus,
  useDocumentRequirements,
} from "./documentRequirementState";
import {
  savePaymentRequirementStatus,
  usePaymentRequirements,
} from "./paymentRequirementState";
import {
  saveRegistrationRequirementStatus,
  useRegistrationRequirements,
} from "./registrationRequirementState";

type RegistrationRequirementsChecklistProps = {
  athleteId: string;
  documentRequirements?: DocumentRequirement[];
  organizationId: string;
  parentId: string;
  paymentRequirements?: PaymentRequirement[];
  registrationId: string;
  requirements: RegistrationRequirement[];
};

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

export default function RegistrationRequirementsChecklist({
  athleteId,
  documentRequirements: initialDocumentRequirements = [],
  organizationId,
  parentId,
  paymentRequirements: initialPaymentRequirements = [],
  registrationId,
  requirements,
}: RegistrationRequirementsChecklistProps) {
  const [uploadingRequirementId, setUploadingRequirementId] = useState<
    string | null
  >(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const currentRequirements = useRegistrationRequirements(
    registrationId,
    requirements,
  );
  const documentRequirements = useDocumentRequirements(
    initialDocumentRequirements,
  );
  const paymentRequirements = usePaymentRequirements(
    initialPaymentRequirements,
  );
  const summary = summarizeRegistrationRequirements(currentRequirements);
  const documentSummary = summarizeDocumentRequirements(documentRequirements);
  const paymentSummary = summarizePaymentRequirements(paymentRequirements);
  const totalOpenItems =
    summary.open + documentSummary.open + paymentSummary.open;
  const totalNeedsReview =
    summary.needsReview + documentSummary.needsReview + paymentSummary.needsReview;
  const totalBlocked =
    summary.blocked + documentSummary.blocked + paymentSummary.blocked;
  const totalMissing =
    summary.missing + documentSummary.missing + paymentSummary.missing;
  const summaryLabel =
    totalBlocked > 0
      ? `${totalBlocked} Needs Fix`
      : totalMissing > 0
        ? `${totalMissing} Missing`
        : totalNeedsReview > 0
          ? `${totalNeedsReview} Waiting Review`
          : "Ready";
  const summaryTone =
    totalBlocked > 0 || totalMissing > 0
      ? "text-red-300"
      : totalNeedsReview > 0
        ? "text-yellow-200"
        : "text-blue-300";

  async function getResponseError(response: Response, fallback: string) {
    const body = (await response.json().catch(() => null)) as {
      error?: unknown;
    } | null;

    return typeof body?.error === "string" ? body.error : fallback;
  }

  async function syncParentPaymentRequirementStatus(
    paymentRequirementId: string,
    label: string,
    amountDue: number,
    description: string,
    required: boolean,
    status: PaymentRequirementStatus,
  ) {
    if (
      !athleteId ||
      !organizationId ||
      !parentId ||
      !registrationId ||
      !paymentRequirementId
    ) {
      throw new Error("Missing payment registration context.");
    }

    const payload: ParentPaymentRequirementUpdatePayload = {
      amountDue,
      athleteId,
      description,
      label,
      organizationId,
      parentId,
      paymentRequirementId,
      registrationId,
      required,
      status,
    };

    const response = await fetch(`/api/registrations/${registrationId}/payments`, {
      body: JSON.stringify(payload),
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      method: "PATCH",
    });

    if (!response.ok) {
      throw new Error(
        await getResponseError(response, "Could not record payment."),
      );
    }
  }

  async function uploadParentRequirementDocument(
    requirementId: string,
    requirementLabel: string,
    file: File,
    saveLocalStatus: () => void,
  ) {
    if (
      !athleteId ||
      !organizationId ||
      !parentId ||
      !registrationId ||
      !requirementId
    ) {
      setActionError("Missing document registration context.");
      return;
    }

    setActionError(null);
    const formData = new FormData();
    formData.set("athleteId", athleteId);
    formData.set("file", file);
    formData.set("organizationId", organizationId);
    formData.set("parentId", parentId);
    formData.set("requirementId", requirementId);
    formData.set("requirementLabel", requirementLabel);

    setUploadingRequirementId(requirementId);

    try {
      const response = await fetch(`/api/registrations/${registrationId}/requirements`, {
        body: formData,
        credentials: "same-origin",
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(
          await getResponseError(response, "Could not upload document."),
        );
      }

      saveLocalStatus();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Could not upload document.",
      );
    } finally {
      setUploadingRequirementId((currentRequirementId) =>
        currentRequirementId === requirementId ? null : currentRequirementId,
      );
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-lg font-bold">Registration Status</h2>
      <p className={`mt-3 text-sm font-semibold ${summaryTone}`}>
        {summaryLabel}
      </p>
      {actionError && (
        <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-semibold text-red-300">
          {actionError}
        </p>
      )}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
        <div className="rounded-xl bg-slate-800 p-3">
          <p className="text-slate-400">Documents</p>
          <p className="mt-1 text-white">{documentSummary.open} Open</p>
        </div>
        <div className="rounded-xl bg-slate-800 p-3">
          <p className="text-slate-400">Payment</p>
          <p className="mt-1 text-white">{paymentSummary.open} Open</p>
        </div>
        <div className="rounded-xl bg-slate-800 p-3">
          <p className="text-slate-400">Total</p>
          <p className="mt-1 text-white">{totalOpenItems} Open</p>
        </div>
      </div>

      <div className="mt-4 space-y-3 text-sm text-slate-300">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Documents
        </h3>
        {documentRequirements.length > 0 ? (
          documentRequirements.map((requirement) => (
            <div key={requirement.id} className="rounded-xl bg-slate-800 p-4">
              <div className="flex items-center justify-between gap-3">
                <span>{requirement.label}</span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getDocumentTone(
                    requirement.status,
                  )}`}
                >
                  {requirement.status}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                {requirement.description}
              </p>
              {isDocumentNeedsReview(requirement) && (
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-yellow-200">
                  Waiting for admin review
                </p>
              )}
              {isDocumentCleared(requirement) && (
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-blue-300">
                  Cleared
                </p>
              )}
              {(isDocumentMissing(requirement) ||
                isDocumentBlocked(requirement)) && (
                <label
                  aria-disabled={uploadingRequirementId === requirement.id}
                  className="mt-3 block w-full cursor-pointer rounded-xl border border-slate-700 bg-slate-900 py-3 text-center font-semibold text-white"
                >
                  <input
                    className="sr-only"
                    disabled={uploadingRequirementId === requirement.id}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      event.currentTarget.value = "";

                      if (file) {
                        void uploadParentRequirementDocument(
                          requirement.id,
                          requirement.label,
                          file,
                          () =>
                            saveDocumentRequirementStatus(
                              requirement.id,
                              "Uploaded",
                            ),
                        );
                      }
                    }}
                    type="file"
                  />
                  {uploadingRequirementId === requirement.id
                    ? "Uploading..."
                    : isDocumentBlocked(requirement)
                      ? "Resubmit Document"
                      : "Upload / Submit Document"}
                </label>
              )}
            </div>
          ))
        ) : (
          <p>No document requirements listed.</p>
        )}

        <h3 className="pt-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Payment
        </h3>
        {paymentRequirements.length > 0 ? (
          paymentRequirements.map((requirement) => (
            <div key={requirement.id} className="rounded-xl bg-slate-800 p-4">
              <div className="flex items-center justify-between gap-3">
                <span>{requirement.label}</span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getPaymentTone(
                    requirement.status,
                  )}`}
                >
                  {requirement.status}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                ${requirement.amountDue} due. {requirement.description}
              </p>
              {isPaymentNeedsReview(requirement) && (
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-yellow-200">
                  Waiting for admin review
                </p>
              )}
              {isPaymentCleared(requirement) && (
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-blue-300">
                  Cleared
                </p>
              )}
              {(isPaymentMissing(requirement) ||
                isPaymentBlocked(requirement)) && (
                <button
                  type="button"
                  onClick={() => {
                    setActionError(null);

                    void syncParentPaymentRequirementStatus(
                      requirement.id,
                      requirement.label,
                      requirement.amountDue,
                      requirement.description,
                      requirement.required,
                      "Submitted",
                    )
                      .then(() =>
                        savePaymentRequirementStatus(
                          requirement.id,
                          "Submitted",
                        ),
                      )
                      .catch((error) =>
                        setActionError(
                          error instanceof Error
                            ? error.message
                            : "Could not record payment.",
                        ),
                      );
                  }}
                  className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-900 py-3 font-semibold text-white"
                >
                  {isPaymentBlocked(requirement)
                    ? "Resubmit Payment"
                    : "Record Payment"}
                </button>
              )}
            </div>
          ))
        ) : (
          <p>No payment requirements listed.</p>
        )}

        {documentRequirements.length === 0 && paymentRequirements.length === 0 && (
          <h3 className="pt-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Registration Items
          </h3>
        )}
        {currentRequirements.length > 0 ? (
          documentRequirements.length === 0 &&
          paymentRequirements.length === 0 &&
          currentRequirements.map((requirement) => (
            <div
              key={requirement.label}
              className="rounded-xl bg-slate-800 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span>{requirement.label}</span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getRequirementTone(
                    requirement.status,
                  )}`}
                >
                  {requirement.status}
                </span>
              </div>
              {requirement.description && (
                <p className="mt-2 text-xs text-slate-400">
                  {requirement.description}
                </p>
              )}
              {isRequirementNeedsReview(requirement) && (
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-yellow-200">
                  Waiting for admin review
                </p>
              )}
              {isRequirementCleared(requirement) && (
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-blue-300">
                  Cleared
                </p>
              )}
              {(isRequirementMissing(requirement) ||
                isRequirementBlocked(requirement)) && (
                <label
                  aria-disabled={uploadingRequirementId === requirement.label}
                  className="mt-3 block w-full cursor-pointer rounded-xl border border-slate-700 bg-slate-900 py-3 text-center font-semibold text-white"
                >
                  <input
                    className="sr-only"
                    disabled={uploadingRequirementId === requirement.label}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      event.currentTarget.value = "";

                      if (file) {
                        void uploadParentRequirementDocument(
                          requirement.label,
                          requirement.label,
                          file,
                          () =>
                            saveRegistrationRequirementStatus(
                              registrationId,
                              requirement.label,
                              "Uploaded",
                            ),
                        );
                      }
                    }}
                    type="file"
                  />
                  {uploadingRequirementId === requirement.label
                    ? "Uploading..."
                    : isRequirementBlocked(requirement)
                      ? "Resubmit Item"
                      : "Upload / Submit Item"}
                </label>
              )}
            </div>
          ))
        ) : (
          documentRequirements.length === 0 &&
          paymentRequirements.length === 0 && (
            <p>No registration requirements listed.</p>
          )
        )}
      </div>
    </div>
  );
}
