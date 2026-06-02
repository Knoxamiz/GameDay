import Link from "next/link";
import MvpNav from "../components/MvpNav";

const coachHome = {
  teamName: "Black Diamonds 12U",
  todayEvent: {
    title: "Practice Tonight",
    time: "6:00 PM - 7:30 PM",
    location: "Winslow Township Park",
  },
  teamStatus: {
    players: 22,
    attending: 18,
    unknown: 2,
    notAttending: 2,
  },
  transportation: {
    needsRide: 2,
    canOfferRide: 3,
  },
  actionItems: [
    "2 Players Missing Physical",
    "1 Parent Message Unread",
    "Tournament Roster Due Friday",
  ],
};

const bottomNavItems = ["Home", "Schedule", "Team", "Messages", "More"];

export default function CoachHome() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav />

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h1 className="text-3xl font-bold">GameDay - Coach</h1>
        </div>

        <p className="mt-5 text-slate-300">{coachHome.teamName}</p>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Today
          </h2>
          <div className="mt-4 rounded-xl bg-slate-800 p-4">
            <p className="font-semibold">{coachHome.todayEvent.title}</p>
            <p className="mt-2 text-sm text-slate-300">
              {coachHome.todayEvent.time}
            </p>
            <p className="mt-1 text-sm text-slate-300">
              {coachHome.todayEvent.location}
            </p>
          </div>
          <Link
            href="/events"
            className="mt-4 block w-full rounded-xl bg-blue-500 py-3 text-center font-semibold text-white"
          >
            View Event
          </Link>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Team Status</h2>
          <p className="mt-3 text-2xl font-bold">
            {coachHome.teamStatus.players} Players
          </p>
          <div className="mt-4 space-y-2 text-sm text-slate-300">
            <p className="text-blue-300">
              {coachHome.teamStatus.attending} Attending
            </p>
            <p>{coachHome.teamStatus.unknown} Unknown</p>
            <p className="text-red-300">
              {coachHome.teamStatus.notAttending} Not Attending
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Transportation</h2>
          <div className="mt-3 space-y-2 text-sm">
            <p className="text-red-300">
              {coachHome.transportation.needsRide} Need Ride
            </p>
            <p className="text-blue-300">
              {coachHome.transportation.canOfferRide} Can Offer Ride
            </p>
          </div>
          <button
            type="button"
            className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-900 py-3 font-semibold text-white"
          >
            View Transportation
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Action Items</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            {coachHome.actionItems.map((item) => (
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
          {bottomNavItems.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </nav>
      </section>
    </main>
  );
}
