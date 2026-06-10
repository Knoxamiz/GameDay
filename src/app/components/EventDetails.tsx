import Link from "next/link";
import { notFound } from "next/navigation";
import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";
import AttendanceSummaryCard from "./AttendanceSummaryCard";
import EventReadinessSummary from "./EventReadinessSummary";
import GameAlertPanel from "./GameAlertPanel";
import MvpNav, { getRoleHref, type MvpNavRole } from "./MvpNav";
import RideShareBoard from "./RideShareBoard";
import TransportationSummaryCard from "./TransportationSummaryCard";

type EventDetailsProps = {
  eventId: string;
  mode?: "full" | "ride-share";
  role?: MvpNavRole;
};

export default async function EventDetails({
  eventId,
  mode = "full",
  role = "shared",
}: EventDetailsProps) {
  if (!getFirebaseAdminConfig()) {
    notFound();
  }

  const repositories = createFirestoreRepositories();
  const eventDetails = await repositories.events.getById(eventId);

  if (!eventDetails) {
    notFound();
  }

  const team = eventDetails.teamId
    ? await repositories.teams.getById(eventDetails.teamId)
    : undefined;
  const [
    gameAlert,
    eventMessages,
    attendanceEntries,
    registrations,
    transportationEntries,
  ] = await Promise.all([
    repositories.gameAlerts.getByEventId(eventDetails.id),
    repositories.messages.listByEventId(eventDetails.id),
    repositories.attendance.listByEventId(eventDetails.id),
    eventDetails.teamId
      ? repositories.registrations.listByTeamId(eventDetails.teamId)
      : [],
    repositories.transportation.listByEventId(eventDetails.id),
  ]);
  const eventAnnouncements = eventMessages.map((message) => message.content);
  const eventChat = eventMessages.map((message) => message.subject);
  const eventNotes = Array.isArray(eventDetails.notes)
    ? eventDetails.notes
    : [];
  const eventActionHref = getRoleHref(`/events/${eventDetails.id}`, role);
  const rideShareHref = getRoleHref(
    `/events/${eventDetails.id}?view=ride-share`,
    role,
  );
  const registrationActionHref =
    role === "admin"
      ? "/admin/registrations"
      : role === "parent"
        ? "/registration"
        : team
          ? getRoleHref(`/teams/${team.id}`, role)
          : eventActionHref;
  const eventBackHref =
    role === "parent"
      ? "/parent"
      : team
        ? getRoleHref(`/teams/${team.id}`, role)
        : getRoleHref("/events", role);

  if (mode === "ride-share") {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <section className="mx-auto max-w-md px-5 py-6">
          <MvpNav role={role} />

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <Link href={eventBackHref} className="text-2xl font-bold">
              &larr; Ride Share
            </Link>
            <p className="mt-4 text-sm font-semibold text-slate-200">
              {eventDetails.title}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              {team?.name ?? "Organization Event"}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              {eventDetails.date} {eventDetails.time}
            </p>
          </div>

          <RideShareBoard
            entries={transportationEntries}
            eventId={eventDetails.id}
            role={role}
          />
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav role={role} />

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <Link
            href={eventBackHref}
            className="text-2xl font-bold"
          >
            &larr; {eventDetails.type}
          </Link>
          <p className="mt-5 text-sm font-semibold text-slate-200">
            {team?.name ?? "Organization Event"}
          </p>
          <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
            {eventDetails.type}
          </p>
          <p className="mt-4 text-sm text-slate-300">{eventDetails.date}</p>
          <p className="mt-1 text-sm text-slate-300">{eventDetails.time}</p>
          {eventDetails.location && (
            <p className="mt-4 text-sm text-slate-300">
              {eventDetails.location}
            </p>
          )}
          {eventDetails.directionsUrl && (
            <a
              href={eventDetails.directionsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 block w-full rounded-xl bg-blue-500 py-3 text-center font-semibold text-white"
            >
              Directions
            </a>
          )}
        </div>

        {gameAlert && <GameAlertPanel gameAlert={gameAlert} role={role} />}

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Status</h2>
          <p className="mt-3 text-sm font-semibold text-green-300">
            {eventDetails.status ?? "On Schedule"}
          </p>
          {eventDetails.lastUpdated && (
            <>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Last Updated
              </p>
              <p className="mt-1 text-sm text-slate-300">
                {eventDetails.lastUpdated}
              </p>
            </>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Announcements</h2>
          <ul className="mt-3 space-y-3 text-sm text-slate-300">
            {eventAnnouncements.length > 0 ? (
              eventAnnouncements.map((announcement) => (
                <li key={announcement}>{announcement}</li>
              ))
            ) : (
              <li>No announcements yet.</li>
            )}
          </ul>
        </div>

        <EventReadinessSummary
          actionHref={eventActionHref}
          attendanceEntries={attendanceEntries}
          eventId={eventDetails.id}
          registrationHref={registrationActionHref}
          registrations={registrations}
          transportationHref={rideShareHref}
          transportationEntries={transportationEntries}
        />

        <AttendanceSummaryCard
          eventId={eventDetails.id}
          entries={attendanceEntries}
        />

        <TransportationSummaryCard
          eventId={eventDetails.id}
          entries={transportationEntries}
        />

        <RideShareBoard
          entries={transportationEntries}
          eventId={eventDetails.id}
          role={role}
        />

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Event Notes</h2>
          <ul className="mt-3 space-y-3 text-sm text-slate-300">
            {eventNotes.length > 0 ? (
              eventNotes.map((note) => <li key={note}>{note}</li>)
            ) : (
              <li>No event notes yet.</li>
            )}
          </ul>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Event Chat</h2>
          <div className="mt-3 space-y-3 text-sm text-slate-300">
            {eventChat.length > 0 ? (
              eventChat.map((chatItem) => <p key={chatItem}>{chatItem}</p>)
            ) : (
              <p>No event messages yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
