"use client";

import type { Athlete } from "../data/athletes";
import { summarizeDocumentRequirements } from "../data/documents";
import { summarizePaymentRequirements } from "../data/payments";
import {
  getDocumentRequirementsFromRegistrations,
  getPaymentRequirementsFromRegistrations,
} from "../data/registrationDerivedRequirements";
import {
  getRegistrationRosterStatus,
  getRosterStatusLabel,
  summarizeRegistrationRequirements,
  type Registration,
} from "../data/registrations";
import { useDocumentRequirements } from "./documentRequirementState";
import { usePaymentRequirements } from "./paymentRequirementState";
import RegistrationStatusBadge from "./RegistrationStatusBadge";
import { useRegistrations } from "./registrationStatusState";

type RegistrationRosterCardProps = {
  registrations: Registration[];
  roster: Athlete[];
};

export default function RegistrationRosterCard({
  registrations,
  roster,
}: RegistrationRosterCardProps) {
  const currentRegistrations = useRegistrations(registrations);
  const registrationByAthleteId = new Map(
    currentRegistrations.map((registration) => [
      registration.athleteId,
      registration,
    ]),
  );
  const documents = useDocumentRequirements(
    getDocumentRequirementsFromRegistrations(currentRegistrations),
  );
  const payments = usePaymentRequirements(
    getPaymentRequirementsFromRegistrations(currentRegistrations),
  );

  return (
    <details className="gd-card-dark mt-3 rounded-lg">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        <div>
          <h2 className="text-sm font-black text-white">Roster</h2>
          <p className="text-xs font-semibold text-slate-400">
            {roster.length} rostered
          </p>
        </div>
        <span className="rounded-full bg-blue-500/20 px-2.5 py-1 text-xs font-black text-blue-200">
          Open
        </span>
      </summary>
      <div className="space-y-2 border-t border-white/10 px-3 pb-3 pt-2 text-sm text-slate-300">
        {roster.length > 0 ? (
          roster.map((player) => {
            const registration = registrationByAthleteId.get(player.id);
            const requirementSummary = registration
              ? summarizeRegistrationRequirements(registration.requirements)
              : undefined;
            const documentSummary = registration
              ? summarizeDocumentRequirements(
                  documents.filter(
                    (requirement) =>
                      requirement.registrationId === registration.id,
                  ),
                )
              : undefined;
            const paymentSummary = registration
              ? summarizePaymentRequirements(
                  payments.filter(
                    (requirement) =>
                      requirement.registrationId === registration.id,
                  ),
                )
              : undefined;
            const openItems =
              (requirementSummary?.open ?? 0) +
              (documentSummary?.open ?? 0) +
              (paymentSummary?.open ?? 0);

            return (
              <div
                key={player.id}
                className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/5 p-2.5"
              >
                <div>
                  <p className="font-semibold text-white">{player.name}</p>
                  {registration && openItems > 0 && (
                    <p className="mt-1 text-xs text-yellow-200">
                      {documentSummary?.open ?? 0} docs,{" "}
                      {paymentSummary?.open ?? 0} payments open
                    </p>
                  )}
                  {registration && (
                    <p className="mt-1 text-xs text-slate-400">
                      {getRosterStatusLabel(
                        getRegistrationRosterStatus(registration),
                      )}
                    </p>
                  )}
                </div>
                {registration ? (
                  <RegistrationStatusBadge status={registration.status} />
                ) : (
                  <span className="rounded-full bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-300">
                    No Registration
                  </span>
                )}
              </div>
            );
          })
        ) : (
          <p>No rostered athletes.</p>
        )}
      </div>
    </details>
  );
}
