"use client";

import type {
  RegistrationRequirement,
  RegistrationStatus,
} from "../data/registrations";
import {
  isRequirementBlocked,
  isRequirementMissing,
  isRequirementNeedsReview,
  summarizeRegistrationRequirements,
} from "../data/registrations";
import RegistrationStatusBadge from "./RegistrationStatusBadge";
import { useRegistrationRequirements } from "./registrationRequirementState";
import { useRegistrationStatus } from "./registrationStatusState";

type RegistrationReadinessCardProps = {
  details: string;
  registrationId: string;
  requirements: RegistrationRequirement[];
  status: RegistrationStatus;
};

export default function RegistrationReadinessCard({
  details,
  registrationId,
  requirements,
  status,
}: RegistrationReadinessCardProps) {
  const currentStatus = useRegistrationStatus(registrationId, status);
  const currentRequirements = useRegistrationRequirements(
    registrationId,
    requirements,
  );
  const summary = summarizeRegistrationRequirements(currentRequirements);
  const missingRequirements = currentRequirements.filter(isRequirementMissing);
  const reviewRequirements = currentRequirements.filter(
    isRequirementNeedsReview,
  );
  const blockedRequirements = currentRequirements.filter(isRequirementBlocked);
  const isReady =
    currentStatus === "Approved" && summary.open === 0;
  const requirementsLabel =
    summary.open === 0
      ? "No open requirements"
      : [
          blockedRequirements.length > 0
            ? `Fix: ${blockedRequirements
                .map((requirement) => requirement.label)
                .join(", ")}`
            : "",
          missingRequirements.length > 0
            ? `Missing: ${missingRequirements
                .map((requirement) => requirement.label)
                .join(", ")}`
            : "",
          reviewRequirements.length > 0
            ? `Waiting review: ${reviewRequirements
                .map((requirement) => requirement.label)
                .join(", ")}`
            : "",
        ]
          .filter(Boolean)
          .join(" | ");

  return (
    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Registration Readiness</h2>
          <p className="mt-1 text-sm text-slate-300">
            {isReady ? "Cleared for team activities." : details}
          </p>
        </div>
        <RegistrationStatusBadge status={currentStatus} />
      </div>

      <div className="mt-4 rounded-xl bg-slate-800 p-4 text-sm">
        <p className="font-semibold text-white">Requirements</p>
        <p
          className={`mt-2 ${
            summary.open === 0
              ? "text-blue-300"
              : summary.blocked > 0 || summary.missing > 0
                ? "text-red-300"
                : "text-yellow-200"
          }`}
        >
          {requirementsLabel}
        </p>
      </div>
    </div>
  );
}
