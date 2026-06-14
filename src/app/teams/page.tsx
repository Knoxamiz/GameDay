import Link from "next/link";
import { redirect } from "next/navigation";
import AdminOrganizationSelector from "../components/AdminOrganizationSelector";
import MvpNav from "../components/MvpNav";
import {
  getRequestedOrganizationId,
  withActiveOrganization,
} from "../data/activeOrganization";
import { resolveActiveAdminOrganizationContext } from "../data/adminOrganizationScope.server";
import { getCurrentAuthSession } from "../data/currentUser.server";
import {
  getEventShortDateLabel,
  getEventTimeLabel,
} from "../data/events";
import { getEventScheduleReadModel } from "../data/eventSchedule.server";
import { getOrganizationContext } from "../data/organizationContext.server";
import { summarizeTransportationEntries } from "../data/transportation";
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";

export const dynamic = "force-dynamic";

function isDefined<TValue>(
  value: TValue | null | undefined,
): value is TValue {
  return Boolean(value);
}

type TeamsHomeProps = {
  searchParams?: Promise<{
    organizationId?: string | string[];
  }>;
};

export default async function TeamsHome({ searchParams }: TeamsHomeProps) {
  const session = await getCurrentAuthSession();

  if (!session) {
    redirect("/login");
  }

  const role = session.claims.role;
  const requestedOrganizationId = getRequestedOrganizationId(
    (await searchParams)?.organizationId,
  );
  const activeContext =
    role === "admin"
      ? await resolveActiveAdminOrganizationContext(
          session,
          requestedOrganizationId,
        )
      : undefined;
  const activeOrganizationId = activeContext?.activeOrganizationId;
  const schedule = await getEventScheduleReadModel(role, activeOrganizationId);
  const organizationContext = activeContext?.activeOrganization
    ? { count: 1, label: activeContext.activeOrganization.name }
    : await getOrganizationContext(schedule.organizationIds);
  const repositories = schedule.source === "firestore"
    ? createFirestoreRepositories()
    : null;
  const visibleTeams = schedule.teams;
  const nextEvents = repositories
    ? (
        await Promise.all(
          visibleTeams
            .map((team) => team.nextEventId)
            .filter((eventId): eventId is string => Boolean(eventId))
            .map((eventId) => repositories.events.getById(eventId)),
        )
      ).filter(isDefined)
    : [];
  const nextEventsById = new Map(
    nextEvents.map((event) => [event.id, event]),
  );
  const [transportationLists, rosteredRegistrationLists] = repositories
    ? await Promise.all([
        Promise.all(
          nextEvents.map((event) =>
            repositories.transportation.listByEventId(event.id),
          ),
        ),
        Promise.all(
          visibleTeams.map((team) =>
            repositories.registrations.listRosteredByTeamId(team.id),
          ),
        ),
      ])
    : [[], []];
  const transportationByEventId = new Map(
    nextEvents.map((event, index) => [
      event.id,
      transportationLists[index] ?? [],
    ]),
  );
  const rosteredCountByTeamId = new Map(
    visibleTeams.map((team, index) => [
      team.id,
      rosteredRegistrationLists[index]?.length ?? 0,
    ]),
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav
          activeOrganizationId={activeOrganizationId}
          organizationContext={organizationContext}
        />

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h1 className="text-3xl font-bold">Teams</h1>
          <p className="mt-3 text-sm text-slate-300">
            Roster, schedule, and readiness by team.
          </p>
        </div>

        {activeContext && (
          <AdminOrganizationSelector
            action="/teams"
            activeOrganizationId={activeOrganizationId}
            organizations={activeContext.organizations}
          />
        )}

        <div className="mt-6 space-y-4">
          {visibleTeams.length === 0 && (
            <p className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300">
              {activeContext?.requiresSelection
                ? "Choose an organization to view its teams."
                : "No teams are available for your current organization and role scope."}
            </p>
          )}
          {visibleTeams.map((team) => {
            const nextEvent = team.nextEventId
              ? nextEventsById.get(team.nextEventId)
              : undefined;
            const transportation = nextEvent
              ? summarizeTransportationEntries(
                  nextEvent.id,
                  transportationByEventId.get(nextEvent.id) ?? [],
                )
              : { needsRide: 0 };
            const needsCoach = team.coachIds.length === 0;
            const needsRideHelp = transportation.needsRide > 0;

            return (
              <Link
                key={team.id}
                href={withActiveOrganization(
                  `/teams/${team.id}`,
                  activeOrganizationId,
                )}
                className="block rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {team.label}
                    </p>
                    <h2 className="mt-2 text-xl font-bold">{team.name}</h2>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      needsCoach || needsRideHelp
                        ? "bg-red-500/20 text-red-300"
                        : "bg-blue-500/20 text-blue-300"
                    }`}
                  >
                    {needsCoach
                      ? "Needs Coach"
                      : needsRideHelp
                        ? "Ride Help"
                        : "On Track"}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-slate-800 p-3">
                    <p className="text-slate-400">Rostered</p>
                    <p className="mt-1 font-semibold text-white">
                      {rosteredCountByTeamId.get(team.id) ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-800 p-3">
                    <p className="text-slate-400">Coaches</p>
                    <p
                      className={`mt-1 font-semibold ${
                        needsCoach ? "text-red-300" : "text-blue-300"
                      }`}
                    >
                      {team.coachIds.length}
                    </p>
                  </div>
                </div>

                {nextEvent ? (
                  <div className="mt-4 rounded-xl bg-slate-800 p-4 text-sm text-slate-300">
                    <p className="font-semibold text-white">Next Event</p>
                    <p className="mt-2">
                      {getEventShortDateLabel(nextEvent)} {nextEvent.type}
                    </p>
                    <p className="mt-1">{getEventTimeLabel(nextEvent)}</p>
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl bg-slate-800 p-4 text-sm text-slate-300">
                    No upcoming event.
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
