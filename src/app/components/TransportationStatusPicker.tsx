"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { isDocumentOpen, type DocumentRequirement } from "../data/documents";
import { isPaymentOpen, type PaymentRequirement } from "../data/payments";
import type { RegistrationRequirement } from "../data/registrations";
import type { TransportationStatus } from "../data/transportation";
import { useDocumentRequirements } from "./documentRequirementState";
import { usePaymentRequirements } from "./paymentRequirementState";
import { useRegistrationRequirements } from "./registrationRequirementState";

type TransportationStatusPickerProps = {
  athleteId: string;
  documentRequirements?: DocumentRequirement[];
  eventId: string;
  initialStatus: TransportationStatus;
  paymentRequirements?: PaymentRequirement[];
  registrationId: string;
  registrationRequirements: RegistrationRequirement[];
  options: TransportationStatus[];
  surface?: "dark" | "light";
};

export default function TransportationStatusPicker({
  athleteId,
  documentRequirements: initialDocumentRequirements = [],
  eventId,
  initialStatus,
  paymentRequirements: initialPaymentRequirements = [],
  registrationId,
  registrationRequirements,
  options,
  surface = "dark",
}: TransportationStatusPickerProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedStatus = initialStatus;
  const requirements = useRegistrationRequirements(
    registrationId,
    registrationRequirements,
  );
  const documents = useDocumentRequirements(
    initialDocumentRequirements,
  );
  const payments = usePaymentRequirements(
    initialPaymentRequirements,
  );
  const missingRequirementLabels = requirements
    .filter((requirement) => requirement.status === "Missing")
    .map((requirement) => requirement.label);
  const openDocumentLabels = documents
    .filter(isDocumentOpen)
    .map((requirement) => requirement.label);
  const openPaymentLabels = payments
    .filter(isPaymentOpen)
    .map((requirement) => requirement.label);
  const hasTransportationReady = selectedStatus !== "Unknown";
  const isReady =
    hasTransportationReady &&
    missingRequirementLabels.length === 0 &&
    openDocumentLabels.length === 0 &&
    openPaymentLabels.length === 0;

  function updateTransportation(status: TransportationStatus) {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/events/${eventId}/transportation`, {
          body: JSON.stringify({ athleteId, status }),
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          method: "PATCH",
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            error?: unknown;
          } | null;
          setError(
            typeof body?.error === "string"
              ? body.error
              : "Could not update transportation.",
          );
          return;
        }

        router.refresh();
      } catch {
        setError("Could not update transportation. Please try again.");
      }
    });
  }

  return (
    <>
      <div
        className={`mt-3 rounded-lg border p-3 text-sm ${
          isReady
            ? surface === "light"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-blue-500/40 bg-blue-500/10 text-blue-200"
            : surface === "light"
              ? "border-orange-200 bg-orange-50 text-orange-700"
              : "border-red-500/40 bg-red-500/10 text-red-200"
        }`}
      >
        <p className="font-semibold">
          {isReady ? "Ready for next event" : "Action needed before event"}
        </p>
        {!hasTransportationReady && (
          <p className="mt-1">Choose a transportation status.</p>
        )}
        {missingRequirementLabels.length > 0 && (
          <p className="mt-1">Missing: {missingRequirementLabels.join(", ")}</p>
        )}
        {openDocumentLabels.length > 0 && (
          <p className="mt-1">Documents: {openDocumentLabels.join(", ")}</p>
        )}
        {openPaymentLabels.length > 0 && (
          <p className="mt-1">Payments: {openPaymentLabels.join(", ")}</p>
        )}
      </div>

      <details
        className={`mt-3 rounded-lg border ${
          surface === "light"
            ? "border-slate-200 bg-white"
            : "border-blue-300/20 bg-slate-950/70"
        }`}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
          <h2 className="text-sm font-black">Transportation</h2>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-black ${
              hasTransportationReady
                ? surface === "light"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-blue-500/20 text-blue-200"
                : surface === "light"
                  ? "bg-orange-50 text-orange-700"
                  : "bg-red-500/20 text-red-200"
            }`}
          >
            {selectedStatus}
          </span>
        </summary>
        <div
          className={`border-t px-3 pb-3 pt-2 ${
            surface === "light" ? "border-slate-200" : "border-white/10"
          }`}
        >
        <p
          className={`text-sm font-semibold ${
            hasTransportationReady
              ? surface === "light"
                ? "text-emerald-700"
                : "text-blue-300"
              : surface === "light"
                ? "text-orange-700"
                : "text-red-300"
          }`}
        >
          Current: {selectedStatus}
        </p>
        <div className="mt-2 grid gap-1.5">
          {options.map((option) => {
            const isSelected = option === selectedStatus;

            return (
              <button
                key={option}
                type="button"
                disabled={isPending}
                onClick={() => updateTransportation(option)}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm font-black ${
                  isSelected
                    ? surface === "light"
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-blue-300 bg-blue-500/20 text-blue-100"
                    : surface === "light"
                      ? "border-slate-200 bg-white text-slate-700"
                      : "border-slate-700 bg-slate-900 text-slate-300"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <span
                  className={`h-4 w-4 rounded-full border ${
                    isSelected
                      ? "border-blue-500 bg-blue-500"
                      : "border-slate-400"
                  }`}
                />
                {option}
              </button>
            );
          })}
        </div>
        {error && (
          <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>
        )}
        </div>
      </details>
    </>
  );
}
