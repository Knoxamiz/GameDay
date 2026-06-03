import Link from "next/link";
import { notFound } from "next/navigation";
import { getAthleteById } from "../data/athletes";
import { getEventById } from "../data/events";
import { getGameAlertByEventId } from "../data/gameAlerts";
import {
  eventAnnouncementsByEventId,
  eventChatByEventId,
} from "../data/messages";
import { getTeamById } from "../data/teams";
import {
  getTransportationEntriesByEventId,
  getTransportationSummaryByEventId,
} from "../data/transportation";
import GameAlertPanel from "./GameAlertPanel";
import MvpNav, { getRoleHref, type MvpNavRole } from "./MvpNav";

type EventDetailsProps = {
  eventId: string;
  role?: MvpNavRole;
};

export default function EventDetails({
  eventId,
  role = "shared",
}: EventDetailsProps) {
  const eventDetails = getEventById(eventId);

  if (!eventDetails) {
    notFound();
  }

  const team = eventDetails.teamId
    ? getTeamById(eventDetails.teamId)
    : undefined;
  const transportation = getTransportationSummaryByEventId(eventDetails.id);
  const gameAlert = getGameAlertByEventId(eventDetails.id);
  const eventAnnouncements =
    eventAnnouncementsByEventId[eventDetails.id] ?? [];
  const eventChat = eventChatByEventId[eventDetails.id] ?? [];
  const attendanceRecords = eventDetails.attendance.records.map((record) => ({
    ...record,
    athlete: getAthleteById(record.athleteId),
  }));
  const transportationEntries = getTransportationEntriesByEventId(
    eventDetails.id,
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav role={role} />

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <Link
            href={
              team
                ? getRoleHref(`/teams/${team.id}`, role)
                : getRoleHref("/events", role)
            }
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
          <details className="mt-4 rounded-xl border border-slate-700 bg-slate-900 text-sm text-slate-300">
            <summary className="cursor-pointer px-4 py-3 text-center font-semibold text-white">
              View Players
            </summary>
            <div className="space-y-2 border-t border-slate-800 px-4 py-3">
              {attendanceRecords.length > 0 ? (
                attendanceRecords.map((record) => (
                  <p key={record.athleteId}>
                    {record.athlete?.name ?? record.athleteId}: {record.status}
                  </p>
                ))
              ) : (
                <p>No player responses yet.</p>
              )}
            </div>
          </details>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Transportation</h2>
          <div className="mt-3 space-y-2 text-sm">
            <p className="text-red-300">{transportation.needsRide} Need Ride</p>
            <p className="text-blue-300">
              {transportation.canOfferRide} Can Offer Ride
            </p>
          </div>
          <details className="mt-4 rounded-xl border border-slate-700 bg-slate-900 text-sm text-slate-300">
            <summary className="cursor-pointer px-4 py-3 text-center font-semibold text-white">
              View Transportation
            </summary>
            <div className="space-y-2 border-t border-slate-800 px-4 py-3">
              {transportationEntries.length > 0 ? (
                transportationEntries.map((entry) => (
                  <p key={entry.id}>
                    {entry.name}: {entry.status}
                    {entry.seatsAvailable
                      ? `, ${entry.seatsAvailable} seats available`
                      : ""}
                  </p>
                ))
              ) : (
                <p>No transportation updates yet.</p>
              )}
            </div>
          </details>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Event Notes</h2>
          <ul className="mt-3 space-y-3 text-sm text-slate-300">
            {eventDetails.notes.length > 0 ? (
              eventDetails.notes.map((note) => <li key={note}>{note}</li>)
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
