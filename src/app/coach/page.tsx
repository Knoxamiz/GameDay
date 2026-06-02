import MvpNav from "../components/MvpNav";

const coachHome = {
  teamName: "Black Diamonds 12U",
  todayEvent: {
    title: "Practice Tonight",
    time: "6:00 PM - 7:30 PM",
    location: "Winslow Township Park",
    note: "Helmets, cleats, and water required.",
  },
  teamStatus: "Ready for practice",
  attendance: {
    confirmed: 14,
    missing: 3,
    total: 17,
  },
  transportation: {
    confirmed: 12,
    needsRide: 2,
    unknown: 3,
  },
  actionItems: [
    "Confirm rides for 2 athletes",
    "Post reminder about uniform pickup",
    "Take attendance before warmups",
  ],
};

export default function CoachHome() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav />

        <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Coach Home
        </p>
        <h1 className="mt-2 text-3xl font-bold">GameDay</h1>
        <p className="mt-2 text-slate-300">{coachHome.teamName}</p>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Today&apos;s Event
          </p>
          <h2 className="mt-2 text-xl font-bold">
            {coachHome.todayEvent.title}
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            {coachHome.todayEvent.time}
          </p>
          <p className="mt-1 text-sm text-slate-300">
            {coachHome.todayEvent.location}
          </p>
          <p className="mt-3 rounded-xl bg-slate-800 p-4 text-sm text-slate-300">
            {coachHome.todayEvent.note}
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Team Status</h2>
          <p className="mt-3 font-semibold text-blue-300">
            {coachHome.teamStatus}
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Roster, event details, and coach action items are ready for today.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Attendance
            </h2>
            <p className="mt-3 text-2xl font-bold">
              {coachHome.attendance.confirmed}/{coachHome.attendance.total}
            </p>
            <p className="mt-1 text-sm text-slate-300">
              {coachHome.attendance.missing} not confirmed
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Transportation
            </h2>
            <p className="mt-3 text-2xl font-bold">
              {coachHome.transportation.confirmed} set
            </p>
            <p className="mt-1 text-sm text-slate-300">
              {coachHome.transportation.needsRide} need rides
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {coachHome.transportation.unknown} unknown
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Action Items</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            {coachHome.actionItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

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
      </section>
    </main>
  );
}
