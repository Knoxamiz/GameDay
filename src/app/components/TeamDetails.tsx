import Link from "next/link";
import { notFound } from "next/navigation";
import { withActiveOrganization } from "../data/activeOrganization";
import { summarizeAttendanceEntries } from "../data/attendance";
import {
  getCoachTeamNextAction,
  getCoachTeamReadinessSummary,
  getCoachTeamResponseSummary,
  type CoachNextActionTone,
} from "../data/coachDashboard";
import { summarizeDocumentRequirements } from "../data/documents";
import {
  eventHasTeamId,
  getEventDateLabel,
  getEventLocationLabel,
  getEventShortDateLabel,
  getEventStatusLabel,
  getEventTimeLabel,
  isArchivedEvent,
  isEventVisibleToNonAdmin,
  isPublishedEvent,
  isUpcomingEvent,
  sortEventsByStartDate,
} from "../data/events";
import {
  getEventScheduleReadModel,
  type EventScheduleRole,
} from "../data/eventSchedule.server";
import { getCurrentParentUser } from "../data/currentUser.server";
import { getOrganizationContext } from "../data/organizationContext.server";
import { getTeamStatusLabel } from "../data/teams";
import { summarizePaymentRequirements } from "../data/payments";
import {
  getDocumentRequirementsFromRegistrations,
  getPaymentRequirementsFromRegistrations,
} from "../data/registrationDerivedRequirements";
import { isParentEventEligibleRegistration } from "../data/registrations";
import { summarizeTransportationEntries } from "../data/transportation";
import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";
import AttendanceRosterCard from "./AttendanceRosterCard";
import AttendanceSummaryCard from "./AttendanceSummaryCard";
import MvpNav from "./MvpNav";
import RegistrationRosterCard from "./RegistrationRosterCard";
import TeamReadinessSummary from "./TeamReadinessSummary";
import TransportationSummaryCard from "./TransportationSummaryCard";

type TeamDetailsProps = {
  activeOrganizationId?: string;
  teamId: string;
  role?: EventScheduleRole;
};

function isDefined<TValue>(
  value: TValue | null | undefined,
): value is TValue {
  return Boolean(value);
}

function getCoachActionToneClasses(tone: CoachNextActionTone) {
  if (tone === "ready") {
    return "border-blue-500/40 bg-blue-500/10 text-blue-100";
  }

  if (tone === "attention") {
    return "border-yellow-500/40 bg-yellow-500/10 text-yellow-100";
  }

  return "border-slate-700 bg-slate-950 text-slate-200";
}

function getCoachEventTone(status: string) {
  if (status === "canceled") {
    return "bg-red-500/20 text-red-300";
  }

  return "bg-blue-500/20 text-blue-300";
}

function getCoachReadinessTone(openItems: number, limited: boolean) {
  if (limited) {
    return "text-slate-300";
  }

  return openItems > 0 ? "text-yellow-200" : "text-blue-300";
}

