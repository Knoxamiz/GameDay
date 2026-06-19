"use client";

import type { AttendanceEntry } from "../data/attendance";
import type { DocumentRequirement } from "../data/documents";
import { eventHasTeamId, type GameDayEvent } from "../data/events";
import {
  buildEventReadiness,
  buildTeamReadiness,
  getReadinessScore,
  type ReadinessResult,
} from "../data/readiness";
import type { Registration } from "../data/registrations";
import type { Team } from "../data/teams";
import type { TransportationEntry } from "../data/transportation";
import ReadinessBadge from "./ReadinessBadge";
import { useAllAttendanceEntries } from "./attendanceStatusState";
import { useDocumentRequirements } from "./documentRequirementState";
import { usePaymentRequirements } from "./paymentRequirementState";
import { useRegistrations } from "./registrationStatusState";
import { useAllTransportationEntries } from "./transportationStatusState";

type AdminReadinessBoardProps = {
  attendanceEntries: AttendanceEntry[];
  events: GameDayEvent[];
  registrations: Registration[];
  teams: Team[];
  transportationEntries: TransportationEntry[];
};

type ReadinessBoardItem = {
  id: string;
  label: string;
  readiness: ReadinessResult;
};

function getPriority(item: ReadinessBoardItem) {
  return getReadinessScore(item.readiness.category) * 100 +
    item.readiness.concerns.length;
}

function getTopItem(items: ReadinessBoardItem[]) {
  return [...items].sort((first, second) => getPriority(second) - getPriority(first))[0];
}

function getRegistrationDocumentRequirements(
  registration: Registration,
): DocumentRequirement[] {
  return registration.requirements.map((requirement) => ({
    athleteId: registration.athleteId,
    description: requirement.description ?? "",
    id: `${registration.id}-${requirement.label.toLowerCase().replaceAll(" ", "-")}`,
    label: requirement.label,
    organizationId: registration.organizationId,
    parentId: registration.parentId,
    registrationId: registration.id,
    required: requirement.required ?? true,
    status: requirement.status,
    teamId: registration.teamId,
  }));
}

function ReadinessWatchItem({
  fallback,
  item,
  title,
}: {
  fallback: string;
  item?: ReadinessBoardItem;
  title: string;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-white/5 p-2.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {title}
          </p>
          <p className="mt-1 font-semibold">{item?.label ?? fallback}</p>
        </div>
        {item && <ReadinessBadge category={item.readiness.category} />}
      </div>
      {item?.readiness.concerns[0] && (
        <p className="mt-2 text-sm text-slate-300">
          {item.readiness.concerns[0].label}
        </p>
      )}
    </div>
  );
}

export default function AdminReadinessBoard({
  attendanceEntries,
  events,
  registrations,
  teams,
  transportationEntries,
}: AdminReadinessBoardProps) {
  const currentAttendanceEntries = useAllAttendanceEntries(attendanceEntries);
  const currentTransportationEntries =
    useAllTransportationEntries(transportationEntries);
  const currentRegistrations = useRegistrations(registrations);
  const currentDocumentRequirements = useDocumentRequirements(
    currentRegistrations.flatMap(getRegistrationDocumentRequirements),
  );
  const currentPaymentRequirements = usePaymentRequirements(
    currentRegistrations.flatMap(
      (registration) => registration.paymentRequirements ?? [],
    ),
  );
  const eventItems: ReadinessBoardItem[] = events.map((event) => {
    const eventRegistrations = currentRegistrations.filter((registration) =>
      eventHasTeamId(event, registration.teamId),
    );
    const eventRegistrationIdSet = new Set(
      eventRegistrations.map((registration) => registration.id),
    );

    return {
      id: event.id,
      label: event.title,
      readiness: buildEventReadiness({
        attendanceEntries: currentAttendanceEntries.filter(
          (entry) => entry.eventId === event.id,
        ),
        documentRequirements: currentDocumentRequirements.filter(
          (requirement) => eventRegistrationIdSet.has(requirement.registrationId),
        ),
        eventId: event.id,
        paymentRequirements: currentPaymentRequirements.filter((requirement) =>
          eventRegistrationIdSet.has(requirement.registrationId),
        ),
        registrations: eventRegistrations,
        transportationEntries: currentTransportationEntries.filter(
          (entry) => entry.eventId === event.id,
        ),
      }),
    };
  });
  const teamItems: ReadinessBoardItem[] = teams
    .filter((team) => team.nextEventId)
    .map((team) => {
      const eventId = team.nextEventId ?? team.id;
      const teamRegistrations = currentRegistrations.filter(
        (registration) => registration.teamId === team.id,
      );
      const teamRegistrationIdSet = new Set(
        teamRegistrations.map((registration) => registration.id),
      );

      return {
        id: team.id,
        label: team.name,
        readiness: buildTeamReadiness({
          attendanceEntries: currentAttendanceEntries.filter(
            (entry) => entry.eventId === eventId,
          ),
          documentRequirements: currentDocumentRequirements.filter(
            (requirement) =>
              teamRegistrationIdSet.has(requirement.registrationId),
          ),
          eventId,
          paymentRequirements: currentPaymentRequirements.filter(
            (requirement) =>
              teamRegistrationIdSet.has(requirement.registrationId),
          ),
          registrations: teamRegistrations,
          transportationEntries: currentTransportationEntries.filter(
            (entry) => entry.eventId === eventId,
          ),
        }),
      };
    });
  const topEvent = getTopItem(eventItems);
  const topTeam = getTopItem(teamItems);

  return (
    <details className="gd-card-dark mt-3 rounded-lg">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        <div>
          <h2 className="text-sm font-black text-white">Readiness Board</h2>
          <p className="mt-0.5 text-xs font-semibold text-slate-400">
            Highest-priority concerns.
          </p>
        </div>
        <span className="rounded-full bg-blue-500/20 px-2.5 py-1 text-xs font-black text-blue-200">
          Open
        </span>
      </summary>
      <div className="border-t border-white/10 px-3 pb-3 pt-2">
      <p className="text-sm text-slate-300">
        Highest-priority readiness concerns across schedule and teams.
      </p>
      <div className="mt-2 space-y-2">
        <ReadinessWatchItem
          fallback="No event concerns"
          item={topEvent}
          title="Event To Watch"
        />
        <ReadinessWatchItem
          fallback="No team concerns"
          item={topTeam}
          title="Team To Watch"
        />
      </div>
      </div>
    </details>
  );
}
