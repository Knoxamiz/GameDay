"use client";

import type { AttendanceEntry } from "../data/attendance";
import type { GameDayEvent } from "../data/events";
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
    <div className="rounded-xl bg-slate-800 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {title}
          </p>
          <p className="mt-2 font-semibold">{item?.label ?? fallback}</p>
        </div>
        {item && <ReadinessBadge category={item.readiness.category} />}
      </div>
      {item?.readiness.concerns[0] && (
        <p className="mt-3 text-sm text-slate-300">
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
  const eventItems: ReadinessBoardItem[] = events.map((event) => {
    const eventRegistrations = event.teamId
      ? currentRegistrations.filter(
          (registration) => registration.teamId === event.teamId,
        )
      : [];

    return {
      id: event.id,
      label: event.title,
      readiness: buildEventReadiness({
        attendanceEntries: currentAttendanceEntries.filter(
          (entry) => entry.eventId === event.id,
        ),
        eventId: event.id,
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

      return {
        id: team.id,
        label: team.name,
        readiness: buildTeamReadiness({
          attendanceEntries: currentAttendanceEntries.filter(
            (entry) => entry.eventId === eventId,
          ),
          eventId,
          registrations: currentRegistrations.filter(
            (registration) => registration.teamId === team.id,
          ),
          transportationEntries: currentTransportationEntries.filter(
            (entry) => entry.eventId === eventId,
          ),
        }),
      };
    });
  const topEvent = getTopItem(eventItems);
  const topTeam = getTopItem(teamItems);

  return (
    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-lg font-bold">Readiness Board</h2>
      <p className="mt-2 text-sm text-slate-300">
        Highest-priority readiness concerns across schedule and teams.
      </p>
      <div className="mt-4 space-y-3">
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
  );
}
