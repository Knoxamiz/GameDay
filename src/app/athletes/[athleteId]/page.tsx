import Link from "next/link";
import { notFound } from "next/navigation";
import AttendanceStatusPicker from "../../components/AttendanceStatusPicker";
import MvpNav from "../../components/MvpNav";
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
import { getOrganizationContext } from "../../data/organizationContext.server";
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
    return "border-blue-500/40 bg-blue-500/10 text-blue-100";
  }

  if (tone === "blocked") {
    return "border-red-500/40 bg-red-500/10 text-red-100";
  }

  if (tone === "attention") {
    return "border-yellow-500/40 bg-yellow-500/10 text-yellow-100";
  }

  return "border-slate-700 bg-slate-950 text-slate-200";
}

function getRegistrationTone(status: RegistrationStatus) {
  if (status === "Approved") {
    return "text-blue-300";
  }

  if (status === "Rejected" || status === "Withdrawn" || status === "Inactive") {
    return "text-red-300";
  }

  return "text-yellow-200";
}

function getRosterTone(status: RosterStatus) {
  if (status === "rostered") {
    return "text-blue-300";
  }

  if (status === "inactive") {
    return "text-red-300";
  }

  return "text-yellow-200";
}

function getRequirementTone(open: number, blocked: number, needsReview: number) {
  if (blocked > 0) {
    return "text-red-300";
  }

  if (open > 0 || needsReview > 0) {
    return "text-yellow-200";
  }

  return "text-blue-300";
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
    return "bg-red-500/20 text-red-300";
  }

  return "bg-blue-500/20 text-blue-300";
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
    organizationContext,
    schedule,
    team,
    organization,
    attendanceEntries,
    transportationEntries,
  ] = await Promise.all([
    getOrganizationContext(organizationId ? [organizationId] : []),
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
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav organizationContext={organizationContext} />

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <Link href="/parent" className="text-sm font-semibold text-slate-300">
            &larr; Back to Parent
          </Link>
          <h1 className="mt-3 text-3xl font-bold">{athlete.name}</h1>
          <p className="mt-2 text-sm text-slate-300">{organizationName}</p>
          <p className="mt-1 text-sm text-slate-300">{teamName}</p>
          {teamDetail && (
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {teamDetail}
            </p>
          )}
        </div>

        <div
          className={`mt-4 rounded-2xl border p-5 ${getActionToneClasses(
            nextAction.tone,
          )}`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
            Next action
          </p>
          <p className="mt-2 text-xl font-bold">{nextAction.label}</p>
          <p className="mt-2 text-sm opacity-90">{nextAction.description}</p>
          {nextAction.href && nextAction.href !== athleteHref && (
            <Link
              href={nextAction.href}
              className="mt-4 block rounded-xl bg-blue-500 py-3 text-center text-sm font-semibold text-white"
            >
              {nextAction.label}
            </Link>
          )}
          {nextAction.href === athleteHref && (
            <p className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-300">
              Use the registration sections below to complete this step.
            </p>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-slate-900 p-3">
            <p className="text-slate-400">Registration</p>
            <p
              className={`mt-1 font-semibold ${getRegistrationTone(
                registrationStatus,
              )}`}
            >
              {getParentRegistrationStatusLabel(registrationStatus)}
            </p>
          </div>
          <div className="rounded-xl bg-slate-900 p-3">
            <p className="text-slate-400">Roster</p>
            <p className={`mt-1 font-semibold ${getRosterTone(rosterStatus)}`}>
              {getParentRosterStatusLabel(rosterStatus)}
            </p>
          </div>
          <div className="rounded-xl bg-slate-900 p-3">
            <p className="text-slate-400">Readiness</p>
            <p className={`mt-1 font-semibold ${requirementTone}`}>
              {requirementSummary.label}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {getParentRequirementCountLabel(requirementSummary)}
            </p>
          </div>
          <div className="rounded-xl bg-slate-900 p-3">
            <p className="text-slate-400">Payment</p>
            <p
              className={`mt-1 font-semibold ${getRequirementTone(
                paymentSummary.open,
                paymentSummary.blocked,
                paymentSummary.needsReview,
              )}`}
            >
              {getPaymentLabel(paymentRequirements)}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Athlete Info</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-slate-800 p-3">
              <p className="text-slate-400">Grade</p>
              <p className="mt-1 font-semibold text-white">
                {athlete.grade || "Not listed"}
              </p>
            </div>
            <div className="rounded-xl bg-slate-800 p-3">
              <p className="text-slate-400">Jersey</p>
              <p className="mt-1 font-semibold text-white">
                {athlete.jerseySize || "Not listed"}
              </p>
            </div>
          </div>
          <p className="mt-3 rounded-xl bg-slate-800 p-3 text-sm text-slate-300">
            {athlete.school || "School not listed"}
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Next Event</h2>
              <p className="mt-1 text-sm text-slate-400">
                Scoped to this athlete&apos;s registration and team.
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
          ) : (
            <p className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm text-slate-300">
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
              />
            </>
          )}

          {nextEvent && !eventUpdatesAllowed && (
            <p className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-300">
              {nextEvent.status === "canceled"
                ? "Attendance and transportation updates are closed for this canceled event."
                : "Attendance and transportation controls are available after this athlete is approved and rostered."}
            </p>
          )}

          {nextEvent && (
            <Link
              href={`/events/${nextEvent.id}`}
              className="mt-4 block rounded-xl bg-blue-500 py-3 text-center font-semibold text-white"
            >
              Event Details
            </Link>
          )}
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
