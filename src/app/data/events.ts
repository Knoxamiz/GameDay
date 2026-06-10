export type GameDayEvent = {
  id: string;
  organizationId: string;
  teamId?: string;
  type: string;
  title: string;
  date: string;
  shortDate: string;
  time: string;
  startDateTime?: string;
  endDateTime?: string;
  location: string;
  directionsUrl: string;
  status?: string;
  lastUpdated?: string;
  notes: string[];
};

export const events: GameDayEvent[] = [];

export function getEventById(eventId: string) {
  return events.find((event) => event.id === eventId);
}

export function getEventsByIds(eventIds?: string[] | null) {
  const safeEventIds = Array.isArray(eventIds) ? eventIds : [];

  return safeEventIds
    .map((eventId) => getEventById(eventId))
    .filter((event): event is GameDayEvent => Boolean(event));
}

export function getEventsByOrganizationId(organizationId: string) {
  return events.filter((event) => event.organizationId === organizationId);
}

export function getEventsByTeamIds(teamIds?: string[] | null) {
  const safeTeamIds = Array.isArray(teamIds) ? teamIds : [];
  const teamIdSet = new Set(safeTeamIds);

  return events.filter(
    (event) => event.teamId && teamIdSet.has(event.teamId),
  );
}
