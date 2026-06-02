import Link from "next/link";
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
      title: "Practice Tonight",
      team: "12U Girls",
    },
    {
      title: "Tournament Saturday",
      team: "14U Girls",
    },
    {
      title: "Board Meeting Monday",
      team: "",
    },
  ],
  communications: [
    "2 Unread Coach Messages",
    "1 Organization Announcement Draft",
  ],
};

const bottomNavItems = ["Home", "Teams", "Registrations", "Schedule", "More"];

export default function AdminHome() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav />

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h1 className="text-3xl font-bold">GameDay - Admin</h1>
        </div>

        <p className="mt-5 text-slate-300">{adminHome.organizationName}</p>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Organization Status
          </h2>
          <div className="mt-4 space-y-3">
            {adminHome.organizationStatus.map((status) => (
              <div key={status.label} className="rounded-xl bg-slate-800 p-4">
                <p className="text-xl font-bold">
                  {status.value} {status.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Action Items</h2>
          <div className="mt-3 space-y-3 text-sm text-slate-300">
            {adminHome.actionItems.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Upcoming Events</h2>
          <div className="mt-3 space-y-3">
            {adminHome.upcomingEvents.map((event) => (
              <div key={event.title} className="rounded-xl bg-slate-800 p-4">
                <p className="font-semibold">{event.title}</p>
                {event.team && (
                  <p className="mt-1 text-sm text-slate-300">{event.team}</p>
                )}
              </div>
            ))}
          </div>
          <Link
            href="/events"
            className="mt-4 block w-full rounded-xl bg-blue-500 py-3 text-center font-semibold text-white"
          >
            View Schedule
          </Link>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Communications</h2>
          <div className="mt-3 space-y-3 text-sm text-slate-300">
            {adminHome.communications.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
          <button
            type="button"
            className="mt-4 w-full rounded-xl bg-blue-500 py-3 font-semibold text-white"
          >
            Send Organization Message
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Quick Actions</h2>
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
