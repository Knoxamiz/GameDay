import Link from "next/link";
import MvpNav from "../components/MvpNav";
import { getEventById } from "../data/events";
import { coachActionItems } from "../data/messages";
import { getTeamById } from "../data/teams";
import { getTransportationSummaryByEventId } from "../data/transportation";

const coachTeam = getTeamById("black-diamonds-12u");
const todayEvent = coachTeam?.nextEventId
  ? getEventById(coachTeam.nextEventId)
  : undefined;
const transportation = todayEvent
  ? getTransportationSummaryByEventId(todayEvent.id)
  : { needsRide: 0, canOfferRide: 0 };

export default function CoachHome() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav />

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h1 className="text-3xl font-bold">GameDay - Coach</h1>
        </div>

        <p className="mt-5 text-slate-300">{coachTeam?.name}</p>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Today
          </h2>
          <div className="mt-4 rounded-xl bg-slate-800 p-4">
            <p className="font-semibold">{todayEvent?.title}</p>
            <p className="mt-2 text-sm text-slate-300">{todayEvent?.time}</p>
            <p className="mt-1 text-sm text-slate-300">
              {todayEvent?.location}
            </p>
          </div>
          {todayEvent && (
            <Link
              href={`/events/${todayEvent.id}`}
              className="mt-4 block w-full rounded-xl bg-blue-500 py-3 text-center font-semibold text-white"
            >
              View Event
            </Link>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Team Status</h2>
          <p className="mt-3 text-2xl font-bold">
            {todayEvent?.attendance.total} Players
          </p>
          <div className="mt-4 space-y-2 text-sm text-slate-300">
            <p className="text-blue-300">
              {todayEvent?.attendance.attending} Attending
            </p>
            <p>{todayEvent?.attendance.unknown} Unknown</p>
            <p className="text-red-300">
              {todayEvent?.attendance.notAttending} Not Attending
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Transportation</h2>
          <div className="mt-3 space-y-2 text-sm">
            <p className="text-red-300">{transportation.needsRide} Need Ride</p>
            <p className="text-blue-300">
              {transportation.canOfferRide} Can Offer Ride
            </p>
          </div>
          <Link
            href={todayEvent ? `/events/${todayEvent.id}` : "/events"}
            className="mt-4 block w-full rounded-xl border border-slate-700 bg-slate-900 py-3 text-center font-semibold text-white"
          >
            View Transportation
          </Link>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Action Items</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            {coachActionItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Quick Actions</h2>
          <div className="mt-4 grid gap-3">
            <button
              type="button"
              className="w-full rounded-xl bg-blue-500 py-3 font-semibold text-white"
            >
              Send Announcement
            </button>
            <button
              type="button"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 font-semibold text-white"
            >
              Message Team
            </button>
            <button
              type="button"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 font-semibold text-white"
            >
              Take Attendance
            </button>
          </div>
        </div>

        <nav className="mt-8 grid grid-cols-5 gap-2 text-center text-xs text-slate-400">
          <Link href="/coach">Home</Link>
          <Link href={todayEvent ? `/events/${todayEvent.id}` : "/events"}>
            Schedule
          </Link>
          <Link href={coachTeam ? `/teams/${coachTeam.id}` : "/teams"}>
            Team
          </Link>
          <span>Messages</span>
          <span>More</span>
        </nav>
      </section>
    </main>
  );
}
