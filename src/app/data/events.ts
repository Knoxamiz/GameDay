export type GameDayEventType =
  | "practice"
  | "game"
  | "tournament"
  | "meeting"
  | "other";

export type GameDayEventStatus =
  | "draft"
  | "published"
  | "canceled"
  | "archived";

export type GameDayEvent = {
  id: string;
  organizationId: string;
  teamIds: string[];
  title: string;
  type: GameDayEventType;
  startsAt: string;
  endsAt: string;
  locationName: string;
  address?: string;
  archivedAt?: string;
  archivedByUid?: string;
  canceledAt?: string;
  canceledByUid?: string;
  createdAt: string;
  createdByUid: string;
  notes?: string | string[];
  status: GameDayEventStatus;
  updatedAt: string;

  // Legacy read compatibility for pre-production records. New writes use teamIds
  // plus startsAt/endsAt/locationName.
  date?: string;
  directionsUrl?: string;
  endDateTime?: string;
  lastUpdated?: string;
  location?: string;
  shortDate?: string;
  startDateTime?: string;
  teamId?: string;
  time?: string;
};

export const events: GameDayEvent[] = [];

const eventDisplayTimeZone = "America/New_York";

function getEventStartValue(event: GameDayEvent) {
  return event.startsAt || event.startDateTime || event.date || "";
}

function getEventEndValue(event: GameDayEvent) {
  return event.endsAt || event.endDateTime || "";
}

function getEventTimestamp(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function formatDateTime(value: string, options: Intl.DateTimeFormatOptions) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: eventDisplayTimeZone,
    ...options,
  }).format(date);
}

export function getEventTeamIds(event: GameDayEvent) {
  return [
    ...new Set([
      ...(Array.isArray(event.teamIds) ? event.teamIds : []),
      event.teamId,
    ].filter((teamId): teamId is string => Boolean(teamId))),
  ];
}

export function eventHasTeamId(event: GameDayEvent, teamId: string) {
  return getEventTeamIds(event).includes(teamId);
}

export function isEventVisibleToNonAdmin(event: GameDayEvent) {
  return event.status === "published" || event.status === "canceled";
}

export function isPublishedEvent(
  event: GameDayEvent | null | undefined,
): event is GameDayEvent {
  return event?.status === "published";
}

export function isUpcomingEvent(event: GameDayEvent, now = new Date()) {
  const eventEndTime = getEventTimestamp(getEventEndValue(event));
  const eventStartTime = getEventTimestamp(getEventStartValue(event));
  const comparisonTime = eventEndTime ?? eventStartTime;

  return comparisonTime !== null && comparisonTime >= now.getTime();
}

export function isArchivedEvent(event: GameDayEvent) {
  return event.status === "archived";
}

export function getEventStatusLabel(event: GameDayEvent) {
  return `${event.status.charAt(0).toUpperCase()}${event.status.slice(1)}`;
}

export function getEventPrimaryTeamId(event: GameDayEvent) {
  return getEventTeamIds(event)[0];
}

export function getEventDateLabel(event: GameDayEvent) {
  return (
    event.date ||
    formatDateTime(getEventStartValue(event), {
      day: "numeric",
      month: "short",
      weekday: "short",
      year: "numeric",
    })
  );
}

export function getEventShortDateLabel(event: GameDayEvent) {
  return (
    event.shortDate ||
    formatDateTime(getEventStartValue(event), {
      day: "numeric",
      month: "short",
    })
  );
}

export function getEventTimeLabel(event: GameDayEvent) {
  if (event.time) {
    return event.time;
  }

  const startsAt = formatDateTime(getEventStartValue(event), {
    hour: "numeric",
    minute: "2-digit",
  });
  const endsAt = formatDateTime(getEventEndValue(event), {
    hour: "numeric",
    minute: "2-digit",
  });

  return [startsAt, endsAt].filter(Boolean).join(" - ");
}

export function getEventLocationLabel(event: GameDayEvent) {
  return event.locationName || event.location || "Location TBD";
}

export function getEventNotes(event: GameDayEvent) {
  if (Array.isArray(event.notes)) {
    return event.notes;
  }

  return event.notes
    ? event.notes
        .split(/\r?\n/)
        .map((note) => note.trim())
        .filter(Boolean)
    : [];
}

export function sortEventsByStartDate(
  firstEvent: GameDayEvent,
  secondEvent: GameDayEvent,
) {
  return getEventStartValue(firstEvent).localeCompare(
    getEventStartValue(secondEvent),
  );
}

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
    (event) => getEventTeamIds(event).some((teamId) => teamIdSet.has(teamId)),
  );
}
