"use client";

import Link from "next/link";
import type { AttendanceStatus } from "../data/attendance";
import type { DocumentRequirement } from "../data/documents";
import type { GameDayEventStatus } from "../data/events";
import {
  summarizePaymentRequirements,
  type PaymentRequirement,
} from "../data/payments";
import {
  getParentNextAction,
  getParentRegistrationStatusLabel,
  getParentRequirementCountLabel,
  getParentRequirementSummary,
  getParentRosterStatusLabel,
  type ParentNextActionTone,
} from "../data/parentDashboard";
import type {
  RegistrationRequirement,
  RegistrationStatus,
  RosterStatus,
} from "../data/registrations";
import {
  transportationOptions,
  type TransportationStatus,
} from "../data/transportation";
import AttendanceStatusPicker from "./AttendanceStatusPicker";
import { useAttendanceStatus } from "./attendanceStatusState";
import { useDocumentRequirements } from "./documentRequirementState";
import { usePaymentRequirements } from "./paymentRequirementState";
import { useRegistrationRequirements } from "./registrationRequirementState";
import { useRegistrationStatus } from "./registrationStatusState";
import { useTransportationStatus } from "./transportationStatusState";
import TransportationStatusPicker from "./TransportationStatusPicker";

type ParentAthleteCardProps = {
  athleteId: string;
  athleteName: string;
  hasPendingLifecycleRequest: boolean;
  hasRegistration: boolean;
  nextEvent?: {
    date: string;
    directionsUrl: string;
    id: string;
    location: string;
    status: GameDayEventStatus;
    time: string;
    title: string;
  };
  organizationName?: string;
  initialAttendanceStatus: AttendanceStatus;
  initialTransportationStatus: TransportationStatus;
  paymentRequirements?: PaymentRequirement[];
  registrationId: string;
  registrationRequirements: RegistrationRequirement[];
  registrationStatus: RegistrationStatus;
  rosterStatus: RosterStatus;
  teamDetail?: string;
  teamName?: string;
};

