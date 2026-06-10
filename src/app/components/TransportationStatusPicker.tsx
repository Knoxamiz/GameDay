"use client";

import { isDocumentOpen, type DocumentRequirement } from "../data/documents";
import { isPaymentOpen, type PaymentRequirement } from "../data/payments";
import type { RegistrationRequirement } from "../data/registrations";
import type { TransportationStatus } from "../data/transportation";
import { useDocumentRequirements } from "./documentRequirementState";
import { usePaymentRequirements } from "./paymentRequirementState";
import { useRegistrationRequirements } from "./registrationRequirementState";
import {
  saveTransportationStatus,
  useTransportationStatus,
} from "./transportationStatusState";

type TransportationStatusPickerProps = {
  athleteId: string;
  documentRequirements?: DocumentRequirement[];
  eventId: string;
  initialStatus: TransportationStatus;
  paymentRequirements?: PaymentRequirement[];
  registrationId: string;
  registrationRequirements: RegistrationRequirement[];
  options: TransportationStatus[];
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
}: TransportationStatusPickerProps) {
  const selectedStatus = useTransportationStatus(
    athleteId,
    eventId,
    initialStatus,
  );
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

  return (
    <>
      <div
        className={`mt-4 rounded-2xl border p-4 text-sm ${
          isReady
            ? "border-blue-500/40 bg-blue-500/10 text-blue-200"
            : "border-red-500/40 bg-red-500/10 text-red-200"
        }`}
      >
        <p className="font-semibold">
          {isReady ? "Ready for next event" : "Action needed before event"}
        </p>
        {!hasTransportationReady && (
          <p className="mt-2">Choose a transportation status.</p>
        )}
        {missingRequirementLabels.length > 0 && (
          <p className="mt-2">Missing: {missingRequirementLabels.join(", ")}</p>
        )}
        {openDocumentLabels.length > 0 && (
          <p className="mt-2">Documents: {openDocumentLabels.join(", ")}</p>
        )}
        {openPaymentLabels.length > 0 && (
          <p className="mt-2">Payments: {openPaymentLabels.join(", ")}</p>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-lg font-bold">Transportation</h2>
        <p
          className={`mt-3 text-sm font-semibold ${
            hasTransportationReady ? "text-blue-300" : "text-red-300"
          }`}
        >
          Current: {selectedStatus}
        </p>
        <div className="mt-4 grid gap-3">
          {options.map((option) => {
            const isSelected = option === selectedStatus;

            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  saveTransportationStatus(athleteId, eventId, option);
                }}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold ${
                  isSelected
                    ? "border-blue-300 bg-blue-500/20 text-blue-100"
                    : "border-slate-700 bg-slate-900 text-slate-300"
                }`}
              >
                <span
                  className={`h-4 w-4 rounded-full border ${
                    isSelected
                      ? "border-blue-300 bg-blue-300"
                      : "border-slate-500"
                  }`}
                />
                {option}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