export default async function TeamDetails({
  activeOrganizationId,
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

  const scopedSchedule = await getEventScheduleReadModel(
    role,
    activeOrganizationId,
  );
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
              isParentEventEligibleRegistration(registration) &&
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
  const visibleAthleteIdSet = new Set(
    teamRegistrations.map((registration) => registration.athleteId),
  );
  const teamEvents = (await repositories.events.listByTeamId(teamDetails.id))
    .filter((event) =>
      role === "admin"
        ? !isArchivedEvent(event)
        : isEventVisibleToNonAdmin(event),
    )
    .sort(sortEventsByStartDate);
  const visibleUpcomingEvents = teamEvents.filter((event) =>
    isUpcomingEvent(event),
  );
  const nextEvent =
    role === "coach"
      ? nextEventRecord &&
        isEventVisibleToNonAdmin(nextEventRecord) &&
        eventHasTeamId(nextEventRecord, teamDetails.id) &&
        isUpcomingEvent(nextEventRecord)
        ? nextEventRecord
        : visibleUpcomingEvents[0]
      : isPublishedEvent(nextEventRecord) &&
          eventHasTeamId(nextEventRecord, teamDetails.id)
        ? nextEventRecord
        : teamEvents.find(isPublishedEvent);
  const documentSummary = summarizeDocumentRequirements(
    getDocumentRequirementsFromRegistrations(teamRegistrations),
  );
  const paymentSummary = summarizePaymentRequirements(
    getPaymentRequirementsFromRegistrations(teamRegistrations),
  );
  const upcomingEvents = role === "coach" ? visibleUpcomingEvents : teamEvents;
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
      : await repositories.attendance.listByEventId(nextEvent.id).then((entries) =>
          role === "coach"
            ? entries.filter(
                (entry) =>
                  entry.athleteId && visibleAthleteIdSet.has(entry.athleteId),
              )
            : entries,
        )
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
      : await repositories.transportation.listByEventId(nextEvent.id).then((entries) =>
          role === "coach"
            ? entries.filter(
                (entry) =>
                  entry.athleteId && visibleAthleteIdSet.has(entry.athleteId),
              )
            : entries,
        )
    : [];
  const attendance = nextEvent
    ? summarizeAttendanceEntries(nextEvent.id, attendanceEntries)
    : undefined;
  const transportation = nextEvent
    ? summarizeTransportationEntries(nextEvent.id, transportationEntries)
    : undefined;
  const teamBaseHref = role === "admin" ? "/admin/teams" : "/teams";
  const eventBaseHref = role === "admin" ? "/admin/schedule" : "/events";

  if (role === "coach") {
    const teamOrganization = await repositories.organizations.getById(
      teamDetails.organizationId,
    );
    const organizationLabel =
      teamOrganization?.name ?? organizationContext?.label ?? "Organization unavailable";
    const rosteredAthleteIds = teamRegistrations.map(
      (registration) => registration.athleteId,
    );
    const rosterById = new Map(roster.map((athlete) => [athlete.id, athlete]));
    const readiness = getCoachTeamReadinessSummary(teamRegistrations);
    const responseSummary = getCoachTeamResponseSummary({
      attendanceEntries,
      event: nextEvent,
      rosteredAthleteIds,
      transportationEntries,
    });
    const teamHref = withActiveOrganization(
      `${teamBaseHref}/${teamDetails.id}`,
      activeOrganizationId,
    );
    const eventHref = nextEvent
      ? withActiveOrganization(
          `${eventBaseHref}/${nextEvent.id}`,
          activeOrganizationId,
        )
      : undefined;
    const nextAction = getCoachTeamNextAction({
      eventHref,
      nextEvent: nextEvent ? { status: nextEvent.status } : undefined,
      responseSummary,
      rosteredAthletes: teamRegistrations.length,
      teamHref,
    });
    const teamDetail = [teamDetails.division, teamDetails.season]
      .filter(Boolean)
      .join(" - ");
    const rosterRows = teamRegistrations.map((registration) => ({
      id: registration.id,
      name:
        registration.athleteName ??
        rosterById.get(registration.athleteId)?.name ??
        "Rostered athlete",
    }));

    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <section className="mx-auto max-w-md px-5 py-6">
          <MvpNav
            activeOrganizationId={activeOrganizationId}
            organizationContext={organizationContext}
          />

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <Link href="/coach" className="text-sm font-semibold text-slate-300">
              &larr; Back to Coach
            </Link>
            <h1 className="mt-3 text-3xl font-bold">{teamDetails.name}</h1>
            <p className="mt-2 text-sm text-slate-300">{organizationLabel}</p>
            {teamDetail && (
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {teamDetail}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-blue-500/20 px-3 py-1 text-blue-300">
                Active assignment
              </span>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-300">
                {teamRegistrations.length} Rostered
              </span>
            </div>
          </div>

          <div
            className={`mt-4 rounded-2xl border p-5 ${getCoachActionToneClasses(
              nextAction.tone,
            )}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
              Next action
            </p>
            <p className="mt-2 text-xl font-bold">{nextAction.label}</p>
            <p className="mt-2 text-sm opacity-90">{nextAction.description}</p>
            {nextAction.href && nextAction.href !== teamHref && (
              <Link
                href={nextAction.href}
                className="mt-4 block rounded-xl bg-blue-500 py-3 text-center text-sm font-semibold text-white"
              >
                {nextAction.label}
              </Link>
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
            <div className="rounded-xl bg-slate-900 p-3">
              <p className="text-slate-400">Roster</p>
              <p className="mt-1 text-lg text-white">
                {teamRegistrations.length}
              </p>
            </div>
            <div className="rounded-xl bg-slate-900 p-3">
              <p className="text-slate-400">Ready</p>
              <p
                className={`mt-1 text-lg ${getCoachReadinessTone(
                  readiness.openItems,
                  readiness.limited,
                )}`}
              >
                {readiness.readyAthletes}
              </p>
            </div>
            <div className="rounded-xl bg-slate-900 p-3">
              <p className="text-slate-400">Open</p>
              <p
                className={`mt-1 text-lg ${
                  readiness.openItems > 0 ? "text-yellow-200" : "text-blue-300"
                }`}
              >
                {readiness.openItems}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-bold">Readiness</h2>
            <p
              className={`mt-3 font-semibold ${getCoachReadinessTone(
                readiness.openItems,
                readiness.limited,
              )}`}
            >
              {readiness.label}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              {readiness.limited
                ? "Requirement and payment details are limited for this roster."
                : `${readiness.readyAthletes} of ${readiness.rosteredAthletes} rostered athletes are clear from current registration records.`}
            </p>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Next Event</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Published or canceled events in this assigned team scope.
                </p>
              </div>
              {nextEvent && (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getCoachEventTone(
                    nextEvent.status,
                  )}`}
                >
                  {getEventStatusLabel(nextEvent)}
                </span>
              )}
            </div>

            {nextEvent ? (
              <>
                <div className="mt-4 rounded-xl bg-slate-800 p-4">
                  <p className="font-semibold">{nextEvent.title}</p>
                  <p className="mt-3 text-sm text-slate-300">
                    {getEventDateLabel(nextEvent)}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    {getEventTimeLabel(nextEvent)}
                  </p>
                  <p className="mt-3 text-sm text-slate-300">
                    {getEventLocationLabel(nextEvent)}
                  </p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-slate-800 p-3">
                    <p className="text-slate-400">Attendance</p>
                    <p className="mt-1 font-semibold text-white">
                      {responseSummary.attendanceSubmitted} of{" "}
                      {teamRegistrations.length}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {responseSummary.attendanceMissing} missing
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-800 p-3">
                    <p className="text-slate-400">Transportation</p>
                    <p className="mt-1 font-semibold text-white">
                      {responseSummary.transportationSubmitted} of{" "}
                      {teamRegistrations.length}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {responseSummary.transportationMissing} missing
                    </p>
                  </div>
                </div>
                <Link
                  href={eventHref ?? "/events"}
                  className="mt-4 block rounded-xl bg-blue-500 py-3 text-center font-semibold text-white"
                >
                  Event Details
                </Link>
              </>
            ) : (
              <p className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm text-slate-300">
                No published or canceled upcoming events are scheduled for this
                assigned team.
              </p>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-bold">Active Roster</h2>
            <p className="mt-2 text-sm text-slate-400">
              Rostered, eligible registrations for this assigned active team.
            </p>
            <div className="mt-4 space-y-2 text-sm text-slate-300">
              {rosterRows.length > 0 ? (
                rosterRows.map((player) => (
                  <p key={player.id} className="rounded-xl bg-slate-800 p-3">
                    {player.name}
                  </p>
                ))
              ) : (
                <p className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                  No active rostered athletes are available for this team yet.
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-bold">Upcoming Events</h2>
            <div className="mt-3 space-y-3 text-sm text-slate-300">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={withActiveOrganization(
                      `${eventBaseHref}/${event.id}`,
                      activeOrganizationId,
                    )}
                    className="block rounded-xl bg-slate-800 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">
                          {event.title}
                        </p>
                        <p className="mt-2">
                          {getEventShortDateLabel(event)} {getEventTimeLabel(event)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getCoachEventTone(
                          event.status,
                        )}`}
                      >
                        {getEventStatusLabel(event)}
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                  No published or canceled upcoming events are scheduled for this
                  assigned team.
                </p>
              )}
            </div>
          </div>
        </section>
      </main>
    );
  }

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
    : Array.isArray(teamDetails.status)
      ? teamDetails.status
      : [getTeamStatusLabel(teamDetails)];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav
          activeOrganizationId={activeOrganizationId}
          organizationContext={organizationContext}
        />

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <Link
            href={withActiveOrganization(teamBaseHref, activeOrganizationId)}
            className="text-2xl font-bold"
          >
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
                href={withActiveOrganization(
                  `${eventBaseHref}/${nextEvent.id}`,
                  activeOrganizationId,
                )}
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
            actionHref={withActiveOrganization(
              `${eventBaseHref}/${nextEvent.id}`,
              activeOrganizationId,
            )}
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
            actionHref={withActiveOrganization(
              `${eventBaseHref}/${nextEvent.id}`,
              activeOrganizationId,
            )}
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
            actionHref={withActiveOrganization(
              `${eventBaseHref}/${nextEvent.id}`,
              activeOrganizationId,
            )}
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
                href={withActiveOrganization(
                  `${eventBaseHref}/${event.id}`,
                  activeOrganizationId,
                )}
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
