import Link from "next/link";
import { notFound } from "next/navigation";
import { getAthletesByIds } from "../data/athletes";
import {
  getAttendanceEntriesByEventId,
  getAttendanceSummaryByEventId,
} from "../data/attendance";
import { getCoachesByIds } from "../data/coaches";
import { getEventById, getEventsByIds } from "../data/events";
import { getMessagesByTeamId, teamCommunicationItems } from "../data/messages";
import { getRegistrationsByTeamId } from "../data/registrations";
import { getTeamById } from "../data/teams";
import {
  getTransportationEntriesByEventId,
  getTransportationSummaryByEventId,
} from "../data/transportation";
import AttendanceRosterCard from "./AttendanceRosterCard";
import AttendanceSummaryCard from "./AttendanceSummaryCard";
import MvpNav, { getRoleHref, type MvpNavRole } from "./MvpNav";
import RegistrationRosterCard from "./RegistrationRosterCard";
import TeamReadinessSummary from "./TeamReadinessSummary";
import TransportationSummaryCard from "./TransportationSummaryCard";

type TeamDetailsProps = {
  teamId: string;
  role?: MvpNavRole;
};

export default function TeamDetails({
  teamId,
  role = "shared",
}: TeamDetailsProps) {
  const teamDetails = getTeamById(teamId);

  if (!teamDetails) {
    notFound();
  }

  const teamCoaches = getCoachesByIds(teamDetails.coachIds);
  const nextEvent = teamDetails.nextEventId
    ? getEventById(teamDetails.nextEventId)
    : undefined;
  const rosterPreview = getAthletesByIds(teamDetails.rosterPreviewIds);
  const roster = getAthletesByIds(teamDetails.athleteIds);
  const teamRegistrations = getRegistrationsByTeamId(teamDetails.id);
  const teamAnnouncements = getMessagesByTeamId(teamDetails.id).filter(
    (message) => message.type === "Team Announcement",
  );
  const upcomingEvents = getEventsByIds(teamDetails.eventIds);
  const attendance = nextEvent
    ? getAttendanceSummaryByEventId(nextEvent.id)
    : undefined;
  const attendanceEntries = nextEvent
    ? getAttendanceEntriesByEventId(nextEvent.id)
    : [];
  const transportation = nextEvent
    ? getTransportationSummaryByEventId(nextEvent.id)
    : undefined;
  const transportationEntries = nextEvent
    ? getTransportationEntriesByEventId(nextEvent.id)
    : [];
  const teamStatusItems = nextEvent
    ? [
        `${teamDetails.playerCount} Registered`,
        `${attendance?.attending ?? 0} Confirmed For ${nextEvent.type}`,
        `${attendance?.unknown ?? 0} Unknown Attendance`,
        `${transportation?.needsRide ?? 0} Need Ride`,
        ...teamDetails.status.filter((status) => status.includes("Missing")),
      ]
    : teamDetails.status;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav role={role} />

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <Link href={getRoleHref("/teams", role)} className="text-2xl font-bold">
            &larr; {teamDetails.name}
          </Link>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h1 className="text-3xl font-bold">{teamDetails.name}</h1>
          <p className="mt-3 text-sm text-slate-300">
            {teamDetails.playerCount} Players
          </p>
          <div className="mt-4 space-y-2 text-sm text-slate-300">
            {teamCoaches.length > 0 ? (
              teamCoaches.map((coach) => <p key={coach.id}>{coach.name}</p>)
            ) : (
              <p>No coaches assigned.</p>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Next Event
          </h2>
          {nextEvent ? (
            <>
              <div className="mt-4 rounded-xl bg-slate-800 p-4">
                <p className="font-semibold">{nextEvent.type}</p>
                <p className="mt-3 text-sm text-slate-300">{nextEvent.date}</p>
                <p className="mt-1 text-sm text-slate-300">{nextEvent.time}</p>
                {nextEvent.location && (
                  <p className="mt-3 text-sm text-slate-300">
                    {nextEvent.location}
                  </p>
                )}
              </div>
              <Link
                href={getRoleHref(`/events/${nextEvent.id}`, role)}
                className="mt-4 block w-full rounded-xl bg-blue-500 py-3 text-center font-semibold text-white"
              >
                View Event
              </Link>
            </>
          ) : (
            <p className="mt-4 text-sm text-slate-300">No upcoming event.</p>
          )}
        </div>

        {nextEvent && (
          <TeamReadinessSummary
            actionHref={getRoleHref(`/events/${nextEvent.id}`, role)}
            attendanceEntries={attendanceEntries}
            eventId={nextEvent.id}
            registrations={teamRegistrations}
            transportationEntries={transportationEntries}
          />
        )}

        {nextEvent ? (
          <AttendanceRosterCard
            eventId={nextEvent.id}
            roster={roster}
            rosterPreview={rosterPreview}
            entries={attendanceEntries}
          />
        ) : (
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-bold">Roster</h2>
            <p className="mt-3 text-sm text-slate-300">
              {teamDetails.playerCount} Players
            </p>
            <div className="mt-4 space-y-2 text-sm text-slate-300">
              {rosterPreview.map((player) => (
                <p key={player.id}>{player.name}</p>
              ))}
              {roster.length > rosterPreview.length && <p>...</p>}
            </div>
          </div>
        )}

        {nextEvent && (
          <AttendanceSummaryCard
            eventId={nextEvent.id}
            entries={attendanceEntries}
            actionHref={getRoleHref(`/events/${nextEvent.id}`, role)}
            showDetails={false}
          />
        )}

        <RegistrationRosterCard
          registrations={teamRegistrations}
          roster={roster}
        />

        {nextEvent && (
          <TransportationSummaryCard
            eventId={nextEvent.id}
            entries={transportationEntries}
            actionHref={getRoleHref(`/events/${nextEvent.id}`, role)}
            showDetails={false}
          />
        )}

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Team Announcements</h2>
          <div className="mt-3 space-y-3 text-sm text-slate-300">
            {teamAnnouncements.length > 0 ? (
              teamAnnouncements.map((announcement) => (
                <p key={announcement.id}>{announcement.content}</p>
              ))
            ) : (
              <p>No team announcements yet.</p>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Team Status</h2>
          <div className="mt-3 space-y-3 text-sm text-slate-300">
            {teamStatusItems.map((status) => (
              <p key={status}>{status}</p>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Upcoming Events</h2>
          <div className="mt-3 space-y-3 text-sm text-slate-300">
            {upcomingEvents.map((event) => (
              <Link
                key={event.id}
                href={getRoleHref(`/events/${event.id}`, role)}
                className="block rounded-xl bg-slate-800 p-4"
              >
                {event.shortDate} {event.type}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Communication</h2>
          <div className="mt-3 space-y-3 text-sm text-slate-300">
            {teamCommunicationItems.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
