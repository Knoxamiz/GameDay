"use client";

import { useRouter } from "next/navigation";
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
import { useDocumentRequirements } from "./documentRequirementState";
import { usePaymentRequirements } from "./paymentRequirementState";
import { useRegistrationRequirements } from "./registrationRequirementState";

type RegistrationRequirementsChecklistProps = {
  athleteId: string;
  documentRequirements?: DocumentRequirement[];
  organizationId: string;
  parentId: string;
  paymentRequirements?: PaymentRequirement[];
  registrationId: string;
  requirements: RegistrationRequirement[];
  surface?: "card" | "inline";
  updatesAllowed?: boolean;
};

function getRequirementTone(status: RegistrationRequirementStatus) {
  if (status === "Approved" || status === "Waived") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "Submitted" || status === "Uploaded") {
    return "bg-orange-50 text-orange-700";
  }

  if (status === "Rejected") {
    return "bg-red-50 text-red-700";
  }

  return "bg-slate-100 text-slate-600";
}

function getDocumentTone(status: DocumentRequirementStatus) {
  if (status === "Approved" || status === "Waived") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "Submitted" || status === "Uploaded") {
    return "bg-orange-50 text-orange-700";
  }

  if (status === "Rejected") {
    return "bg-red-50 text-red-700";
  }

  return "bg-slate-100 text-slate-600";
}

function getPaymentTone(status: PaymentRequirementStatus) {
  if (status === "Paid" || status === "Waived") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "Submitted") {
    return "bg-orange-50 text-orange-700";
  }

  if (status === "Rejected") {
    return "bg-red-50 text-red-700";
  }

  return "bg-slate-100 text-slate-600";
}

export default function RegistrationRequirementsChecklist({
  athleteId,
  documentRequirements: initialDocumentRequirements = [],
  organizationId,
  parentId,
  paymentRequirements: initialPaymentRequirements = [],
  registrationId,
  requirements,
  surface = "card",
  updatesAllowed = true,
}: RegistrationRequirementsChecklistProps) {
  const router = useRouter();
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
      ? "text-red-700"
      : totalNeedsReview > 0
        ? "text-orange-700"
        : "text-emerald-700";
  const wrapperClassName =
    surface === "inline"
      ? "mt-4"
      : "mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm";

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

      router.refresh();
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
    <div className={wrapperClassName}>
      <h2 className="text-lg font-black">Player Needs</h2>
      <p className={`mt-3 text-sm font-semibold ${summaryTone}`}>
        {summaryLabel}
      </p>
      {actionError && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
          {actionError}
        </p>
      )}
      {!updatesAllowed && (
        <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-600">
          Document and payment updates are closed for this registration.
        </p>
      )}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-slate-500">Documents</p>
          <p className="mt-1 font-black text-slate-950">
            {documentSummary.open} Open
          </p>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-slate-500">Payment</p>
          <p className="mt-1 font-black text-slate-950">
            {paymentSummary.open} Open
          </p>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-slate-500">Total</p>
          <p className="mt-1 font-black text-slate-950">
            {totalOpenItems} Open
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3 text-sm text-slate-600">
        <h3 className="text-sm font-black uppercase text-slate-500">
          Documents
        </h3>
        {documentRequirements.length > 0 ? (
          documentRequirements.map((requirement) => (
            <div key={requirement.id} className="rounded-md bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-black text-slate-950">
                  {requirement.label}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getDocumentTone(
                    requirement.status,
                  )}`}
                >
                  {requirement.status}
                </span>
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-500">
                {requirement.description}
              </p>
              {isDocumentNeedsReview(requirement) && (
                <p className="mt-3 text-xs font-black uppercase text-orange-700">
                  Waiting for review
                </p>
              )}
              {isDocumentCleared(requirement) && (
                <p className="mt-3 text-xs font-black uppercase text-emerald-700">
                  Cleared
                </p>
              )}
              {updatesAllowed &&
                (isDocumentMissing(requirement) ||
                isDocumentBlocked(requirement)) && (
                <label
                  aria-disabled={uploadingRequirementId === requirement.id}
                  className="mt-3 block w-full cursor-pointer rounded-md border border-slate-200 bg-white py-3 text-center font-black text-slate-700 hover:bg-slate-100"
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
          <p className="rounded-md bg-slate-50 p-4 font-semibold">
            No document requirements listed.
          </p>
        )}

        <h3 className="pt-2 text-sm font-black uppercase text-slate-500">
          Payment
        </h3>
        {paymentRequirements.length > 0 ? (
          paymentRequirements.map((requirement) => (
            <div key={requirement.id} className="rounded-md bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-black text-slate-950">
                  {requirement.label}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getPaymentTone(
                    requirement.status,
                  )}`}
                >
                  {requirement.status}
                </span>
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-500">
                ${requirement.amountDue} due. {requirement.description}
              </p>
              {isPaymentNeedsReview(requirement) && (
                <p className="mt-3 text-xs font-black uppercase text-orange-700">
                  Waiting for review
                </p>
              )}
              {isPaymentCleared(requirement) && (
                <p className="mt-3 text-xs font-black uppercase text-emerald-700">
                  Cleared
                </p>
              )}
              {updatesAllowed &&
                (isPaymentMissing(requirement) ||
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
                      .then(() => router.refresh())
                      .catch((error) =>
                        setActionError(
                          error instanceof Error
                            ? error.message
                            : "Could not record payment.",
                        ),
                      );
                  }}
                  className="mt-3 w-full rounded-md border border-slate-200 bg-white py-3 font-black text-slate-700 hover:bg-slate-100"
                >
                  {isPaymentBlocked(requirement)
                    ? "Resubmit Payment"
                    : "Record Payment"}
                </button>
              )}
            </div>
          ))
        ) : (
          <p className="rounded-md bg-slate-50 p-4 font-semibold">
            No payment requirements listed.
          </p>
        )}

        {documentRequirements.length === 0 && paymentRequirements.length === 0 && (
          <h3 className="pt-2 text-sm font-black uppercase text-slate-500">
            Registration Items
          </h3>
        )}
        {currentRequirements.length > 0 ? (
          documentRequirements.length === 0 &&
          paymentRequirements.length === 0 &&
          currentRequirements.map((requirement) => (
            <div
              key={requirement.label}
              className="rounded-md bg-slate-50 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-black text-slate-950">
                  {requirement.label}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getRequirementTone(
                    requirement.status,
                  )}`}
                >
                  {requirement.status}
                </span>
              </div>
              {requirement.description && (
                <p className="mt-2 text-xs font-semibold text-slate-500">
                  {requirement.description}
                </p>
              )}
              {isRequirementNeedsReview(requirement) && (
                <p className="mt-3 text-xs font-black uppercase text-orange-700">
                  Waiting for review
                </p>
              )}
              {isRequirementCleared(requirement) && (
                <p className="mt-3 text-xs font-black uppercase text-emerald-700">
                  Cleared
                </p>
              )}
              {updatesAllowed &&
                (isRequirementMissing(requirement) ||
                isRequirementBlocked(requirement)) && (
                <label
                  aria-disabled={uploadingRequirementId === requirement.label}
                  className="mt-3 block w-full cursor-pointer rounded-md border border-slate-200 bg-white py-3 text-center font-black text-slate-700 hover:bg-slate-100"
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
            <p className="rounded-md bg-slate-50 p-4 font-semibold">
              No registration requirements listed.
            </p>
          )
        )}
      </div>
    </div>
  );
}
