"use client";

import Link from "next/link";
import type { AttendanceEntry } from "../data/attendance";
import { buildTeamReadiness } from "../data/readiness";
import type { Registration } from "../data/registrations";
import type { TransportationEntry } from "../data/transportation";
import ReadinessBadge from "./ReadinessBadge";
import { useAttendanceEntries } from "./attendanceStatusState";
import { useRegistrations } from "./registrationStatusState";
import { useTransportationEntries } from "./transportationStatusState";

type TeamReadinessSummaryProps = {
  actionHref?: string;
  attendanceEntries: AttendanceEntry[];
  eventId: string;
  registrations: Registration[];
  transportationEntries: TransportationEntry[];
};

export default function TeamReadinessSummary({
  actionHref,
  attendanceEntries,
  eventId,
  registrations,
  transportationEntries,
}: TeamReadinessSummaryProps) {
  const currentAttendanceEntries = useAttendanceEntries(
    eventId,
    attendanceEntries,
  );
  const currentTransportationEntries = useTransportationEntries(
    eventId,
    transportationEntries,
  );
  const currentRegistrations = useRegistrations(registrations);
  const readiness = buildTeamReadiness({
    attendanceEntries: currentAttendanceEntries,
    eventId,
    registrations: currentRegistrations,
    transportationEntries: currentTransportationEntries,
  });

  return (
    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Readiness Summary</h2>
          <p className="mt-2 text-sm text-slate-300">
            {readiness.category === "Ready"
              ? "Team is clear for the next event."
              : `${readiness.concerns.length} item${
                  readiness.concerns.length === 1 ? "" : "s"
                } need attention before the next event.`}
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

      {actionHref && (
        <Link
          href={actionHref}
          className="mt-4 block w-full rounded-xl border border-slate-700 bg-slate-900 py-3 text-center font-semibold text-white"
        >
          Review Details
        </Link>
      )}
    </div>
  );
}
