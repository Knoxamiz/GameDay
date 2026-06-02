import MvpNav from "../components/MvpNav";

const eventDetails = {
  title: "Practice",
  team: "Black Diamonds 12U",
  type: "Practice",
  date: "Tuesday, June 2",
  time: "6:00 PM - 7:30 PM",
  location: "Winslow Township Park",
  status: "Event Active",
  lastUpdated: "Today 3:42 PM",
  announcements: ["Bring water bottles", "Wear black jersey", "Field 2 tonight"],
  attendance: {
    total: 22,
    attending: 18,
    unknown: 2,
    notAttending: 2,
  },
  transportation: {
    needsRide: 2,
    canOfferRide: 3,
  },
  notes: ["Grass field", "Bathrooms available", "Parking lot entrance open"],
  chat: ["Coach Update", "Parent Questions"],
};

export default function EventsHome() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav />

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h1 className="text-3xl font-bold">{eventDetails.title}</h1>
          <p className="mt-5 text-sm font-semibold text-slate-200">
            {eventDetails.team}
          </p>
          <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
            {eventDetails.type}
          </p>
          <p className="mt-4 text-sm text-slate-300">{eventDetails.date}</p>
          <p className="mt-1 text-sm text-slate-300">{eventDetails.time}</p>
          <p className="mt-4 text-sm text-slate-300">
            {eventDetails.location}
          </p>
          <button
            type="button"
            className="mt-4 w-full rounded-xl bg-blue-500 py-3 font-semibold text-white"
          >
            Directions
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Status</h2>
          <p className="mt-3 text-sm font-semibold text-blue-300">
            {eventDetails.status}
          </p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Last Updated
          </p>
          <p className="mt-1 text-sm text-slate-300">
            {eventDetails.lastUpdated}
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Announcements</h2>
          <ul className="mt-3 space-y-3 text-sm text-slate-300">
            {eventDetails.announcements.map((announcement) => (
              <li key={announcement}>{announcement}</li>
            ))}
          </ul>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Attendance</h2>
          <p className="mt-3 text-sm text-slate-300">
            {eventDetails.attendance.total} Players
          </p>
          <div className="mt-4 space-y-2 text-sm">
            <p className="text-blue-300">
              {eventDetails.attendance.attending} Attending
            </p>
            <p className="text-slate-300">
              {eventDetails.attendance.unknown} Unknown
            </p>
            <p className="text-red-300">
              {eventDetails.attendance.notAttending} Not Attending
            </p>
          </div>
          <button
            type="button"
            className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-900 py-3 font-semibold text-white"
          >
            View Players
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Transportation</h2>
          <div className="mt-3 space-y-2 text-sm">
            <p className="text-red-300">
              {eventDetails.transportation.needsRide} Need Ride
            </p>
            <p className="text-blue-300">
              {eventDetails.transportation.canOfferRide} Can Offer Ride
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
          <h2 className="text-lg font-bold">Event Notes</h2>
          <ul className="mt-3 space-y-3 text-sm text-slate-300">
            {eventDetails.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Event Chat</h2>
          <div className="mt-3 space-y-3 text-sm text-slate-300">
            {eventDetails.chat.map((chatItem) => (
              <p key={chatItem}>{chatItem}</p>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
