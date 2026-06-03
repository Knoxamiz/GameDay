"use client";

import type { AttendanceEntry } from "../data/attendance";
import {
  buildEventReadiness,
  type ReadinessResult,
} from "../data/readiness";
import { buildReadinessActions } from "../data/readinessActions";
import type { Registration } from "../data/registrations";
import type { TransportationEntry } from "../data/transportation";
import ReadinessActionList from "./ReadinessActionList";
import ReadinessBadge from "./ReadinessBadge";
import { useAttendanceEntries } from "./attendanceStatusState";
import { useRegistrations } from "./registrationStatusState";
import { useTransportationEntries } from "./transportationStatusState";

type EventReadinessSummaryProps = {
  actionHref?: string;
  attendanceEntries: AttendanceEntry[];
  eventId: string;
  registrationHref?: string;
  registrations?: Registration[];
  title?: string;
  transportationHref?: string;
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
  actionHref,
  attendanceEntries,
  eventId,
  registrationHref,
  registrations = [],
  title = "Event Readiness",
  transportationHref,
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
  const readinessActions = buildReadinessActions(readiness, {
    attendanceHref: actionHref,
    registrationHref,
    transportationHref: transportationHref ?? actionHref,
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

      <ReadinessActionList
        actions={readinessActions}
        emptyText="Event is ready."
        limit={3}
      />
    </div>
  );
}
