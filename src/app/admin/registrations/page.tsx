import BottomNav from "../../components/BottomNav";
import MvpNav, { getRoleHref } from "../../components/MvpNav";
import { getAthleteById } from "../../data/athletes";
import {
  registrationSummary,
  registrations,
  type Registration,
} from "../../data/registrations";
import { getTeamById } from "../../data/teams";

function getStatusTone(status: string) {
  const normalizedStatus = status.toLowerCase();

  if (
    normalizedStatus.includes("missing") ||
    normalizedStatus.includes("action")
  ) {
    return "bg-red-500/20 text-red-300";
  }

  if (normalizedStatus.includes("approved")) {
    return "bg-blue-500/20 text-blue-300";
  }

  return "bg-yellow-500/20 text-yellow-200";
}

function getMissingRequirementLabels(registration: Registration) {
  return registration.requirements
    .filter((requirement) => requirement.status === "Missing")
    .map((requirement) => requirement.label);
}

export default function AdminRegistrationsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav role="admin" />

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h1 className="text-3xl font-bold">Registration Review</h1>
          <p className="mt-3 text-sm text-slate-300">
            Pending players, missing items, and approval readiness.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-slate-400">Pending</p>
            <p className="mt-2 text-2xl font-bold text-white">
              {registrationSummary.pendingRegistrations}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-slate-400">Missing Physicals</p>
            <p className="mt-2 text-2xl font-bold text-red-300">
              {registrationSummary.missingPhysicals}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {registrations.map((registration) => {
            const athlete = getAthleteById(registration.athleteId);
            const team = getTeamById(registration.teamId);
            const missingRequirements =
              getMissingRequirementLabels(registration);

            return (
              <div
                key={registration.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg"
              >
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
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusTone(
                      registration.status,
                    )}`}
                  >
                    {registration.status}
                  </span>
                </div>

                <p className="mt-4 text-sm text-slate-300">
                  {registration.details}
                </p>

                <div className="mt-4 rounded-xl bg-slate-800 p-4 text-sm">
                  <p className="font-semibold text-white">Needs</p>
                  <p
                    className={`mt-2 ${
                      missingRequirements.length > 0
                        ? "text-red-300"
                        : "text-blue-300"
                    }`}
                  >
                    {missingRequirements.length > 0
                      ? missingRequirements.join(", ")
                      : "No missing requirements"}
                  </p>
                </div>

                {registration.submittedDate && (
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Submitted {registration.submittedDate}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <BottomNav
          items={[
            { href: "/admin", label: "Home" },
            { href: getRoleHref("/teams", "admin"), label: "Teams" },
            { href: "/admin/registrations", label: "Registration" },
            { href: getRoleHref("/events", "admin"), label: "Schedule" },
          ]}
        />
      </section>
    </main>
  );
}
