import Link from "next/link";
import MvpNav, {
  getMvpNavRole,
  getRoleHref,
} from "../components/MvpNav";
import { events } from "../data/events";
import { getGameAlertByEventId } from "../data/gameAlerts";
import { getTeamById } from "../data/teams";
import { getTransportationSummaryByEventId } from "../data/transportation";

type EventsHomeProps = {
  searchParams?: Promise<{
    role?: string | string[];
  }>;
};

export default async function EventsHome({ searchParams }: EventsHomeProps) {
  const role = getMvpNavRole((await searchParams)?.role);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav role={role} />

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h1 className="text-3xl font-bold">Schedule</h1>
          <p className="mt-3 text-sm text-slate-300">
            Upcoming practices, tournaments, and meetings.
          </p>
          <a
            href="/calendar.ics"
            className="mt-4 block w-full rounded-xl bg-blue-500 py-3 text-center text-sm font-semibold text-white"
          >
            Subscribe Calendar
          </a>
        </div>

        <div className="mt-6 space-y-4">
          {events.map((event) => {
            const team = event.teamId ? getTeamById(event.teamId) : undefined;
            const gameAlert = getGameAlertByEventId(event.id);
            const transportation = getTransportationSummaryByEventId(event.id);
            const hasTransportationIssue = transportation.needsRide > 0;

            return (
              <Link
                key={event.id}
                href={getRoleHref(`/events/${event.id}`, role)}
                className="block rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {event.type}
                    </p>
                    <h2 className="mt-2 text-xl font-bold">{event.title}</h2>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      hasTransportationIssue
                        ? "bg-red-500/20 text-red-300"
                        : "bg-blue-500/20 text-blue-300"
                    }`}
                  >
                    {hasTransportationIssue ? "Ride Help" : "On Track"}
                  </span>
                </div>

                {gameAlert && (
                  <div className="mt-4 rounded-xl bg-slate-800 p-4 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-white">Game Alert</p>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          gameAlert.status === "Live"
                            ? "bg-red-500/20 text-red-300"
                            : gameAlert.status === "Final"
                              ? "bg-blue-500/20 text-blue-300"
                              : "bg-slate-700 text-slate-300"
                        }`}
                      >
                        {gameAlert.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="mt-3 font-semibold text-blue-300">
                      {gameAlert.homeScore} - {gameAlert.awayScore}
                    </p>
                    <p className="mt-1 text-slate-400">
                      {gameAlert.homeTeamName} vs {gameAlert.awayTeamName}
                    </p>
                  </div>
                )}

                <p className="mt-3 text-sm text-slate-400">
                  {team?.name ?? "Organization"}
                </p>
                <div className="mt-4 rounded-xl bg-slate-800 p-4 text-sm text-slate-300">
                  <p>{event.date}</p>
                  <p className="mt-1">{event.time}</p>
                  <p className="mt-3">{event.location || "Location TBD"}</p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-slate-800 p-3">
                    <p className="text-slate-400">Attendance</p>
                    <p className="mt-1 font-semibold text-blue-300">
                      {event.attendance.attending} Attending
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-800 p-3">
                    <p className="text-slate-400">Transportation</p>
                    <p
                      className={`mt-1 font-semibold ${
                        hasTransportationIssue ? "text-red-300" : "text-blue-300"
                      }`}
                    >
                      {transportation.needsRide} Need Ride
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
