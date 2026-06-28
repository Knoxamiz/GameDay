import Link from "next/link";
import { notFound } from "next/navigation";
import AttendanceStatusPicker from "../../components/AttendanceStatusPicker";
import ParentRegistrationLifecyclePanel from "../../components/ParentRegistrationLifecyclePanel";
import RegistrationRequirementsChecklist from "../../components/RegistrationRequirementsChecklist";
import TransportationStatusPicker from "../../components/TransportationStatusPicker";
import type { AttendanceStatus } from "../../data/attendance";
import { getCurrentParentUser } from "../../data/currentUser.server";
import type { DocumentRequirement } from "../../data/documents";
import {
  eventHasTeamId,
  getEventDateLabel,
  getEventLocationLabel,
  getEventStatusLabel,
  getEventTimeLabel,
  type GameDayEvent,
  isEventVisibleToNonAdmin,
  isUpcomingEvent,
} from "../../data/events";
import { getEventScheduleReadModel } from "../../data/eventSchedule.server";
import {
  getAthleteRegistrationReadModel,
} from "../../data/parentAthleteRegistration.server";
import {
  getParentNextAction,
  getParentRegistrationStatusLabel,
  getParentRequirementCountLabel,
  getParentRequirementSummary,
  getParentRosterStatusLabel,
  type ParentNextActionTone,
} from "../../data/parentDashboard";
import {
  getRegistrationRosterStatus,
  hasPendingParentLifecycleRequest,
  isParentEventEligibleRegistration,
  isRegistrationTerminal,
  type RegistrationRequirement,
  type RegistrationStatus,
  type RosterStatus,
} from "../../data/registrations";
import {
  transportationOptions,
  type TransportationStatus,
} from "../../data/transportation";
import { createFirestoreRepositories } from "../../infrastructure/firebaseRepositories";

type AthleteDetailsPageProps = {
  params: Promise<{
    athleteId: string;
  }>;
};

export const dynamic = "force-dynamic";

function getDocumentRequirementsFromRegistration(
  registrationId: string,
  athleteId: string,
  organizationId: string,
  parentId: string,
  teamId: string,
  requirements: RegistrationRequirement[],
): DocumentRequirement[] {
  return requirements.map((requirement) => ({
    athleteId,
    description: requirement.description ?? "",
    id: `${registrationId}-${requirement.label.toLowerCase().replaceAll(" ", "-")}`,
    label: requirement.label,
    organizationId,
    parentId,
    registrationId,
    required: requirement.required ?? true,
    status: requirement.status,
    teamId,
  }));
}

function getActionToneClasses(tone: ParentNextActionTone) {
  if (tone === "ready") {
    return "border-emerald-300/30 bg-emerald-500/10 text-emerald-100";
  }

  if (tone === "blocked") {
    return "border-red-300/30 bg-red-500/10 text-red-100";
  }

  if (tone === "attention") {
    return "border-orange-300/30 bg-orange-500/10 text-orange-100";
  }

  return "border-white/10 bg-white/[0.04] text-slate-300";
}

function getRegistrationTone(status: RegistrationStatus) {
  if (status === "Approved") {
    return "text-emerald-200";
  }

  if (status === "Rejected" || status === "Withdrawn" || status === "Inactive") {
    return "text-red-200";
  }

  return "text-orange-200";
}

function getRosterTone(status: RosterStatus) {
  if (status === "rostered") {
    return "text-emerald-200";
  }

  if (status === "inactive") {
    return "text-red-200";
  }

  return "text-orange-200";
}

function getRequirementTone(open: number, blocked: number, needsReview: number) {
  if (blocked > 0) {
    return "text-red-200";
  }

  if (open > 0 || needsReview > 0) {
    return "text-orange-200";
  }

  return "text-emerald-200";
}

function getEventTone(status: string) {
  if (status === "canceled") {
    return "border border-red-300/30 bg-red-500/10 text-red-100";
  }

  return "border border-blue-300/20 bg-blue-500/10 text-blue-100";
}

function getEventUnavailableMessage(
  registrationStatus: RegistrationStatus,
  rosterStatus: RosterStatus,
) {
  if (isRegistrationTerminal(registrationStatus)) {
    return `This registration is ${registrationStatus.toLowerCase()} and event actions are closed.`;
  }

  if (registrationStatus === "Waitlisted") {
    return "This athlete is waitlisted. Events will appear after the organization activates the registration.";
  }

  if (rosterStatus === "inactive") {
    return "This athlete is inactive on the roster, so event actions are closed.";
  }

  return "No upcoming scoped events are scheduled for this athlete.";
}

