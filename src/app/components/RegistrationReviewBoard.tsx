"use client";

import { getAthleteById } from "../data/athletes";
import {
  registrationAdminDecisionOptions,
  type Registration,
  type RegistrationStatus,
} from "../data/registrations";
import { getTeamById } from "../data/teams";
import RegistrationStatusBadge from "./RegistrationStatusBadge";
import { useRegistrationRequirements } from "./registrationRequirementState";
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
  const team = getTeamById(registration.teamId);
  const status = useRegistrationStatus(registration.id, registration.status);
  const requirements = useRegistrationRequirements(
    registration.id,
    registration.requirements,
  );
  const missingRequirements = requirements
    .filter((requirement) => requirement.status === "Missing")
    .map((requirement) => requirement.label);

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
            Parent: {registration.parentName}
          </p>
        </div>
        <RegistrationStatusBadge status={status} />
      </div>

      <p className="mt-4 text-sm text-slate-300">
        {getStatusDetails(status, registration.details)}
      </p>

      <div className="mt-4 rounded-xl bg-slate-800 p-4 text-sm">
        <p className="font-semibold text-white">Needs</p>
        <p
          className={`mt-2 ${
            missingRequirements.length > 0 ? "text-red-300" : "text-blue-300"
          }`}
        >
          {missingRequirements.length > 0
            ? missingRequirements.join(", ")
            : "No missing requirements"}
        </p>
      </div>

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
