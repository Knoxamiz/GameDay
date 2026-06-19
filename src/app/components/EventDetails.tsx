import Link from "next/link";
import { notFound } from "next/navigation";
import { withActiveOrganization } from "../data/activeOrganization";
import {
  getEventDateLabel,
  getEventLocationLabel,
  getEventNotes,
  getEventStatusLabel,
  getEventTeamIds,
  getEventTimeLabel,
  type GameDayEvent,
} from "../data/events";
import {
  getScopedEventDetailsReadModel,
  type EventScheduleRole,
} from "../data/eventSchedule.server";
import { getCurrentParentUser } from "../data/currentUser.server";
import { getOrganizationContext } from "../data/organizationContext.server";
import { isParentEventEligibleRegistration } from "../data/registrations";
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";
import AttendanceSummaryCard from "./AttendanceSummaryCard";
import EventReadinessSummary from "./EventReadinessSummary";
import GameAlertPanel from "./GameAlertPanel";
import MvpNav from "./MvpNav";
import RideShareBoard from "./RideShareBoard";
import TransportationSummaryCard from "./TransportationSummaryCard";

type EventDetailsProps = {
  activeOrganizationId?: string;
  eventId: string;
  mode?: "full" | "ride-share";
  role?: EventScheduleRole;
};

const parentEventDisplayTimeZone = "America/New_York";

function getEventStartDate(event: GameDayEvent) {
  const date = new Date(
    event.startsAt || event.startDateTime || event.date || "",
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

function getLocalDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: parentEventDisplayTimeZone,
    year: "numeric",
  }).format(date);
}

function isParentEventToday(event: GameDayEvent, now: Date) {
  const eventStartDate = getEventStartDate(event);

  if (!eventStartDate) {
    return false;
  }

  return getLocalDateKey(eventStartDate) === getLocalDateKey(now);
}

function getParentEventPlanLabel(
  attendanceStatus: string,
  transportationStatus: string,
) {
  if (attendanceStatus === "Not Attending") {
    return "Not attending";
  }

  if (transportationStatus === "Needs Ride") {
    return "Needs ride";
  }

  if (attendanceStatus === "Unknown" || transportationStatus === "Unknown") {
    return "Set event plan";
  }

  return "Plan set";
}

function getParentEventPlanClass(label: string) {
  if (label === "Plan set") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (label === "Needs ride" || label === "Set event plan") {
    return "bg-orange-50 text-orange-700";
  }

  return "bg-slate-100 text-slate-600";
}

function getParentEventStatusClass(status: string) {
  if (status === "canceled") {
    return "bg-red-50 text-red-700";
  }

  if (status === "published") {
    return "bg-emerald-50 text-emerald-700";
  }

  return "bg-slate-100 text-slate-600";
}

