import Link from "next/link";
import AdminEventForm from "../components/AdminEventForm";
import MvpNav, {
  getMvpNavRole,
  getRoleHref,
} from "../components/MvpNav";
import { summarizeAttendanceEntries } from "../data/attendance";
import {
  getEventDateLabel,
  getEventLocationLabel,
  getEventTeamIds,
  getEventTimeLabel,
} from "../data/events";
import { getEventScheduleReadModel } from "../data/eventSchedule.server";
import { summarizeTransportationEntries } from "../data/transportation";
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";

type EventsHomeProps = {
  searchParams?: Promise<{
    role?: string | string[];
  }>;
};

export const dynamic = "force-dynamic";

export default async function EventsHome({ searchParams }: EventsHomeProps) {
  const role = getMvpNavRole((await searchParams)?.role);
  const schedule = await getEventScheduleReadModel(role);
  const repositories = schedule.source === "firestore"
    ? createFirestoreRepositories()
    : null;
  const visibleEvents = schedule.events;
  const [attendanceLists, transportationLists] = repositories
    ? await Promise.all([
        Promise.all(
          visibleEvents.map((event) =>
            repositories.attendance.listByEventId(event.id),
          ),
        ),
        Promise.all(
          visibleEvents.map((event) =>
            repositories.transportation.listByEventId(event.id),
          ),
        ),
      ])
    : [[], []];
  const teamsById = new Map(schedule.teams.map((team) => [team.id, team]));
  const attendanceByEventId = new Map(
    visibleEvents.map((event, index) => [
      event.id,
      attendanceLists[index] ?? [],
    ]),
  );
  const transportationByEventId = new Map(
    visibleEvents.map((event, index) => [
      event.id,
      transportationLists[index] ?? [],
    ]),
  );

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
            href={getRoleHref("/calendar.ics", role)}
            className="mt-4 block w-full rounded-xl bg-blue-500 py-3 text-center text-sm font-semibold text-white"
          >
            Subscribe Calendar
          </a>
        </div>

        {role === "admin" && (
          <AdminEventForm
            canCreateEvents={schedule.canCreateEvents}
            organizationIds={schedule.organizationIds}
            teams={schedule.teams}
          />
        )}

        <div className="mt-6 space-y-4">
          {visibleEvents.length === 0 && (
            <p className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300">
              {role === "shared"
                ? "Sign in as a parent, coach, or admin to view a scoped schedule."
                : "No events scheduled for this view."}
            </p>
          )}
          {visibleEvents.map((event) => {
            const eventTeams = getEventTeamIds(event)
              .map((teamId) => teamsById.get(teamId))
              .filter(Boolean);
            const attendance = summarizeAttendanceEntries(
              event.id,
              attendanceByEventId.get(event.id) ?? [],
            );
            const transportation = summarizeTransportationEntries(
              event.id,
              transportationByEventId.get(event.id) ?? [],
            );
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

                <p className="mt-3 text-sm text-slate-400">
                  {eventTeams.map((team) => team?.name).join(", ") ||
                    "Organization"}
                </p>
                <div className="mt-4 rounded-xl bg-slate-800 p-4 text-sm text-slate-300">
                  <p>{getEventDateLabel(event)}</p>
                  <p className="mt-1">{getEventTimeLabel(event)}</p>
                  <p className="mt-3">{getEventLocationLabel(event)}</p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-slate-800 p-3">
                    <p className="text-slate-400">Attendance</p>
                    <p className="mt-1 font-semibold text-blue-300">
                      {attendance.attending} Attending
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
