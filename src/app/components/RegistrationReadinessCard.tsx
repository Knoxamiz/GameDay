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
    <details className="gd-card-dark mt-3 rounded-lg">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        <div>
          <h2 className="text-sm font-black text-white">Registration Readiness</h2>
          <p className="mt-0.5 text-xs font-semibold text-slate-400">
            {isReady ? "Cleared for team activities." : details}
          </p>
        </div>
        <RegistrationStatusBadge status={currentStatus} />
      </summary>

      <div className="border-t border-white/10 px-3 pb-3 pt-2 text-sm">
        <p className="font-semibold text-white">Requirements</p>
        <p
          className={`mt-1 ${
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
    </details>
  );
}
