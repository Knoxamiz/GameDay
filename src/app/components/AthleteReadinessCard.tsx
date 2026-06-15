"use client";

import type { AttendanceStatus } from "../data/attendance";
import {
  buildAthleteReadiness,
  type ReadinessResult,
} from "../data/readiness";
import { buildReadinessActions } from "../data/readinessActions";
import type { DocumentRequirement } from "../data/documents";
import type { PaymentRequirement } from "../data/payments";
import type {
  RegistrationRequirement,
  RegistrationStatus,
} from "../data/registrations";
import type { TransportationStatus } from "../data/transportation";
import ReadinessActionList from "./ReadinessActionList";
import ReadinessBadge from "./ReadinessBadge";
import { useAttendanceStatus } from "./attendanceStatusState";
import { useDocumentRequirements } from "./documentRequirementState";
import { usePaymentRequirements } from "./paymentRequirementState";
import { useRegistrationRequirements } from "./registrationRequirementState";
import { useRegistrationStatus } from "./registrationStatusState";
import { useTransportationStatus } from "./transportationStatusState";

type AthleteReadinessCardProps = {
  athleteId: string;
  eventId?: string;
  initialAttendanceStatus: AttendanceStatus;
  initialTransportationStatus: TransportationStatus;
  documentRequirements?: DocumentRequirement[];
  paymentRequirements?: PaymentRequirement[];
  registrationId: string;
  registrationRequirements: RegistrationRequirement[];
  registrationStatus: RegistrationStatus;
  title?: string;
};

function getReadinessCopy(readiness: ReadinessResult) {
  if (readiness.category === "Ready") {
    return "All core readiness items are clear.";
  }

  return readiness.concerns.map((concern) => concern.label).join(" ");
}

export default function AthleteReadinessCard({
  athleteId,
  eventId,
  initialAttendanceStatus,
  initialTransportationStatus,
  documentRequirements: initialDocumentRequirements = [],
  paymentRequirements: initialPaymentRequirements = [],
  registrationId,
  registrationRequirements,
  registrationStatus,
  title = "Readiness",
}: AthleteReadinessCardProps) {
  const attendanceStatus = useAttendanceStatus(
    athleteId,
    eventId ?? "",
    initialAttendanceStatus,
  );
  const transportationStatus = useTransportationStatus(
    athleteId,
    eventId ?? "",
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
    initialDocumentRequirements,
  );
  const paymentRequirements = usePaymentRequirements(
    initialPaymentRequirements,
  );
  const readiness = buildAthleteReadiness({
    attendanceStatus,
    documentRequirements,
    hasUpcomingEvent: Boolean(eventId),
    paymentRequirements,
    registrationStatus: currentRegistrationStatus,
    requirements,
    transportationStatus,
  });
  const readinessActions = buildReadinessActions(readiness, {
    attendanceHref: eventId ? `/events/${eventId}` : undefined,
    documentsHref: `/athletes/${athleteId}`,
    paymentsHref: `/athletes/${athleteId}`,
    registrationHref: "/registration",
    scheduleHref: "/parent",
    transportationHref: eventId ? `/events/${eventId}` : undefined,
  });

  return (
    <div className="mt-4 rounded-xl bg-slate-800 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold">{title}</h4>
          <p className="mt-2 text-sm text-slate-300">
            {getReadinessCopy(readiness)}
          </p>
        </div>
        <ReadinessBadge category={readiness.category} />
      </div>

      {readiness.concerns.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-slate-700 pt-3 text-sm text-slate-300">
          {readiness.concerns.map((concern) => (
            <p key={`${concern.source}-${concern.label}`}>
              <span className="text-slate-400">{concern.source}:</span>{" "}
              {concern.label}
            </p>
          ))}
        </div>
      )}

      <ReadinessActionList
        actions={readinessActions}
        emptyText="Ready for the next event."
        limit={3}
      />
    </div>
  );
}
