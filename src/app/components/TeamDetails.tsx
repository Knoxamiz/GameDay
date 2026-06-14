import Link from "next/link";
import { notFound } from "next/navigation";
import { summarizeAttendanceEntries } from "../data/attendance";
import { summarizeDocumentRequirements } from "../data/documents";
import {
  eventHasTeamId,
  getEventDateLabel,
  getEventLocationLabel,
  getEventShortDateLabel,
  getEventTimeLabel,
  sortEventsByStartDate,
} from "../data/events";
import { getEventScheduleReadModel } from "../data/eventSchedule.server";
import { getCurrentParentUser } from "../data/currentUser.server";
import { getOrganizationContext } from "../data/organizationContext.server";
import { summarizePaymentRequirements } from "../data/payments";
import {
  getDocumentRequirementsFromRegistrations,
  getPaymentRequirementsFromRegistrations,
} from "../data/registrationDerivedRequirements";
import { summarizeTransportationEntries } from "../data/transportation";
import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";
import AttendanceRosterCard from "./AttendanceRosterCard";
import AttendanceSummaryCard from "./AttendanceSummaryCard";
import MvpNav, { type MvpNavRole } from "./MvpNav";
import RegistrationRosterCard from "./RegistrationRosterCard";
import TeamReadinessSummary from "./TeamReadinessSummary";
import TransportationSummaryCard from "./TransportationSummaryCard";

type TeamDetailsProps = {
  teamId: string;
  role?: MvpNavRole;
};

function isDefined<TValue>(
  value: TValue | null | undefined,
): value is TValue {
  return Boolean(value);
}

