import MvpNav from "../components/MvpNav";

const adminHome = {
  organizationName: "Black Diamonds Girls Flag Football",
  organizationStatus: [
    {
      label: "Registered Players",
      value: "127",
    },
    {
      label: "Active Teams",
      value: "5",
    },
    {
      label: "Coaches",
      value: "12",
    },
    {
      label: "Upcoming Events",
      value: "18",
    },
  ],
  actionItems: [
    "8 Pending Registrations",
    "3 Missing Physicals",
    "2 Teams Need Coaches",
    "1 Transportation Issue",
  ],
  upcomingEvents: [
    {
      title: "12U Practice",
      time: "Today, 6:00 PM",
      location: "Winslow Township Park",
    },
    {
      title: "10U Tournament",
      time: "Saturday, 8:00 AM",
      location: "Williamstown Sports Complex",
    },
    {
      title: "Coach Meeting",
      time: "Monday, 7:00 PM",
      location: "Clubhouse",
    },
  ],
  communications: {
    sentToday: 4,
    unreadReplies: 9,
    scheduled: 2,
  },
};

export default function AdminHome() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav />

        <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Admin Home
        </p>
        <h1 className="mt-2 text-3xl font-bold">GameDay</h1>
        <p className="mt-2 text-slate-300">{adminHome.organizationName}</p>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h2 className="text-lg font-bold">Organization Status</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {adminHome.organizationStatus.map((status) => (
              <div key={status.label} className="rounded-xl bg-slate-800 p-4">
                <p className="text-2xl font-bold">{status.value}</p>
                <p className="mt-1 text-sm text-slate-300">{status.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Action Items</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            {adminHome.actionItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Upcoming Events</h2>
          <div className="mt-3 space-y-3">
            {adminHome.upcomingEvents.map((event) => (
              <div key={event.title} className="rounded-xl bg-slate-800 p-4">
                <p className="font-semibold">{event.title}</p>
                <p className="mt-1 text-sm text-slate-300">{event.time}</p>
                <p className="mt-1 text-sm text-slate-300">{event.location}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Communications Summary</h2>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-slate-800 p-3">
              <p className="text-xl font-bold">
                {adminHome.communications.sentToday}
              </p>
              <p className="mt-1 text-xs text-slate-300">Sent Today</p>
            </div>
            <div className="rounded-xl bg-slate-800 p-3">
              <p className="text-xl font-bold">
                {adminHome.communications.unreadReplies}
              </p>
              <p className="mt-1 text-xs text-slate-300">Unread Replies</p>
            </div>
            <div className="rounded-xl bg-slate-800 p-3">
              <p className="text-xl font-bold">
                {adminHome.communications.scheduled}
              </p>
              <p className="mt-1 text-xs text-slate-300">Scheduled</p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          <button
            type="button"
            className="w-full rounded-xl bg-blue-500 py-3 font-semibold text-white"
          >
            Approve Registrations
          </button>
          <button
            type="button"
            className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 font-semibold text-white"
          >
            Create Event
          </button>
          <button
            type="button"
            className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 font-semibold text-white"
          >
            Create Team
          </button>
          <button
            type="button"
            className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 font-semibold text-white"
          >
            Add Coach
          </button>
        </div>
      </section>
    </main>
  );
}