function isTodayEvent(event: GameDayEvent | undefined, now: Date) {
  if (!event) {
    return false;
  }

  const startsAt = event.startsAt || event.startDateTime || event.date || "";
  const eventDate = new Date(startsAt);

  if (Number.isNaN(eventDate.getTime())) {
    return false;
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/New_York",
    year: "numeric",
  });

  return formatter.format(eventDate) === formatter.format(now);
}

function getPlayerSignalClasses(tone: "gray" | "green" | "red" | "yellow") {
  if (tone === "green") {
    return "border-emerald-300/40 bg-emerald-400/15 text-emerald-100 shadow-[0_0_22px_rgba(16,185,129,0.22)]";
  }

  if (tone === "red") {
    return "border-red-300/35 bg-red-500/15 text-red-100";
  }

  if (tone === "yellow") {
    return "border-orange-300/35 bg-orange-500/15 text-orange-100";
  }

  return "border-white/10 bg-white/[0.055] text-slate-300";
}

export default async function AthleteDetailsPage({
  params,
}: AthleteDetailsPageProps) {
  const { athleteId } = await params;
  const currentUser = await getCurrentParentUser();

  if (currentUser.source !== "firebase-session") {
    notFound();
  }

  const readModel = await getAthleteRegistrationReadModel(athleteId, {
    parentId: currentUser.parentId,
    parentUid: currentUser.parentUid,
  });

  if (!readModel) {
    notFound();
  }

  const { athlete, parent, registration } = readModel;
  const registrationRequirements = Array.isArray(registration?.requirements)
    ? registration.requirements
    : [];
  const paymentRequirements = registration?.paymentRequirements ?? [];
  const registrationId = registration?.id ?? athlete.registrationId;
  const organizationId = registration?.organizationId ?? athlete.organizationId ?? "";
  const registrationStatus = registration?.status ?? "Pending";
  const rosterStatus = getRegistrationRosterStatus(registration);
  const hasRegistration = Boolean(registration);
  const documentRequirements = getDocumentRequirementsFromRegistration(
    registrationId,
    athlete.id,
    organizationId,
    currentUser.parentId,
    athlete.teamId,
    registrationRequirements,
  );
  const repositories = createFirestoreRepositories();
  const [
    schedule,
    team,
    organization,
    attendanceEntries,
    transportationEntries,
  ] = await Promise.all([
    getEventScheduleReadModel("parent"),
    athlete.teamId ? repositories.teams.getById(athlete.teamId) : null,
    organizationId ? repositories.organizations.getById(organizationId) : null,
    repositories.attendance.listByAthleteId(athlete.id),
    repositories.transportation.listByAthleteId(athlete.id),
  ]);
  const now = new Date();
  const upcomingScopedEvents = schedule.events.filter(
    (event) => isEventVisibleToNonAdmin(event) && isUpcomingEvent(event, now),
  );
  const canShowEvents = registration
    ? isParentEventEligibleRegistration(registration)
    : false;
  const nextEvent = canShowEvents
    ? upcomingScopedEvents.find((event) => eventHasTeamId(event, athlete.teamId))
    : undefined;
  const attendanceStatus: AttendanceStatus =
    attendanceEntries.find(
      (entry) =>
        entry.athleteId === athlete.id && entry.eventId === nextEvent?.id,
    )?.status ?? "Unknown";
  const transportationStatus: TransportationStatus =
    transportationEntries.find(
      (entry) =>
        entry.athleteId === athlete.id && entry.eventId === nextEvent?.id,
    )?.status ?? "Unknown";
  const athleteHref = `/athletes/${athlete.id}`;
  const nextAction = getParentNextAction({
    attendanceStatus,
    athleteHref,
    eventHref: nextEvent ? `/events/${nextEvent.id}` : undefined,
    hasPendingLifecycleRequest: registration
      ? hasPendingParentLifecycleRequest(registration)
      : false,
    hasRegistration,
    nextEvent: nextEvent ? { status: nextEvent.status } : undefined,
    paymentRequirements,
    registrationStatus,
    requirements: registrationRequirements,
    rosterStatus,
    transportationStatus,
  });
  const requirementSummary = getParentRequirementSummary(
    registrationRequirements,
    paymentRequirements,
    registrationStatus,
    rosterStatus,
    Boolean(nextEvent),
  );
  const requirementTone = getRequirementTone(
    requirementSummary.open,
    requirementSummary.documentsBlocked + requirementSummary.paymentsBlocked,
    requirementSummary.documentsNeedsReview +
      requirementSummary.paymentsNeedsReview,
  );
  const eventUpdatesAllowed = Boolean(
    nextEvent &&
      nextEvent.status === "published" &&
      registrationStatus === "Approved" &&
      rosterStatus === "rostered",
  );
  const teamName = team?.name ?? team?.label ?? "Team unavailable";
  const teamDetail = [team?.division, team?.season].filter(Boolean).join(" - ");
  const organizationName = organization?.name ?? "Organization unavailable";
  const needsBlocked =
    requirementSummary.documentsBlocked + requirementSummary.paymentsBlocked;
  const needsReview =
    requirementSummary.documentsNeedsReview + requirementSummary.paymentsNeedsReview;
  const hasPlayerNeeds =
    requirementSummary.open > 0 || needsBlocked > 0 || needsReview > 0;
  const nextEventLabel = nextEvent
    ? `${getEventDateLabel(nextEvent)} - ${getEventTimeLabel(nextEvent)}`
    : getEventUnavailableMessage(registrationStatus, rosterStatus);
  const hasFixablePlayerNeeds = needsBlocked > 0 || requirementSummary.open > 0;
  const hasAccountAlert =
    hasFixablePlayerNeeds ||
    nextAction.tone === "blocked" ||
    (nextAction.tone === "attention" && nextAction.href === athleteHref);
  const eventIsToday = isTodayEvent(nextEvent, now);
  const playerSignalTone = hasAccountAlert
    ? "red"
    : eventIsToday
      ? "green"
      : nextEvent
        ? "yellow"
        : "gray";
  const playerSignalLabel = hasAccountAlert
    ? "Account alert"
    : eventIsToday
      ? "Today"
      : nextEvent
        ? "Upcoming"
        : "No schedule";

  return (
    <main className="gd-dark-scope min-h-screen text-white">
      <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-3 py-2.5 sm:px-5">
          <Link className="text-lg font-black text-white" href="/parent">
            GameDay
          </Link>
          <Link
            className="rounded-md border border-blue-300/25 bg-blue-500/10 px-2.5 py-1.5 text-xs font-black text-blue-100 hover:bg-blue-500/20"
            href="/parent"
          >
            Parent Home
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-3 py-3 pb-20 sm:px-5">
        <Link
          href="/parent"
          className="inline-flex rounded-md border border-blue-300/25 bg-blue-500/10 px-2.5 py-1.5 text-xs font-black text-blue-100 shadow-sm hover:bg-blue-500/20"
        >
          &larr; Parent Home
        </Link>

        <div className="gd-card-dark mt-3 rounded-lg p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-300">
                Player
              </p>
              <h1 className="mt-0.5 truncate text-xl font-black tracking-tight">
                {athlete.name}
              </h1>
              <p className="mt-1 truncate text-xs font-semibold text-slate-400">
                {organizationName} / {teamName}
              </p>
              {teamDetail && (
                <p className="mt-1 truncate text-[11px] font-black uppercase text-slate-500">
                  {teamDetail}
                </p>
              )}
            </div>
            <span
              className={`shrink-0 rounded-md border px-2.5 py-1 text-[11px] font-black ${getPlayerSignalClasses(
                playerSignalTone,
              )}`}
            >
              {playerSignalLabel}
            </span>
          </div>

          <div
            className={`mt-3 rounded-md border px-3 py-2 ${getActionToneClasses(
              nextAction.tone,
            )}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wide opacity-70">
                  Next step
                </p>
                <p className="mt-0.5 truncate text-sm font-black">
                  {nextAction.label}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs font-semibold opacity-80">
                  {nextAction.description}
                </p>
              </div>
              {nextAction.href && nextAction.href !== athleteHref && (
                <Link
                  href={nextAction.href}
                  className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-700"
                >
                  Open
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between gap-3 px-1">
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-blue-200">
              Open what you need
            </h2>
            <span className="truncate text-[11px] font-black text-slate-400">
              {getParentRegistrationStatusLabel(registrationStatus)} /{" "}
              {getParentRosterStatusLabel(rosterStatus)}
            </span>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px] sm:grid-cols-3">
            <div className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2">
              <p className="font-semibold text-slate-400">Registration</p>
              <p
                className={`mt-0.5 truncate font-black ${getRegistrationTone(
                  registrationStatus,
                )}`}
              >
                {getParentRegistrationStatusLabel(registrationStatus)}
              </p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2">
              <p className="font-semibold text-slate-400">Roster</p>
              <p className={`mt-0.5 truncate font-black ${getRosterTone(rosterStatus)}`}>
                {getParentRosterStatusLabel(rosterStatus)}
              </p>
            </div>
            <div className="col-span-2 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2 sm:col-span-1">
              <p className="font-semibold text-slate-400">Needs</p>
              <p className={`mt-0.5 truncate font-black ${requirementTone}`}>
                {getParentRequirementCountLabel(requirementSummary)}
              </p>
            </div>
          </div>

          <div className="mt-2 space-y-1.5">
            <details
              className={`group overflow-hidden rounded-lg border bg-white/[0.04] ${
                eventIsToday
                  ? "border-emerald-300/35 shadow-[0_0_26px_rgba(16,185,129,0.14)]"
                  : "border-white/10"
              }`}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-2.5 [&::-webkit-details-marker]:hidden">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                      playerSignalTone === "green"
                        ? "bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.72)]"
                        : playerSignalTone === "red"
                          ? "bg-red-400"
                          : playerSignalTone === "yellow"
                            ? "bg-orange-400"
                            : "bg-slate-500"
                    }`}
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-black text-white">
                      {eventUpdatesAllowed ? "Attendance & ride" : "Next event"}
                    </span>
                    <span className="mt-0.5 block truncate text-xs font-semibold text-slate-400">
                      {nextEventLabel}
                    </span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${getPlayerSignalClasses(
                      playerSignalTone,
                    )}`}
                  >
                    {playerSignalLabel}
                  </span>
                  <span className="text-lg font-black text-blue-200 transition group-open:rotate-90">
                    &rsaquo;
                  </span>
                </span>
              </summary>
              <div className="border-t border-white/10 p-2.5">
                {nextEvent ? (
                  <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-black text-white">
                          {nextEvent.title}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-400">
                          {nextEventLabel}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-400">
                          {getEventLocationLabel(nextEvent)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${getEventTone(
                          nextEvent.status,
                        )}`}
                      >
                        {getEventStatusLabel(nextEvent)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="rounded-md border border-white/10 bg-white/[0.04] p-3 text-xs font-semibold text-slate-400">
                    {nextEventLabel}
                  </p>
                )}

                {nextEvent && eventUpdatesAllowed && (
                  <>
                    <AttendanceStatusPicker
                      athleteId={athlete.id}
                      eventId={nextEvent.id}
                      initialStatus={attendanceStatus}
                      compact
                      surface="dark"
                    />
                    <TransportationStatusPicker
                      athleteId={athlete.id}
                      documentRequirements={documentRequirements}
                      eventId={nextEvent.id}
                      initialStatus={transportationStatus}
                      options={transportationOptions}
                      paymentRequirements={paymentRequirements}
                      registrationId={registrationId}
                      registrationRequirements={registrationRequirements}
                      surface="dark"
                    />
                  </>
                )}

                {nextEvent && !eventUpdatesAllowed && (
                  <p className="mt-3 rounded-md border border-white/10 bg-white/[0.04] p-2.5 text-xs font-semibold text-slate-400">
                    {nextEvent.status === "canceled"
                      ? "Attendance and transportation updates are closed for this canceled event."
                      : "Attendance and transportation controls open after this player is approved and rostered."}
                  </p>
                )}

                {nextEvent && (
                  <Link
                    href={`/events/${nextEvent.id}`}
                    className="mt-2 block rounded-md border border-blue-300/20 bg-blue-500/10 py-2 text-center text-xs font-black text-blue-100 hover:bg-blue-500/20"
                  >
                    Event details
                  </Link>
                )}
              </div>
            </details>

            {hasPlayerNeeds && (
              <RegistrationRequirementsChecklist
                athleteId={athlete.id}
                documentRequirements={documentRequirements}
                organizationId={organizationId}
                parentId={currentUser.parentId}
                paymentRequirements={paymentRequirements}
                registrationId={registrationId}
                requirements={registrationRequirements}
                surface="inline"
                updatesAllowed={
                  registration
                    ? !isRegistrationTerminal(registration.status)
                    : false
                }
              />
            )}

            {registration && (
              <ParentRegistrationLifecyclePanel
                athlete={athlete}
                parent={parent}
                registration={registration}
                surface="inline"
              />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
