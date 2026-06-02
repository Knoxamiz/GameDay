"use client";

import type { RegistrationRequirement } from "../data/registrations";
import {
  saveRegistrationRequirementStatus,
  useRegistrationRequirements,
} from "./registrationRequirementState";

type RegistrationRequirementsChecklistProps = {
  registrationId: string;
  requirements: RegistrationRequirement[];
};

export default function RegistrationRequirementsChecklist({
  registrationId,
  requirements,
}: RegistrationRequirementsChecklistProps) {
  const currentRequirements = useRegistrationRequirements(
    registrationId,
    requirements,
  );
  const missingCount = currentRequirements.filter(
    (requirement) => requirement.status === "Missing",
  ).length;

  return (
    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-lg font-bold">Registration Status</h2>
      <p
        className={`mt-3 text-sm font-semibold ${
          missingCount === 0 ? "text-blue-300" : "text-red-300"
        }`}
      >
        {missingCount === 0 ? "Ready" : `${missingCount} Missing`}
      </p>
      <div className="mt-3 space-y-3 text-sm text-slate-300">
        {currentRequirements.length > 0 ? (
          currentRequirements.map((requirement) => (
            <div
              key={requirement.label}
              className="rounded-xl bg-slate-800 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span>{requirement.label}</span>
                <span
                  className={
                    requirement.status === "Complete"
                      ? "font-semibold text-blue-300"
                      : "font-semibold text-red-300"
                  }
                >
                  {requirement.status}
                </span>
              </div>
              {requirement.status === "Missing" && (
                <button
                  type="button"
                  onClick={() =>
                    saveRegistrationRequirementStatus(
                      registrationId,
                      requirement.label,
                      "Complete",
                    )
                  }
                  className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-900 py-3 font-semibold text-white"
                >
                  Mark Complete
                </button>
              )}
            </div>
          ))
        ) : (
          <p>No registration requirements listed.</p>
        )}
      </div>
    </div>
  );
}
