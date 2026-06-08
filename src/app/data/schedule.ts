import { getAthletesByParentId } from "./athletes";
import { getCurrentCoach } from "./coaches";
import {
  getEventsByOrganizationId,
  getEventsByTeamIds,
  type GameDayEvent,
} from "./events";
import { blackDiamondsOrganization } from "./organizations";
import { getCurrentParent } from "./parents";
import { getTeamsByCoachId } from "./teams";

export type ScheduleRole = "admin" | "coach" | "parent" | "shared";

export function getScheduleRole(value?: string | string[]): ScheduleRole {
  const role = Array.isArray(value) ? value[0] : value;

  return role === "admin" || role === "coach" || role === "parent"
    ? role
    : "shared";
}

function sortEventsByStartDate(
  firstEvent: GameDayEvent,
  secondEvent: GameDayEvent,
) {
  return (firstEvent.startDateTime ?? firstEvent.date).localeCompare(
    secondEvent.startDateTime ?? secondEvent.date,
  );
}

function dedupeEvents(events: GameDayEvent[]) {
  return [...new Map(events.map((event) => [event.id, event])).values()];
}

export function getVisibleScheduleEvents(role: ScheduleRole) {
  if (role === "parent") {
    const parent = getCurrentParent();
    const parentTeamIds = getAthletesByParentId(parent.id).map(
      (athlete) => athlete.teamId,
    );

    return dedupeEvents(getEventsByTeamIds(parentTeamIds)).sort(
      sortEventsByStartDate,
    );
  }

  if (role === "coach") {
    const coach = getCurrentCoach();
    const coachTeamIds = getTeamsByCoachId(coach.id).map((team) => team.id);

    return dedupeEvents(getEventsByTeamIds(coachTeamIds)).sort(
      sortEventsByStartDate,
    );
  }

  return getEventsByOrganizationId(blackDiamondsOrganization.id).sort(
    sortEventsByStartDate,
  );
}