export default async function EventDetails({
  activeOrganizationId,
  eventId,
  mode = "full",
  role = "shared",
}: EventDetailsProps) {
  const eventReadModel = await getScopedEventDetailsReadModel(
    eventId,
    role,
    activeOrganizationId,
  );

  if (!eventReadModel) {
    notFound();
  }

  const repositories = createFirestoreRepositories();
  const eventDetails = eventReadModel.event;
  const eventUpdatesClosed = eventDetails.status !== "published";
  const organizationContext = await getOrganizationContext(
    eventReadModel.organizationIds,
  );
  const eventTeams = getEventTeamIds(eventDetails)
    .map((teamId) => eventReadModel.teams.find((team) => team.id === teamId))
    .filter(Boolean);
  const eventIsToday = isParentEventToday(eventDetails, new Date());
  const team = eventTeams[0];
  const eventTeamIds = getEventTeamIds(eventDetails);
  const parentUser = role === "parent" ? await getCurrentParentUser() : null;

  if (role === "parent" && parentUser?.source !== "firebase-session") {
    notFound();
  }

  const [gameAlert, rawEventMessages] = await Promise.all([
    repositories.gameAlerts.getByEventId(eventDetails.id),
    repositories.messages.listByEventId(eventDetails.id),
  ]);
  const registrations = parentUser
    ? (await repositories.registrations.listByParentId(parentUser.parentId)).filter(
        (registration) =>
          eventTeamIds.includes(registration.teamId) &&
          isParentEventEligibleRegistration(registration) &&
          registration.parentId === parentUser.parentId &&
          (registration.ownerUid === parentUser.parentUid ||
            registration.parentUid === parentUser.parentUid ||
            (!registration.ownerUid && !registration.parentUid)),
      )
    : [
        ...new Map(
          (
            await Promise.all(
              eventTeamIds.map((teamId) =>
                role === "admin"
                  ? repositories.registrations.listByTeamId(teamId)
                  : repositories.registrations.listRosteredByTeamId(teamId),
              ),
            )
          )
            .flat()
            .map((registration) => [registration.id, registration]),
        ).values(),
      ];
  const visibleAthleteIds = [
    ...new Set(registrations.map((registration) => registration.athleteId)),
  ];
  const [attendanceEntries, transportationEntries] = parentUser
    ? await Promise.all([
        Promise.all(
          visibleAthleteIds.map((athleteId) =>
            repositories.attendance.listByAthleteId(athleteId),
          ),
        ).then((entryLists) =>
          entryLists
            .flat()
            .filter((entry) => entry.eventId === eventDetails.id),
        ),
        Promise.all(
          visibleAthleteIds.map((athleteId) =>
            repositories.transportation.listByAthleteId(athleteId),
          ),
        ).then((entryLists) =>
          entryLists
            .flat()
            .filter((entry) => entry.eventId === eventDetails.id),
        ),
      ])
    : await Promise.all([
        repositories.attendance.listByEventId(eventDetails.id),
        repositories.transportation.listByEventId(eventDetails.id),
      ]);
  const visibleAthleteIdSet = new Set(visibleAthleteIds);
  const eventMessages = rawEventMessages.filter(
    (message) =>
      role !== "shared" &&
      message.audience.includes(role) &&
      (role === "parent"
        ? (!message.recipientParentId ||
            message.recipientParentId === parentUser?.parentId) &&
          (!message.recipientAthleteId ||
            visibleAthleteIdSet.has(message.recipientAthleteId))
        : !message.recipientParentId && !message.recipientAthleteId),
  );
  const eventAnnouncements = eventMessages.map((message) => message.content);
  const eventChat = eventMessages.map((message) => message.subject);
  const eventNotes = getEventNotes(eventDetails);
  const eventBaseHref = role === "admin" ? "/admin/schedule" : "/events";
  const teamBaseHref = role === "admin" ? "/admin/teams" : "/teams";
  const eventActionHref = withActiveOrganization(
    `${eventBaseHref}/${eventDetails.id}`,
    activeOrganizationId,
  );
  const rideShareHref = withActiveOrganization(
    role === "admin"
      ? `${eventBaseHref}/${eventDetails.id}`
      : `${eventBaseHref}/${eventDetails.id}?view=ride-share`,
    activeOrganizationId,
  );
  const registrationActionHref =
    role === "admin"
      ? withActiveOrganization(
          "/admin/registrations",
          activeOrganizationId,
        )
      : role === "parent"
        ? "/registration"
        : team
          ? withActiveOrganization(`${teamBaseHref}/${team.id}`, activeOrganizationId)
          : eventActionHref;
  const eventBackHref =
    role === "parent"
      ? "/parent"
      : role === "admin"
        ? withActiveOrganization("/admin/schedule", activeOrganizationId)
      : team
        ? withActiveOrganization(`${teamBaseHref}/${team.id}`, activeOrganizationId)
        : withActiveOrganization(eventBaseHref, activeOrganizationId);

  if (mode === "ride-share") {
    return (
      <main className="min-h-screen bg-[#020817] text-white">
        <section className="mx-auto max-w-3xl px-3 py-4 sm:px-5">
          <MvpNav
            activeOrganizationId={activeOrganizationId}
            organizationContext={organizationContext}
          />

          <div className="gd-card-dark rounded-lg p-3">
            <Link href={eventBackHref} className="text-base font-black">
              &larr; Ride Share
            </Link>
            <p className="mt-2 text-sm font-semibold text-slate-200">
              {eventDetails.title}
            </p>
            <p className="mt-1 text-xs text-slate-300">
              {eventTeams.map((eventTeam) => eventTeam?.name).join(", ") ||
                "Organization Event"}
            </p>
            <p className="mt-1 text-xs text-slate-300">
              {getEventDateLabel(eventDetails)} {getEventTimeLabel(eventDetails)}
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

  if (role === "parent") {
    const parentEventRows = registrations.map((registration) => {
      const attendanceStatus =
        attendanceEntries.find(
          (entry) => entry.athleteId === registration.athleteId,
        )?.status ?? "Unknown";
      const transportationStatus =
        transportationEntries.find(
          (entry) => entry.athleteId === registration.athleteId,
        )?.status ?? "Unknown";
      const planLabel = getParentEventPlanLabel(
        attendanceStatus,
        transportationStatus,
      );

      return {
        attendanceStatus,
        planLabel,
        registration,
        transportationStatus,
      };
    });

    return (
      <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
        <header className="border-b border-blue-100 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-3 py-2.5 sm:px-5">
            <Link className="text-lg font-black" href="/parent">
              GameDay
            </Link>
            <Link
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50"
              href={eventBackHref}
            >
              Parent Home
            </Link>
          </div>
        </header>

        <section className="mx-auto max-w-2xl px-3 py-4 pb-24 sm:px-5">
          <Link
            className="inline-flex rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50"
            href={eventBackHref}
          >
            &larr; Back
          </Link>

          <section className="gd-card-light mt-3 rounded-lg p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase text-blue-700">
                  {eventDetails.type}
                </p>
                <h1 className="mt-1 truncate text-xl font-black tracking-tight">
                  {eventDetails.title}
                </h1>
                <p className="mt-1 text-xs font-semibold text-slate-600">
                  {getEventDateLabel(eventDetails)} /{" "}
                  {getEventTimeLabel(eventDetails)}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-600">
                  {getEventLocationLabel(eventDetails)}
                </p>
              </div>
              <span className="flex shrink-0 flex-col items-end gap-2">
                {eventIsToday && (
                  <span className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-black text-white shadow-sm shadow-emerald-200">
                    Today
                  </span>
                )}
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${getParentEventStatusClass(
                    eventDetails.status,
                  )}`}
                >
                  {getEventStatusLabel(eventDetails)}
                </span>
              </span>
            </div>

            {eventDetails.address && (
              <p className="mt-3 rounded-md bg-white/70 p-2.5 text-xs font-semibold text-slate-600">
                {eventDetails.address}
              </p>
            )}
          </section>

          {eventUpdatesClosed && (
            <p className="mt-3 rounded-lg border border-orange-200 bg-orange-50 p-2.5 text-xs font-semibold text-orange-800">
              Attendance and ride updates are closed for this event.
            </p>
          )}

          {gameAlert && (
            <section className="gd-card-light mt-3 rounded-lg p-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-black">Game alert</h2>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                  {gameAlert.status}
                </span>
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-600">
                {gameAlert.homeTeamName} {gameAlert.homeScore} /{" "}
                {gameAlert.awayTeamName} {gameAlert.awayScore}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-600">
                {gameAlert.latestUpdate}
              </p>
            </section>
          )}

          <section className="mt-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black">Your players</h2>
              <p className="text-sm font-bold text-slate-500">
                {parentEventRows.length}
              </p>
            </div>

            <div className="mt-2 space-y-2">
              {parentEventRows.length === 0 ? (
                <p className="gd-card-light rounded-lg border-dashed p-3 text-sm font-semibold text-slate-500">
                  No player from your account is tied to this event.
                </p>
              ) : (
                parentEventRows.map(
                  ({
                    attendanceStatus,
                    planLabel,
                    registration,
                    transportationStatus,
                  }) => (
                    <Link
                      className="gd-card-light gd-card-interactive flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 py-2.5"
                      href={`/athletes/${registration.athleteId}`}
                      key={registration.id}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-base font-black">
                          {registration.athleteName ?? "Player"}
                        </span>
                        <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">
                          {attendanceStatus} / {transportationStatus}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${getParentEventPlanClass(
                          planLabel,
                        )}`}
                      >
                        {planLabel}
                      </span>
                    </Link>
                  ),
                )
              )}
            </div>
          </section>

          {(eventAnnouncements.length > 0 || eventNotes.length > 0) && (
            <section className="mt-4 space-y-2">
              {eventAnnouncements.length > 0 && (
                <details className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 [&::-webkit-details-marker]:hidden">
                    <span className="font-black">Announcements</span>
                    <span className="text-lg font-black text-blue-700 transition group-open:rotate-90">
                      &gt;
                    </span>
                  </summary>
                  <div className="space-y-2 border-t border-slate-200 p-3 text-xs font-semibold text-slate-600">
                    {eventAnnouncements.map((announcement) => (
                      <p key={announcement}>{announcement}</p>
                    ))}
                  </div>
                </details>
              )}

              {eventNotes.length > 0 && (
                <details className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 [&::-webkit-details-marker]:hidden">
                    <span className="font-black">Event notes</span>
                    <span className="text-lg font-black text-blue-700 transition group-open:rotate-90">
                      &gt;
                    </span>
                  </summary>
                  <div className="space-y-2 border-t border-slate-200 p-3 text-xs font-semibold text-slate-600">
                    {eventNotes.map((note) => (
                      <p key={note}>{note}</p>
                    ))}
                  </div>
                </details>
              )}
            </section>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020817] text-white">
      <section className="mx-auto max-w-3xl px-3 py-4 sm:px-5">
        <MvpNav
          activeOrganizationId={activeOrganizationId}
          organizationContext={organizationContext}
        />

        <div className="gd-card-dark rounded-lg p-3">
          <Link
            href={eventBackHref}
            className="text-base font-black"
          >
            &larr; {eventDetails.type}
          </Link>
          <p className="mt-2 text-sm font-semibold text-slate-200">
            {eventTeams.map((eventTeam) => eventTeam?.name).join(", ") ||
              "Organization Event"}
          </p>
          <p className="mt-2 text-xs font-black uppercase tracking-wide text-slate-400">
            {eventDetails.type}
          </p>
          <p className="mt-2 text-xs text-slate-300">
            {getEventDateLabel(eventDetails)}
          </p>
          <p className="mt-1 text-xs text-slate-300">
            {getEventTimeLabel(eventDetails)}
          </p>
          {getEventLocationLabel(eventDetails) && (
            <p className="mt-2 text-xs text-slate-300">
              {getEventLocationLabel(eventDetails)}
            </p>
          )}
          {eventDetails.address && (
            <p className="mt-1 text-xs text-slate-300">
              {eventDetails.address}
            </p>
          )}
          {eventDetails.directionsUrl && (
            <a
              href={eventDetails.directionsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 block w-full rounded-md bg-blue-600 py-2 text-center text-xs font-black text-white"
            >
              Directions
            </a>
          )}
        </div>

        {gameAlert && <GameAlertPanel gameAlert={gameAlert} role={role} />}

        <details className="gd-card-dark group mt-3 overflow-hidden rounded-lg">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3">
            <h2 className="text-base font-black">Status</h2>
            <span className="text-lg font-black text-blue-300 transition group-open:rotate-90">
              &rsaquo;
            </span>
          </summary>
          <p
            className={`border-t border-white/10 px-3 pt-3 text-xs font-semibold ${
              eventDetails.status === "canceled"
                ? "text-red-300"
                : eventDetails.status === "draft"
                  ? "text-yellow-200"
                  : eventDetails.status === "archived"
                    ? "text-slate-400"
                    : "text-green-300"
            }`}
          >
            {getEventStatusLabel(eventDetails)}
          </p>
          {eventUpdatesClosed && (
            <p className="px-3 pt-2 text-xs text-slate-300">
              Attendance and transportation updates are closed for this event.
              Existing responses remain available for history.
            </p>
          )}
          {eventDetails.updatedAt && (
            <>
              <p className="px-3 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Last Updated
              </p>
              <p className="px-3 pb-3 pt-1 text-xs text-slate-300">
                {eventDetails.updatedAt}
              </p>
            </>
          )}
        </details>

        <details className="gd-card-dark group mt-3 overflow-hidden rounded-lg">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3">
            <h2 className="text-base font-black">Announcements</h2>
            <span className="text-lg font-black text-blue-300 transition group-open:rotate-90">
              &rsaquo;
            </span>
          </summary>
          <ul className="space-y-2 border-t border-white/10 p-3 text-xs text-slate-300">
            {eventAnnouncements.length > 0 ? (
              eventAnnouncements.map((announcement) => (
                <li key={announcement}>{announcement}</li>
              ))
            ) : (
              <li>No announcements yet.</li>
            )}
          </ul>
        </details>

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

        <details className="gd-card-dark group mt-3 overflow-hidden rounded-lg">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3">
            <h2 className="text-base font-black">Event Notes</h2>
            <span className="text-lg font-black text-blue-300 transition group-open:rotate-90">
              &rsaquo;
            </span>
          </summary>
          <ul className="space-y-2 border-t border-white/10 p-3 text-xs text-slate-300">
            {eventNotes.length > 0 ? (
              eventNotes.map((note) => <li key={note}>{note}</li>)
            ) : (
              <li>No event notes yet.</li>
            )}
          </ul>
        </details>

        <details className="gd-card-dark group mt-3 overflow-hidden rounded-lg">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3">
            <h2 className="text-base font-black">Event Chat</h2>
            <span className="text-lg font-black text-blue-300 transition group-open:rotate-90">
              &rsaquo;
            </span>
          </summary>
          <div className="space-y-2 border-t border-white/10 p-3 text-xs text-slate-300">
            {eventChat.length > 0 ? (
              eventChat.map((chatItem) => <p key={chatItem}>{chatItem}</p>)
            ) : (
              <p>No event messages yet.</p>
            )}
          </div>
        </details>
      </section>
    </main>
  );
}
