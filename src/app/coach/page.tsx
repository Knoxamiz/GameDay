import Link from "next/link";
import BottomNav from "../components/BottomNav";
import MvpNav, { getRoleHref } from "../components/MvpNav";
import TransportationSummaryCard from "../components/TransportationSummaryCard";
import { getEventById } from "../data/events";
import { coachActionItems } from "../data/messages";
import { getTeamById } from "../data/teams";
import { getTransportationEntriesByEventId } from "../data/transportation";

const coachTeam = getTeamById("black-diamonds-12u");
const todayEvent = coachTeam?.nextEventId
  ? getEventById(coachTeam.nextEventId)
  : undefined;
const transportationEntries = todayEvent
  ? getTransportationEntriesByEventId(todayEvent.id)
  : [];

export default function CoachHome() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav role="coach" />

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
              href={getRoleHref(`/events/${todayEvent.id}`, "coach")}
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

        {todayEvent && (
          <TransportationSummaryCard
            eventId={todayEvent.id}
            entries={transportationEntries}
            actionHref={getRoleHref(`/events/${todayEvent.id}`, "coach")}
            showDetails={false}
          />
        )}

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Action Items</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            {coachActionItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <BottomNav
          items={[
            { href: "/coach", label: "Home" },
            { href: getRoleHref("/events", "coach"), label: "Schedule" },
            {
              href: coachTeam
                ? getRoleHref(`/teams/${coachTeam.id}`, "coach")
                : getRoleHref("/teams", "coach"),
              label: "Team",
            },
          ]}
        />
      </section>
    </main>
  );
}