export default async function TeamDetails({
  teamId,
  role = "shared",
}: TeamDetailsProps) {
  if (!getFirebaseAdminConfig()) {
    notFound();
  }

  if (role === "shared") {
    notFound();
  }

  const repositories = createFirestoreRepositories();
  const teamDetails = await repositories.teams.getById(teamId);

  if (!teamDetails) {
    notFound();
  }

  const scopedSchedule = await getEventScheduleReadModel(role);
  const organizationContext = await getOrganizationContext(
    scopedSchedule.organizationIds,
  );
  const canReadTeam = scopedSchedule.teams.some((team) => team.id === teamId);

  if (!canReadTeam) {
    notFound();
  }

  const parentUser = role === "parent" ? await getCurrentParentUser() : null;

  if (role === "parent" && parentUser?.source !== "firebase-session") {
    notFound();
  }

  const teamRegistrationsPromise = parentUser
    ? repositories.registrations
        .listByParentId(parentUser.parentId)
        .then((registrations) =>
          registrations.filter(
            (registration) =>
              registration.teamId === teamDetails.id &&
              registration.parentId === parentUser.parentId &&
              (registration.ownerUid === parentUser.parentUid ||
                registration.parentUid === parentUser.parentUid ||
                (!registration.ownerUid && !registration.parentUid)),
          ),
        )
    : repositories.registrations.listRosteredByTeamId(teamDetails.id);

  const [teamCoaches, nextEventRecord, teamRegistrations] = await Promise.all([
    Promise.all(
      teamDetails.coachIds.map((coachId) =>
        repositories.coaches.getById(coachId),
      ),
    ).then((coaches) => coaches.filter(isDefined)),
    teamDetails.nextEventId
      ? repositories.events.getById(teamDetails.nextEventId)
      : null,
    teamRegistrationsPromise,
  ]);
  const roster = (
    await Promise.all(
      teamRegistrations.map((registration) =>
        repositories.athletes.getById(registration.athleteId),
      ),
    )
  )
    .filter(isDefined)
    .filter(
      (athlete) => !parentUser || athlete.parentId === parentUser.parentId,
    );
  const rosterPreview = roster.slice(0, 4);
  const visibleAthleteIdSet = new Set(roster.map((athlete) => athlete.id));
  const teamEvents = (await repositories.events.listByTeamId(teamDetails.id))
    .filter((event) => event.status !== "draft")
    .sort(sortEventsByStartDate);
  const nextEvent =
    nextEventRecord && eventHasTeamId(nextEventRecord, teamDetails.id)
      ? nextEventRecord
      : teamEvents[0];
  const documentSummary = summarizeDocumentRequirements(
    getDocumentRequirementsFromRegistrations(teamRegistrations),
  );
  const paymentSummary = summarizePaymentRequirements(
    getPaymentRequirementsFromRegistrations(teamRegistrations),
  );
  const teamAnnouncements = (
    await repositories.messages.listByTeamId(teamDetails.id)
  ).filter(
    (message) =>
      message.type === "Team Announcement" &&
      message.audience.includes(role) &&
      (!message.recipientParentId ||
        message.recipientParentId === parentUser?.parentId) &&
      (!message.recipientAthleteId ||
        visibleAthleteIdSet.has(message.recipientAthleteId)),
  );
  const upcomingEvents = teamEvents;
  const attendanceEntries = nextEvent
    ? parentUser
      ? (
          await Promise.all(
            roster.map((athlete) =>
              repositories.attendance.listByAthleteId(athlete.id),
            ),
          )
        )
          .flat()
          .filter((entry) => entry.eventId === nextEvent.id)
      : await repositories.attendance.listByEventId(nextEvent.id)
    : [];
  const transportationEntries = nextEvent
    ? parentUser
      ? (
          await Promise.all(
            roster.map((athlete) =>
              repositories.transportation.listByAthleteId(athlete.id),
            ),
          )
        )
          .flat()
          .filter((entry) => entry.eventId === nextEvent.id)
      : await repositories.transportation.listByEventId(nextEvent.id)
    : [];
  const attendance = nextEvent
    ? summarizeAttendanceEntries(nextEvent.id, attendanceEntries)
    : undefined;
  const transportation = nextEvent
    ? summarizeTransportationEntries(nextEvent.id, transportationEntries)
    : undefined;
  const teamStatusItems = nextEvent
    ? [
        `${roster.length} Rostered`,
        `${attendance?.attending ?? 0} Confirmed For ${nextEvent.type}`,
        `${attendance?.unknown ?? 0} Unknown Attendance`,
        `${transportation?.needsRide ?? 0} Need Ride`,
        ...(documentSummary.missing > 0
          ? [
              `${documentSummary.missing} Missing Documents`,
            ]
          : []),
        ...(documentSummary.needsReview > 0
          ? [
              `${documentSummary.needsReview} Documents Need Review`,
            ]
          : []),
        ...(paymentSummary.open > 0
          ? [
              `${paymentSummary.open} Payments Open`,
            ]
          : []),
      ]
    : teamDetails.status;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav organizationContext={organizationContext} />

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <Link href={"/teams"} className="text-2xl font-bold">
            &larr; {teamDetails.name}
          </Link>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h1 className="text-3xl font-bold">{teamDetails.name}</h1>
          <p className="mt-3 text-sm text-slate-300">
            {roster.length} Rostered Athlete{roster.length === 1 ? "" : "s"}
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
                <p className="mt-3 text-sm text-slate-300">
                  {getEventDateLabel(nextEvent)}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {getEventTimeLabel(nextEvent)}
                </p>
                {getEventLocationLabel(nextEvent) && (
                  <p className="mt-3 text-sm text-slate-300">
                    {getEventLocationLabel(nextEvent)}
                  </p>
                )}
              </div>
              <Link
                href={`/events/${nextEvent.id}`}
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
            actionHref={`/events/${nextEvent.id}`}
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
              {roster.length} Rostered Athlete{roster.length === 1 ? "" : "s"}
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
            actionHref={`/events/${nextEvent.id}`}
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
            actionHref={`/events/${nextEvent.id}`}
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
                href={`/events/${event.id}`}
                className="block rounded-xl bg-slate-800 p-4"
              >
                {getEventShortDateLabel(event)} {event.type}
              </Link>
            ))}
          </div>
        </div>

      </section>
    </main>
  );
}
