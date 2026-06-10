"use client";

import Link from "next/link";
import type { AttendanceStatus } from "../data/attendance";
import { summarizeDocumentRequirements, type DocumentRequirement } from "../data/documents";
import {
  summarizePaymentRequirements,
  type PaymentRequirement,
} from "../data/payments";
import type {
  RegistrationRequirement,
  RegistrationStatus,
} from "../data/registrations";
import { summarizeRegistrationRequirements } from "../data/registrations";
import { buildAthleteReadiness } from "../data/readiness";
import { buildReadinessActions } from "../data/readinessActions";
import type { TransportationStatus } from "../data/transportation";
import AttendanceStatusPicker from "./AttendanceStatusPicker";
import ReadinessActionList from "./ReadinessActionList";
import ReadinessBadge from "./ReadinessBadge";
import { useAttendanceStatus } from "./attendanceStatusState";
import { useDocumentRequirements } from "./documentRequirementState";
import { usePaymentRequirements } from "./paymentRequirementState";
import { useRegistrationRequirements } from "./registrationRequirementState";
import { useRegistrationStatus } from "./registrationStatusState";
import { useTransportationStatus } from "./transportationStatusState";

type ParentAthleteCardProps = {
  athleteId: string;
  athleteName: string;
  teamName?: string;
  nextEvent?: {
    id: string;
    title: string;
    date: string;
    time: string;
    location: string;
    directionsUrl: string;
  };
  initialAttendanceStatus: AttendanceStatus;
  initialTransportationStatus: TransportationStatus;
  paymentRequirements?: PaymentRequirement[];
  registrationId: string;
  registrationRequirements: RegistrationRequirement[];
  registrationStatus: RegistrationStatus;
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

export default function ParentAthleteCard({
  athleteId,
  athleteName,
  teamName,
  nextEvent,
  initialAttendanceStatus,
  initialTransportationStatus,
  paymentRequirements: initialPaymentRequirements = [],
  registrationId,
  registrationRequirements,
  registrationStatus,
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
  const registrationRequirementSummary =
    summarizeRegistrationRequirements(requirements);
  const documentSummary = summarizeDocumentRequirements(documentRequirements);
  const paymentSummary = summarizePaymentRequirements(paymentRequirements);
  const hasTransportationReady = transportationStatus !== "Unknown";
  const hasRegistrationReady =
    currentRegistrationStatus === "Approved" &&
    registrationRequirementSummary.open === 0 &&
    documentSummary.open === 0 &&
    paymentSummary.open === 0;
  const registrationLabel =
    registrationRequirementSummary.open > 0
      ? `${currentRegistrationStatus}, ${registrationRequirementSummary.open} Open`
      : currentRegistrationStatus;
  const registrationTone =
    hasRegistrationReady
      ? "font-semibold text-blue-300"
      : registrationRequirementSummary.needsReview > 0 &&
          registrationRequirementSummary.missing === 0 &&
          registrationRequirementSummary.blocked === 0
        ? "font-semibold text-yellow-200"
        : "font-semibold text-red-300";
  const readiness = buildAthleteReadiness({
    attendanceStatus,
    documentRequirements,
    hasUpcomingEvent: Boolean(nextEvent),
    paymentRequirements,
    registrationStatus: currentRegistrationStatus,
    requirements,
    transportationStatus,
  });
  const readinessActions = buildReadinessActions(readiness, {
    attendanceHref: `/athletes/${athleteId}`,
    documentsHref: `/athletes/${athleteId}`,
    paymentsHref: `/athletes/${athleteId}`,
    registrationHref: `/athletes/${athleteId}`,
    scheduleHref: "/parent",
    transportationHref: `/athletes/${athleteId}`,
  });

  return (
    <details className="group rounded-2xl border border-slate-800 bg-slate-900 shadow-lg">
      <summary className="cursor-pointer list-none p-5 [&::-webkit-details-marker]:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold">{athleteName}</h3>
            <p className="mt-1 text-sm text-slate-400">
              {teamName ?? "No Upcoming Events"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {nextEvent && <ReadinessBadge category={readiness.category} />}
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300 group-open:hidden">
              Open
            </span>
            <span className="hidden rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300 group-open:inline">
              Close
            </span>
          </div>
        </div>
      </summary>

      <div className="px-5 pb-5">
        {nextEvent ? (
          <div className="rounded-xl bg-slate-800 p-4">
            <p className="font-semibold">{nextEvent.title}</p>
            {nextEvent.date && (
              <p className="mt-2 text-sm text-slate-300">{nextEvent.date}</p>
            )}
            {nextEvent.time && (
              <p className="mt-2 text-sm text-slate-300">{nextEvent.time}</p>
            )}
            {nextEvent.location && (
              <p className="mt-1 text-sm text-slate-300">
                {nextEvent.location}
              </p>
            )}
            <div className="mt-4 space-y-2 border-t border-slate-700 pt-4 text-sm">
              <p className="flex justify-between gap-3 text-slate-300">
                <span className="text-slate-400">Attendance</span>
                <span
                  className={
                    attendanceStatus === "Attending"
                      ? "font-semibold text-blue-300"
                      : attendanceStatus === "Not Attending"
                        ? "font-semibold text-red-300"
                        : "font-semibold text-slate-300"
                  }
                >
                  {attendanceStatus}
                </span>
              </p>
              <p className="flex justify-between gap-3 text-slate-300">
                <span className="text-slate-400">Transportation</span>
                <span
                  className={
                    hasTransportationReady
                      ? "font-semibold text-blue-300"
                      : "font-semibold text-red-300"
                  }
                >
                  {transportationStatus}
                </span>
              </p>
              <p className="flex justify-between gap-3 text-slate-300">
                <span className="text-slate-400">Registration</span>
                <span className={registrationTone}>{registrationLabel}</span>
              </p>
              <p className="flex justify-between gap-3 text-slate-300">
                <span className="text-slate-400">Documents</span>
                <span
                  className={
                    documentSummary.open === 0
                      ? "font-semibold text-blue-300"
                      : documentSummary.needsReview > 0 &&
                          documentSummary.missing === 0 &&
                          documentSummary.blocked === 0
                        ? "font-semibold text-yellow-200"
                        : "font-semibold text-red-300"
                  }
                >
                  {documentSummary.open === 0
                    ? "Ready"
                    : `${documentSummary.open} Open`}
                </span>
              </p>
              <p className="flex justify-between gap-3 text-slate-300">
                <span className="text-slate-400">Payment</span>
                <span
                  className={
                    paymentSummary.open === 0
                      ? "font-semibold text-blue-300"
                      : paymentSummary.needsReview > 0 &&
                          paymentSummary.missing === 0 &&
                          paymentSummary.blocked === 0
                        ? "font-semibold text-yellow-200"
                        : "font-semibold text-red-300"
                  }
                >
                  {paymentSummary.open === 0
                    ? "Ready"
                    : `${paymentSummary.open} Open`}
                </span>
              </p>
            </div>
            <AttendanceStatusPicker
              athleteId={athleteId}
              eventId={nextEvent.id}
              initialStatus={initialAttendanceStatus}
              compact
            />
            <ReadinessActionList
              actions={readinessActions}
              emptyText="Ready for the next event."
              limit={2}
            />
          </div>
        ) : (
          <div className="rounded-xl bg-slate-800 p-4 text-sm text-slate-300">
            No upcoming event is set for this athlete.
          </div>
        )}

        <div
          className={`mt-4 grid gap-3 ${
            nextEvent?.directionsUrl ? "grid-cols-2" : "grid-cols-1"
          }`}
        >
          {nextEvent?.directionsUrl && (
            <a
              href={nextEvent.directionsUrl}
              target="_blank"
              rel="noreferrer"
              className="block rounded-xl border border-slate-700 bg-slate-900 py-3 text-center font-semibold text-white"
            >
              Directions
            </a>
          )}
          {nextEvent && (
            <Link
              href={`/events/${nextEvent.id}?role=parent&view=ride-share`}
              className="block rounded-xl bg-blue-500 py-3 text-center font-semibold text-white"
            >
              Ride Share
            </Link>
          )}
          <Link
            href={`/athletes/${athleteId}`}
            className={`block rounded-xl border border-slate-700 bg-slate-900 py-3 text-center font-semibold text-white ${
              nextEvent?.directionsUrl ? "col-span-2" : ""
            }`}
          >
            Athlete Details
          </Link>
        </div>
      </div>
    </details>
  );
}
