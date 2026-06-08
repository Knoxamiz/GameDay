import Link from "next/link";
import MvpNav, {
  getMvpNavRole,
  getRoleHref,
} from "../components/MvpNav";
import { getCurrentCoach } from "../data/coaches";
import { getEventById } from "../data/events";
import { getTeamsByCoachId, teams } from "../data/teams";
import { getTransportationSummaryByEventId } from "../data/transportation";

type TeamsHomeProps = {
  searchParams?: Promise<{
    role?: string | string[];
  }>;
};

export default async function TeamsHome({ searchParams }: TeamsHomeProps) {
  const role = getMvpNavRole((await searchParams)?.role);
  const currentCoach = getCurrentCoach();
  const visibleTeams =
    role === "coach" ? getTeamsByCoachId(currentCoach.id) : teams;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav role={role} />

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h1 className="text-3xl font-bold">Teams</h1>
          <p className="mt-3 text-sm text-slate-300">
            Roster, schedule, and readiness by team.
          </p>
        </div>

        <div className="mt-6 space-y-4">
          {visibleTeams.map((team) => {
            const nextEvent = team.nextEventId
              ? getEventById(team.nextEventId)
              : undefined;
            const transportation = nextEvent
              ? getTransportationSummaryByEventId(nextEvent.id)
              : { needsRide: 0, canOfferRide: 0 };
            const needsCoach = team.coachIds.length === 0;
            const needsRideHelp = transportation.needsRide > 0;

            return (
              <Link
                key={team.id}
                href={getRoleHref(`/teams/${team.id}`, role)}
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
                    <p className="text-slate-400">Players</p>
                    <p className="mt-1 font-semibold text-white">
                      {team.playerCount}
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
                      {nextEvent.shortDate} {nextEvent.type}
                    </p>
                    <p className="mt-1">{nextEvent.time}</p>
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
