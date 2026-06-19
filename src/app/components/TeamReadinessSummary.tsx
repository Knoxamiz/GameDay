"use client";

import Link from "next/link";
import type { AttendanceEntry } from "../data/attendance";
import { buildTeamReadiness } from "../data/readiness";
import { buildReadinessActions } from "../data/readinessActions";
import {
  getDocumentRequirementsFromRegistrations,
  getPaymentRequirementsFromRegistrations,
} from "../data/registrationDerivedRequirements";
import type { Registration } from "../data/registrations";
import type { TransportationEntry } from "../data/transportation";
import ReadinessActionList from "./ReadinessActionList";
import ReadinessBadge from "./ReadinessBadge";
import { useAttendanceEntries } from "./attendanceStatusState";
import { useDocumentRequirements } from "./documentRequirementState";
import { usePaymentRequirements } from "./paymentRequirementState";
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
  const currentDocumentRequirements = useDocumentRequirements(
    getDocumentRequirementsFromRegistrations(currentRegistrations),
  );
  const currentPaymentRequirements = usePaymentRequirements(
    getPaymentRequirementsFromRegistrations(currentRegistrations),
  );
  const readiness = buildTeamReadiness({
    attendanceEntries: currentAttendanceEntries,
    documentRequirements: currentDocumentRequirements,
    eventId,
    paymentRequirements: currentPaymentRequirements,
    registrations: currentRegistrations,
    transportationEntries: currentTransportationEntries,
  });
  const readinessActions = buildReadinessActions(readiness, {
    attendanceHref: actionHref,
    documentsHref: actionHref,
    paymentsHref: actionHref,
    registrationHref: actionHref,
    transportationHref: actionHref,
  });

  return (
    <details className="gd-card-dark mt-3 rounded-lg">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        <div>
          <h2 className="text-sm font-black text-white">Readiness</h2>
          <p className="mt-0.5 text-xs font-semibold text-slate-400">
            {readiness.category === "Ready"
              ? "Team is clear for the next event."
              : `${readiness.concerns.length} item${
                  readiness.concerns.length === 1 ? "" : "s"
                } need attention.`}
          </p>
        </div>
        <ReadinessBadge category={readiness.category} />
      </summary>
      <div className="border-t border-white/10 px-3 pb-3 pt-2">

      {readiness.concerns.length > 0 && (
        <div className="space-y-1.5 text-sm text-slate-300">
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
          className="mt-3 block w-full rounded-md border border-blue-300/20 bg-white/5 py-2 text-center text-sm font-black text-white hover:bg-white/10"
        >
          Review Details
        </Link>
      )}
      <ReadinessActionList
        actions={readinessActions}
        emptyText="Team is ready for the next event."
        limit={3}
      />
      </div>
    </details>
  );
}
