"use client";

import Link from "next/link";
import type { AttendanceStatus } from "../data/attendance";
import type {
  RegistrationRequirement,
  RegistrationStatus,
} from "../data/registrations";
import { buildAthleteReadiness } from "../data/readiness";
import type { TransportationStatus } from "../data/transportation";
import AttendanceStatusPicker from "./AttendanceStatusPicker";
import ReadinessBadge from "./ReadinessBadge";
import { useAttendanceStatus } from "./attendanceStatusState";
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
  registrationId: string;
  registrationRequirements: RegistrationRequirement[];
  registrationStatus: RegistrationStatus;
};

export default function ParentAthleteCard({
  athleteId,
  athleteName,
  teamName,
  nextEvent,
  initialAttendanceStatus,
  initialTransportationStatus,
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
  const missingRegistrationCount = requirements.filter(
    (requirement) => requirement.status === "Missing",
  ).length;
  const hasTransportationReady = transportationStatus !== "Unknown";
  const hasRegistrationReady =
    currentRegistrationStatus === "Approved" && missingRegistrationCount === 0;
  const readiness = buildAthleteReadiness({
    attendanceStatus,
    hasUpcomingEvent: Boolean(nextEvent),
    registrationStatus: currentRegistrationStatus,
    requirements,
    transportationStatus,
  });

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xl font-bold">{athleteName}</h3>
        {nextEvent && <ReadinessBadge category={readiness.category} />}
      </div>

      {nextEvent ? (
        <p className="mt-1 text-sm text-slate-400">{teamName}</p>
      ) : (
        <p className="mt-1 text-sm text-slate-400">No Upcoming Events</p>
      )}

      {nextEvent && (
        <div className="mt-4 rounded-xl bg-slate-800 p-4">
          <p className="font-semibold">{nextEvent.title}</p>
          {nextEvent.date && (
            <p className="mt-2 text-sm text-slate-300">{nextEvent.date}</p>
          )}
          {nextEvent.time && (
            <p className="mt-2 text-sm text-slate-300">{nextEvent.time}</p>
          )}
          {nextEvent.location && (
            <p className="mt-1 text-sm text-slate-300">{nextEvent.location}</p>
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
              <span
                className={
                  hasRegistrationReady
                    ? "font-semibold text-blue-300"
                    : "font-semibold text-red-300"
                }
              >
                {currentRegistrationStatus}
                {missingRegistrationCount > 0
                  ? `, ${missingRegistrationCount} Missing`
                  : ""}
              </span>
            </p>
          </div>
          <AttendanceStatusPicker
            athleteId={athleteId}
            eventId={nextEvent.id}
            initialStatus={initialAttendanceStatus}
            compact
          />
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
        <Link
          href={`/athletes/${athleteId}`}
          className="block rounded-xl bg-blue-500 py-3 text-center font-semibold text-white"
        >
          Athlete Details
        </Link>
      </div>
    </div>
  );
}
