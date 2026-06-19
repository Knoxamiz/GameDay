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
    return "border-blue-200 bg-blue-50 text-blue-900";
  }

  if (tone === "attention") {
    return "border-orange-200 bg-orange-50 text-orange-900";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function getCoachEventTone(status: string) {
  if (status === "canceled") {
    return "bg-red-50 text-red-700";
  }

  return "bg-emerald-50 text-emerald-700";
}

function getCoachReadinessTone(openItems: number, limited: boolean) {
  if (limited) {
    return "text-slate-600";
  }

  return openItems > 0 ? "text-orange-600" : "text-blue-600";
}

function getCoachResponseTone(status: string) {
  if (status === "Attending" || status === "Driving Self") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "Not Attending" || status === "Needs Ride") {
    return "bg-yellow-50 text-yellow-700";
  }

  return "bg-slate-100 text-slate-600";
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
    const parentIds = [
      ...new Set(
        teamRegistrations
          .map((registration) => registration.parentId)
          .filter(Boolean),
      ),
    ];
    const parentRecords = await Promise.all(
      parentIds.map((parentId) => repositories.parents.getById(parentId)),
    );
    const parentById = new Map(
      parentRecords.flatMap((parent) => (parent ? [[parent.id, parent]] : [])),
    );
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
      attendanceStatus:
        attendanceEntries.find(
          (entry) =>
            entry.athleteId === registration.athleteId &&
            entry.eventId === nextEvent?.id,
        )?.status ?? "Unknown",
      id: registration.id,
      name:
        registration.athleteName ??
        rosterById.get(registration.athleteId)?.name ??
        "Rostered athlete",
      parent: parentById.get(registration.parentId),
      parentName: registration.parentName,
      transportationStatus:
        transportationEntries.find(
          (entry) =>
            entry.athleteId === registration.athleteId &&
            entry.eventId === nextEvent?.id,
        )?.status ?? "Unknown",
    }));

    return (
      <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
        <section className="mx-auto max-w-5xl px-3 py-4 sm:px-5">
          <header className="gd-card-light flex flex-col gap-3 rounded-lg p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <Link
                href="/coach"
                className="text-sm font-black text-blue-600 hover:text-blue-700"
              >
                &larr; Coach Home
              </Link>
              <h1 className="mt-2 truncate text-xl font-black">
                {teamDetails.name}
              </h1>
              <p className="mt-1 truncate text-sm font-semibold text-slate-500">
                {organizationLabel}
              </p>
              {teamDetail && (
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {teamDetail}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-black">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                Active assignment
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                {teamRegistrations.length} rostered
              </span>
            </div>
          </header>

          <div
            className={`mt-3 rounded-lg border p-3 shadow-sm ${getCoachActionToneClasses(
              nextAction.tone,
            )}`}
          >
            <p className="text-xs font-black uppercase tracking-wide opacity-80">
              Main target
            </p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-base font-black">{nextAction.label}</p>
                <p className="mt-1 text-xs font-semibold opacity-90">
                  {nextAction.description}
                </p>
              </div>
              {nextAction.href && nextAction.href !== teamHref && (
                <Link
                  href={nextAction.href}
                  className="rounded-md bg-blue-600 px-3 py-2 text-center text-xs font-black text-white hover:bg-blue-700"
                >
                  Open
                </Link>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-bold">
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-slate-500">Roster</p>
              <p className="mt-1 text-xl text-slate-950">
                {teamRegistrations.length}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-slate-500">Ready</p>
              <p
                className={`mt-1 text-xl ${getCoachReadinessTone(
                  readiness.openItems,
                  readiness.limited,
                )}`}
              >
                {readiness.readyAthletes}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-slate-500">Open</p>
              <p
                className={`mt-1 text-xl ${
                  readiness.openItems > 0 ? "text-orange-600" : "text-blue-600"
                }`}
              >
                {readiness.openItems}
              </p>
            </div>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="gd-card-light rounded-lg p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-black">Next Event</h2>
                  {nextEvent ? (
                    <>
                      <p className="mt-2 truncate font-black">
                        {nextEvent.title}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-600">
                        {getEventDateLabel(nextEvent)} ·{" "}
                        {getEventTimeLabel(nextEvent)}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {getEventLocationLabel(nextEvent)}
                      </p>
                    </>
                  ) : (
                    <p className="mt-3 text-sm font-semibold text-slate-500">
                      No upcoming events scheduled for this assigned team.
                    </p>
                  )}
                </div>
                {nextEvent && (
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${getCoachEventTone(
                      nextEvent.status,
                    )}`}
                  >
                    {getEventStatusLabel(nextEvent)}
                  </span>
                )}
              </div>

              {nextEvent && (
                <>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md bg-white/70 p-2.5">
                      <p className="font-semibold text-slate-500">Attendance</p>
                      <p className="mt-1 font-black text-slate-950">
                        {responseSummary.attendanceSubmitted} of{" "}
                        {teamRegistrations.length}
                      </p>
                    </div>
                    <div className="rounded-md bg-white/70 p-2.5">
                      <p className="font-semibold text-slate-500">
                        Transportation
                      </p>
                      <p className="mt-1 font-black text-slate-950">
                        {responseSummary.transportationSubmitted} of{" "}
                        {teamRegistrations.length}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={eventHref ?? "/events"}
                    className="mt-3 block rounded-md bg-blue-600 py-2 text-center text-xs font-black text-white hover:bg-blue-700"
                  >
                    Event Details
                  </Link>
                </>
              )}
            </section>

            <details className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3">
                <span>
                  <span className="block text-base font-black">
                    Roster & Parents
                  </span>
                  <span className="mt-1 block text-xs font-semibold text-slate-500">
                    Contact and response details.
                  </span>
                </span>
                <span className="text-lg font-black text-blue-600 transition group-open:rotate-90">
                  &rsaquo;
                </span>
              </summary>
              <div className="space-y-2 border-t border-slate-200 p-3 text-sm">
                {rosterRows.length > 0 ? (
                  rosterRows.map((player) => (
                    <div
                      key={player.id}
                      className="rounded-md border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-black text-slate-950">
                            {player.name}
                          </p>
                          <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                            {player.parent?.name ||
                              player.parentName ||
                              "Parent"}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${getCoachResponseTone(
                            player.attendanceStatus,
                          )}`}
                        >
                          {player.attendanceStatus}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-black ${getCoachResponseTone(
                            player.transportationStatus,
                          )}`}
                        >
                          {player.transportationStatus}
                        </span>
                        {player.parent?.email && (
                          <a
                            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-700 hover:bg-slate-100"
                            href={`mailto:${player.parent.email}`}
                          >
                            Email parent
                          </a>
                        )}
                        {player.parent?.phone && (
                          <a
                            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-700 hover:bg-slate-100"
                            href={`tel:${player.parent.phone}`}
                          >
                            Call
                          </a>
                        )}
                        {!player.parent?.email && !player.parent?.phone && (
                          <span className="text-xs font-semibold text-slate-500">
                            No parent contact listed
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-slate-500">
                    No active rostered athletes are available for this team yet.
                  </p>
                )}
              </div>
            </details>
          </div>

          <section className="gd-card-light mt-3 rounded-lg p-3">
            <h2 className="text-base font-black">Upcoming Events</h2>
            <div className="mt-3 space-y-2 text-sm">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={withActiveOrganization(
                      `${eventBaseHref}/${event.id}`,
                      activeOrganizationId,
                    )}
                    className="block rounded-md border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-black text-slate-950">
                          {event.title}
                        </p>
                        <p className="mt-1 text-slate-600">
                          {getEventShortDateLabel(event)} ·{" "}
                          {getEventTimeLabel(event)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${getCoachEventTone(
                          event.status,
                        )}`}
                      >
                        {getEventStatusLabel(event)}
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-slate-500">
                  No upcoming events scheduled for this assigned team.
                </p>
              )}
            </div>
          </section>
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
              `${paymentSummary.open} payment item${
                paymentSummary.open === 1 ? "" : "s"
              } open`,
            ]
          : []),
      ]
    : Array.isArray(teamDetails.status)
      ? teamDetails.status
      : [getTeamStatusLabel(teamDetails)];

  return (
    <main className="min-h-screen bg-[#020817] text-white">
      <section className="mx-auto max-w-3xl px-3 py-4 sm:px-5">
        <MvpNav
          activeOrganizationId={activeOrganizationId}
          organizationContext={organizationContext}
        />

        <div className="gd-card-dark rounded-lg p-3">
          <Link
            href={withActiveOrganization(teamBaseHref, activeOrganizationId)}
            className="text-base font-black"
          >
            &larr; {teamDetails.name}
          </Link>
        </div>

        <div className="gd-card-dark mt-3 rounded-lg p-3">
          <h1 className="text-xl font-black">{teamDetails.name}</h1>
          <p className="mt-1 text-xs text-slate-300">
            {roster.length} Rostered Athlete{roster.length === 1 ? "" : "s"}
          </p>
          <div className="mt-2 space-y-1.5 text-xs text-slate-300">
            {teamCoaches.length > 0 ? (
              teamCoaches.map((coach) => <p key={coach.id}>{coach.name}</p>)
            ) : (
              <p>No coaches assigned.</p>
            )}
          </div>
        </div>

        <div className="gd-card-dark mt-3 rounded-lg p-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Next Event
          </h2>
          {nextEvent ? (
            <>
              <div className="mt-2 rounded-md bg-white/[0.06] p-3">
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
                className="mt-3 block w-full rounded-md bg-blue-600 py-2 text-center text-xs font-black text-white"
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
          <div className="gd-card-dark mt-3 rounded-lg p-3">
            <h2 className="text-base font-black">Roster</h2>
            <p className="mt-2 text-xs text-slate-300">
              {roster.length} Rostered Athlete{roster.length === 1 ? "" : "s"}
            </p>
            <div className="mt-2 space-y-1.5 text-xs text-slate-300">
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

        <details className="gd-card-dark group mt-3 overflow-hidden rounded-lg">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3">
            <h2 className="text-base font-black">Team Announcements</h2>
            <span className="text-lg font-black text-blue-300 transition group-open:rotate-90">
              &rsaquo;
            </span>
          </summary>
          <div className="space-y-2 border-t border-white/10 p-3 text-xs text-slate-300">
            {teamAnnouncements.length > 0 ? (
              teamAnnouncements.map((announcement) => (
                <p key={announcement.id}>{announcement.content}</p>
              ))
            ) : (
              <p>No team announcements yet.</p>
            )}
          </div>
        </details>

        <details className="gd-card-dark group mt-3 overflow-hidden rounded-lg">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3">
            <h2 className="text-base font-black">Team Status</h2>
            <span className="text-lg font-black text-blue-300 transition group-open:rotate-90">
              &rsaquo;
            </span>
          </summary>
          <div className="space-y-2 border-t border-white/10 p-3 text-xs text-slate-300">
          {teamStatusItems.map((status) => (
            <p key={status}>{status}</p>
          ))}
          </div>
        </details>

        <details className="gd-card-dark group mt-3 overflow-hidden rounded-lg">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3">
            <h2 className="text-base font-black">Upcoming Events</h2>
            <span className="text-lg font-black text-blue-300 transition group-open:rotate-90">
              &rsaquo;
            </span>
          </summary>
          <div className="space-y-2 border-t border-white/10 p-3 text-xs text-slate-300">
            {upcomingEvents.map((event) => (
              <Link
                key={event.id}
                href={withActiveOrganization(
                  `${eventBaseHref}/${event.id}`,
                  activeOrganizationId,
                )}
                className="block rounded-md bg-white/[0.06] p-2.5"
              >
                {getEventShortDateLabel(event)} {event.type}
              </Link>
            ))}
          </div>
        </details>

      </section>
    </main>
  );
}
