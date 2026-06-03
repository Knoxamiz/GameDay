"use client";

import type { AttendanceEntry } from "../data/attendance";
import {
  buildEventReadiness,
  type ReadinessResult,
} from "../data/readiness";
import type { Registration } from "../data/registrations";
import type { TransportationEntry } from "../data/transportation";
import ReadinessBadge from "./ReadinessBadge";
import { useAttendanceEntries } from "./attendanceStatusState";
import { useRegistrations } from "./registrationStatusState";
import { useTransportationEntries } from "./transportationStatusState";

type EventReadinessSummaryProps = {
  attendanceEntries: AttendanceEntry[];
  eventId: string;
  registrations?: Registration[];
  title?: string;
  transportationEntries: TransportationEntry[];
};

function getSummaryLine(readiness: ReadinessResult) {
  if (readiness.category === "Ready") {
    return "Attendance, rides, and registration are clear.";
  }

  return `${readiness.concerns.length} readiness concern${
    readiness.concerns.length === 1 ? "" : "s"
  } need review.`;
}

export default function EventReadinessSummary({
  attendanceEntries,
  eventId,
  registrations = [],
  title = "Event Readiness",
  transportationEntries,
}: EventReadinessSummaryProps) {
  const currentAttendanceEntries = useAttendanceEntries(
    eventId,
    attendanceEntries,
  );
  const currentTransportationEntries = useTransportationEntries(
    eventId,
    transportationEntries,
  );
  const currentRegistrations = useRegistrations(registrations);
  const readiness = buildEventReadiness({
    attendanceEntries: currentAttendanceEntries,
    eventId,
    registrations: currentRegistrations,
    transportationEntries: currentTransportationEntries,
  });

  return (
    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="mt-2 text-sm text-slate-300">
            {getSummaryLine(readiness)}
          </p>
        </div>
        <ReadinessBadge category={readiness.category} />
      </div>

      {readiness.concerns.length > 0 && (
        <div className="mt-4 space-y-2 text-sm text-slate-300">
          {readiness.concerns.slice(0, 4).map((concern) => (
            <p key={`${concern.source}-${concern.label}`}>
              <span className="text-slate-400">{concern.source}:</span>{" "}
              {concern.label}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