function getDocumentRequirementsFromRegistration(
  registrationId: string,
  athleteId: string,
  requirements: RegistrationRequirement[],
): DocumentRequirement[] {
  return requirements.map((requirement) => ({
    athleteId,
    description: requirement.description ?? "",
    id: `${registrationId}-${requirement.label.toLowerCase().replaceAll(" ", "-")}`,
    label: requirement.label,
    organizationId: "",
    parentId: "",
    registrationId,
    required: requirement.required ?? true,
    status: requirement.status,
    teamId: "",
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

function getEventStatusTone(status: GameDayEventStatus) {
  if (status === "canceled") {
    return "bg-red-500/20 text-red-300";
  }

  return "bg-blue-500/20 text-blue-300";
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

export default function ParentAthleteCard({
  athleteId,
  athleteName,
  hasPendingLifecycleRequest,
  hasRegistration,
  nextEvent,
  organizationName,
  initialAttendanceStatus,
  initialTransportationStatus,
  paymentRequirements: initialPaymentRequirements = [],
  registrationId,
  registrationRequirements,
  registrationStatus,
  rosterStatus,
  teamDetail,
  teamName,
}: ParentAthleteCardProps) {
  const nextEventId = nextEvent?.id;
  const attendanceStatus = useAttendanceStatus(
    athleteId,
    nextEventId ?? "",
    initialAttendanceStatus,
  );
  const transportationStatus = useTransportationStatus(
    athleteId,
    nextEventId ?? "",
    initialTransportationStatus,
  );
  const requirements = useRegistrationRequirements(
    registrationId,
    registrationRequirements,
  );
  const currentRegistrationStatus = useRegistrationStatus(
    registrationId,
    registrationStatus,
  );
  const documentRequirements = useDocumentRequirements(
    getDocumentRequirementsFromRegistration(
      registrationId,
      athleteId,
      registrationRequirements,
    ),
  );
  const paymentRequirements = usePaymentRequirements(
    initialPaymentRequirements,
  );
  const requirementSummary = getParentRequirementSummary(
    requirements,
    paymentRequirements,
    currentRegistrationStatus,
    rosterStatus,
    Boolean(nextEvent),
  );
  const nextAction = getParentNextAction({
    attendanceStatus,
    athleteHref: `/athletes/${athleteId}`,
    eventHref: nextEvent ? `/events/${nextEvent.id}` : undefined,
    hasPendingLifecycleRequest,
    hasRegistration,
    nextEvent: nextEvent ? { status: nextEvent.status } : undefined,
    paymentRequirements,
    registrationStatus: currentRegistrationStatus,
    requirements,
    rosterStatus,
    transportationStatus,
  });
  const eventUpdatesAllowed = Boolean(
    nextEvent &&
      nextEvent.status === "published" &&
      currentRegistrationStatus === "Approved" &&
      rosterStatus === "rostered",
  );
  const requirementTone = getRequirementTone(
    requirementSummary.open,
    requirementSummary.documentsBlocked + requirementSummary.paymentsBlocked,
    requirementSummary.documentsNeedsReview +
      requirementSummary.paymentsNeedsReview,
  );
  const paymentSummary = summarizePaymentRequirements(paymentRequirements);

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold">{athleteName}</h3>
          <p className="mt-1 text-sm text-slate-400">
            {[organizationName, teamName].filter(Boolean).join(" - ") ||
              "Team pending"}
          </p>
          {teamDetail && (
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {teamDetail}
            </p>
          )}
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            nextAction.tone === "ready"
              ? "bg-blue-500/20 text-blue-300"
              : nextAction.tone === "blocked"
                ? "bg-red-500/20 text-red-300"
                : nextAction.tone === "attention"
                  ? "bg-yellow-500/20 text-yellow-200"
                  : "bg-slate-800 text-slate-300"
          }`}
        >
          {nextAction.label}
        </span>
      </div>

      <div
        className={`mt-4 rounded-xl border p-4 ${getActionToneClasses(
          nextAction.tone,
        )}`}
      >
        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
          Next action
        </p>
        <p className="mt-2 text-lg font-bold">{nextAction.label}</p>
        <p className="mt-2 text-sm opacity-90">{nextAction.description}</p>
        {nextAction.href && (
          <Link
            href={nextAction.href}
            className="mt-4 block rounded-xl bg-blue-500 py-3 text-center text-sm font-semibold text-white"
          >
            {nextAction.label}
          </Link>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-slate-800 p-3">
          <p className="text-slate-400">Registration</p>
          <p
            className={`mt-1 font-semibold ${getRegistrationTone(
              currentRegistrationStatus,
            )}`}
          >
            {getParentRegistrationStatusLabel(currentRegistrationStatus)}
          </p>
        </div>
        <div className="rounded-xl bg-slate-800 p-3">
          <p className="text-slate-400">Roster</p>
          <p className={`mt-1 font-semibold ${getRosterTone(rosterStatus)}`}>
            {getParentRosterStatusLabel(rosterStatus)}
          </p>
        </div>
        <div className="rounded-xl bg-slate-800 p-3">
          <p className="text-slate-400">Requirements</p>
          <p className={`mt-1 font-semibold ${requirementTone}`}>
            {requirementSummary.label}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {getParentRequirementCountLabel(requirementSummary)}
          </p>
        </div>
        <div className="rounded-xl bg-slate-800 p-3">
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

      <div className="mt-4 rounded-xl bg-slate-800 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Next event
            </p>
            {nextEvent ? (
              <>
                <p className="mt-2 font-semibold">{nextEvent.title}</p>
                <p className="mt-2 text-sm text-slate-300">{nextEvent.date}</p>
                {nextEvent.time && (
                  <p className="mt-1 text-sm text-slate-300">{nextEvent.time}</p>
                )}
                {nextEvent.location && (
                  <p className="mt-2 text-sm text-slate-300">
                    {nextEvent.location}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-300">
                No upcoming event is scheduled for this athlete.
              </p>
            )}
          </div>
          {nextEvent && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${getEventStatusTone(
                nextEvent.status,
              )}`}
            >
              {nextEvent.status === "canceled" ? "Canceled" : "Published"}
            </span>
          )}
        </div>

        {nextEvent && eventUpdatesAllowed && (
          <>
            <AttendanceStatusPicker
              athleteId={athleteId}
              eventId={nextEvent.id}
              initialStatus={initialAttendanceStatus}
              compact
            />
            <TransportationStatusPicker
              athleteId={athleteId}
              documentRequirements={documentRequirements}
              eventId={nextEvent.id}
              initialStatus={initialTransportationStatus}
              options={transportationOptions}
              paymentRequirements={paymentRequirements}
              registrationId={registrationId}
              registrationRequirements={requirements}
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
      </div>

      <div
        className={`mt-4 grid gap-3 ${
          nextEvent ? "grid-cols-2" : "grid-cols-1"
        }`}
      >
        {nextEvent && (
          <Link
            href={`/events/${nextEvent.id}`}
            className="block rounded-xl bg-blue-500 py-3 text-center font-semibold text-white"
          >
            Event Details
          </Link>
        )}
        <Link
          href={`/athletes/${athleteId}`}
          className="block rounded-xl border border-slate-700 bg-slate-900 py-3 text-center font-semibold text-white"
        >
          Athlete Details
        </Link>
        {nextEvent?.directionsUrl && (
          <a
            href={nextEvent.directionsUrl}
            target="_blank"
            rel="noreferrer"
            className="block rounded-xl border border-slate-700 bg-slate-900 py-3 text-center font-semibold text-white md:col-span-2"
          >
            Directions
          </a>
        )}
      </div>
    </article>
  );
}
