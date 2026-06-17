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
  summarizePaymentRequirements,
  type PaymentRequirement,
} from "../../data/payments";
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
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (tone === "blocked") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (tone === "attention") {
    return "border-orange-200 bg-orange-50 text-orange-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function getRegistrationTone(status: RegistrationStatus) {
  if (status === "Approved") {
    return "text-emerald-700";
  }

  if (status === "Rejected" || status === "Withdrawn" || status === "Inactive") {
    return "text-red-700";
  }

  return "text-orange-700";
}

function getRosterTone(status: RosterStatus) {
  if (status === "rostered") {
    return "text-emerald-700";
  }

  if (status === "inactive") {
    return "text-red-700";
  }

  return "text-orange-700";
}

function getRequirementTone(open: number, blocked: number, needsReview: number) {
  if (blocked > 0) {
    return "text-red-700";
  }

  if (open > 0 || needsReview > 0) {
    return "text-orange-700";
  }

  return "text-emerald-700";
}

function getPaymentLabel(paymentRequirements: PaymentRequirement[]) {
  const summary = summarizePaymentRequirements(paymentRequirements);

  if (paymentRequirements.length === 0) {
    return "No payment due";
  }

  if (summary.blocked > 0) {
    return "Needs fix";
  }

  if (summary.missing > 0) {
    return "Payment pending";
  }

  if (summary.needsReview > 0) {
    return "Waiting review";
  }

  return "Ready";
}

function getEventTone(status: string) {
  if (status === "canceled") {
    return "bg-red-50 text-red-700";
  }

  return "bg-blue-50 text-blue-700";
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
  const paymentSummary = summarizePaymentRequirements(paymentRequirements);
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

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <Link className="text-xl font-black" href="/parent">
            GameDay
          </Link>
          <Link
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
            href="/parent"
          >
            Parent Home
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <Link
          href="/parent"
          className="inline-flex rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50"
        >
          &larr; Parent Home
        </Link>

        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-black uppercase text-blue-700">
            Player Home
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            {athlete.name}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold text-slate-600">
            <span>{organizationName}</span>
            <span aria-hidden="true">/</span>
            <span>{teamName}</span>
          </div>
          {teamDetail && (
            <p className="mt-2 text-xs font-black uppercase text-slate-500">
              {teamDetail}
            </p>
          )}
        </div>

        <div
          className={`mt-4 rounded-lg border p-5 shadow-sm ${getActionToneClasses(
            nextAction.tone,
          )}`}
        >
          <p className="text-xs font-black uppercase">What needs attention</p>
          <p className="mt-2 text-xl font-black">{nextAction.label}</p>
          <p className="mt-2 text-sm font-semibold">{nextAction.description}</p>
          {nextAction.href && nextAction.href !== athleteHref && (
            <Link
              href={nextAction.href}
              className="mt-4 block rounded-md bg-blue-600 py-3 text-center text-sm font-black text-white hover:bg-blue-700"
            >
              {nextAction.label}
            </Link>
          )}
          {nextAction.href === athleteHref && (
            <p className="mt-4 rounded-md border border-current/20 bg-white/60 p-3 text-sm font-semibold">
              Use the sections below to complete this step.
            </p>
          )}
        </div>

        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <p className="font-semibold text-slate-500">Registration</p>
            <p
              className={`mt-1 font-black ${getRegistrationTone(
                registrationStatus,
              )}`}
            >
              {getParentRegistrationStatusLabel(registrationStatus)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <p className="font-semibold text-slate-500">Roster</p>
            <p className={`mt-1 font-black ${getRosterTone(rosterStatus)}`}>
              {getParentRosterStatusLabel(rosterStatus)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <p className="font-semibold text-slate-500">Readiness</p>
            <p className={`mt-1 font-black ${requirementTone}`}>
              {requirementSummary.label}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {getParentRequirementCountLabel(requirementSummary)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <p className="font-semibold text-slate-500">Payment</p>
            <p
              className={`mt-1 font-black ${getRequirementTone(
                paymentSummary.open,
                paymentSummary.blocked,
                paymentSummary.needsReview,
              )}`}
            >
              {getPaymentLabel(paymentRequirements)}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black">Next Event</h2>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  Only events for this player&apos;s team are shown here.
                </p>
              </div>
              {nextEvent && (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getEventTone(
                    nextEvent.status,
                  )}`}
                >
                  {getEventStatusLabel(nextEvent)}
                </span>
              )}
            </div>

            {nextEvent ? (
              <div className="mt-4 rounded-md bg-slate-50 p-4">
                <p className="font-black text-slate-950">{nextEvent.title}</p>
                <p className="mt-3 text-sm font-semibold text-slate-600">
                  {getEventDateLabel(nextEvent)}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  {getEventTimeLabel(nextEvent)}
                </p>
                <p className="mt-3 text-sm font-semibold text-slate-600">
                  {getEventLocationLabel(nextEvent)}
                </p>
              </div>
            ) : (
              <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
                {getEventUnavailableMessage(registrationStatus, rosterStatus)}
              </p>
            )}

            {nextEvent && eventUpdatesAllowed && (
              <>
                <AttendanceStatusPicker
                  athleteId={athlete.id}
                  eventId={nextEvent.id}
                  initialStatus={attendanceStatus}
                  compact
                  surface="light"
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
                  surface="light"
                />
              </>
            )}

            {nextEvent && !eventUpdatesAllowed && (
              <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-600">
                {nextEvent.status === "canceled"
                  ? "Attendance and transportation updates are closed for this canceled event."
                  : "Attendance and transportation controls are available after this player is approved and rostered."}
              </p>
            )}

            {nextEvent && (
              <Link
                href={`/events/${nextEvent.id}`}
                className="mt-4 block rounded-md bg-blue-600 py-3 text-center font-black text-white hover:bg-blue-700"
              >
                Event Details
              </Link>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black">Player Info</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md bg-slate-50 p-3">
                <p className="font-semibold text-slate-500">Grade</p>
                <p className="mt-1 font-black text-slate-950">
                  {athlete.grade || "Not listed"}
                </p>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <p className="font-semibold text-slate-500">Jersey</p>
                <p className="mt-1 font-black text-slate-950">
                  {athlete.jerseySize || "Not listed"}
                </p>
              </div>
            </div>
            <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm font-semibold text-slate-600">
              {athlete.school || "School not listed"}
            </p>
          </div>
        </div>

        <RegistrationRequirementsChecklist
          athleteId={athlete.id}
          documentRequirements={documentRequirements}
          organizationId={organizationId}
          parentId={currentUser.parentId}
          paymentRequirements={paymentRequirements}
          registrationId={registrationId}
          requirements={registrationRequirements}
          updatesAllowed={
            registration ? !isRegistrationTerminal(registration.status) : false
          }
        />

        {registration && (
          <ParentRegistrationLifecyclePanel
            athlete={athlete}
            parent={parent}
            registration={registration}
          />
        )}
      </section>
    </main>
  );
}
