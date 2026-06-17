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

function getEventStatusTone(status: GameDayEventStatus) {
  if (status === "canceled") {
    return "bg-red-50 text-red-700";
  }

  return "bg-blue-50 text-blue-700";
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
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-2xl font-black">{athleteName}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {[organizationName, teamName].filter(Boolean).join(" / ") ||
              "Team pending"}
          </p>
          {teamDetail && (
            <p className="mt-1 text-xs font-bold uppercase text-slate-400">
              {teamDetail}
            </p>
          )}
        </div>
        <span
          className={`w-fit rounded-full px-2.5 py-1 text-xs font-black ${
            nextAction.tone === "ready"
              ? "bg-emerald-50 text-emerald-700"
              : nextAction.tone === "blocked"
                ? "bg-red-50 text-red-700"
                : nextAction.tone === "attention"
                  ? "bg-orange-50 text-orange-700"
                  : "bg-slate-100 text-slate-600"
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
            className="mt-4 inline-flex rounded-md bg-blue-600 px-4 py-3 text-center text-sm font-black text-white hover:bg-blue-700"
          >
            {nextAction.label}
          </Link>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase text-slate-500">
            Registration
          </p>
          <p
            className={`mt-1 font-semibold ${getRegistrationTone(
              currentRegistrationStatus,
            )}`}
          >
            {getParentRegistrationStatusLabel(currentRegistrationStatus)}
          </p>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase text-slate-500">Roster</p>
          <p className={`mt-1 font-semibold ${getRosterTone(rosterStatus)}`}>
            {getParentRosterStatusLabel(rosterStatus)}
          </p>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase text-slate-500">
            Requirements
          </p>
          <p className={`mt-1 font-semibold ${requirementTone}`}>
            {requirementSummary.label}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {getParentRequirementCountLabel(requirementSummary)}
          </p>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase text-slate-500">Payment</p>
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

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-slate-500">
              Next event
            </p>
            {nextEvent ? (
              <>
                <p className="mt-2 font-black text-slate-950">
                  {nextEvent.title}
                </p>
                <p className="mt-2 text-sm text-slate-600">{nextEvent.date}</p>
                {nextEvent.time && (
                  <p className="mt-1 text-sm text-slate-600">
                    {nextEvent.time}
                  </p>
                )}
                {nextEvent.location && (
                  <p className="mt-2 text-sm text-slate-600">
                    {nextEvent.location}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-600">
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
              surface="light"
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
              surface="light"
            />
          </>
        )}

        {nextEvent && !eventUpdatesAllowed && (
          <p className="mt-4 rounded-md border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-600">
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
            className="block rounded-md bg-blue-600 py-3 text-center font-black text-white hover:bg-blue-700"
          >
            Event Details
          </Link>
        )}
        <Link
          href={`/athletes/${athleteId}`}
          className="block rounded-md border border-slate-200 bg-white py-3 text-center font-black text-slate-700 hover:bg-slate-50"
        >
          Athlete Details
        </Link>
        {nextEvent?.directionsUrl && (
          <a
            href={nextEvent.directionsUrl}
            target="_blank"
            rel="noreferrer"
            className="block rounded-md border border-slate-200 bg-white py-3 text-center font-black text-slate-700 hover:bg-slate-50 md:col-span-2"
          >
            Directions
          </a>
        )}
      </div>
    </article>
  );
}
