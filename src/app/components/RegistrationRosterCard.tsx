"use client";

import type { Athlete } from "../data/athletes";
import type { Registration } from "../data/registrations";
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

  return (
    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-lg font-bold">Registration Status</h2>
      <div className="mt-4 space-y-3 text-sm text-slate-300">
        {roster.length > 0 ? (
          roster.map((player) => {
            const registration = registrationByAthleteId.get(player.id);

            return (
              <p
                key={player.id}
                className="flex items-center justify-between gap-3"
              >
                <span>{player.name}</span>
                {registration ? (
                  <RegistrationStatusBadge status={registration.status} />
                ) : (
                  <span className="rounded-full bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-300">
                    No Registration
                  </span>
                )}
              </p>
            );
          })
        ) : (
          <p>No roster listed.</p>
        )}
      </div>
    </div>
  );
}
