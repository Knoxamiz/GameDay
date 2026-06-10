import type { GameDayEvent } from "../data/events";
import { getScheduleRole } from "../data/schedule";
import type { Team } from "../data/teams";
import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";

export const dynamic = "force-dynamic";

const calendarTimestamp = "20260602T000000Z";

function escapeCalendarText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function formatCalendarDate(value: string) {
  return new Date(value)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function hasCalendarTime(
  event: GameDayEvent,
): event is GameDayEvent & { startDateTime: string; endDateTime: string } {
  return Boolean(event.startDateTime && event.endDateTime);
}

type ScheduledCalendarEvent = GameDayEvent & {
  startDateTime: string;
  endDateTime: string;
};

function getEventDescription(event: GameDayEvent) {
  const notes = Array.isArray(event.notes) ? event.notes : [];
  const details = [
    event.status ? `Status: ${event.status}` : undefined,
    notes.length > 0 ? `Notes: ${notes.join(", ")}` : undefined,
    event.directionsUrl ? `Directions: ${event.directionsUrl}` : undefined,
  ].filter(Boolean);

  return details.join("\n");
}

function getCalendarEvent(
  event: ScheduledCalendarEvent,
  teamById: Map<string, Team>,
) {
  const team = event.teamId ? teamById.get(event.teamId) : undefined;
  const summary = team ? `${team.label}: ${event.title}` : event.title;

  return [
    "BEGIN:VEVENT",
    `UID:${event.id}@gameday.local`,
    `DTSTAMP:${calendarTimestamp}`,
    `DTSTART:${formatCalendarDate(event.startDateTime)}`,
    `DTEND:${formatCalendarDate(event.endDateTime)}`,
    `SUMMARY:${escapeCalendarText(summary)}`,
    `LOCATION:${escapeCalendarText(event.location || "Location TBD")}`,
    `DESCRIPTION:${escapeCalendarText(getEventDescription(event))}`,
    event.directionsUrl ? `URL:${event.directionsUrl}` : undefined,
    "END:VEVENT",
  ]
    .filter(Boolean)
    .join("\r\n");
}

function isDefined<TValue>(
  value: TValue | null | undefined,
): value is TValue {
  return Boolean(value);
}

export async function GET(request: Request) {
  const role = getScheduleRole(
    new URL(request.url).searchParams.get("role") ?? undefined,
  );
  const repositories = getFirebaseAdminConfig()
    ? createFirestoreRepositories()
    : null;
  const events = repositories ? await repositories.events.list() : [];
  const scheduledEvents = events.filter(hasCalendarTime);
  const teams = repositories
    ? (
        await Promise.all(
          scheduledEvents
            .map((event) => event.teamId)
            .filter((teamId): teamId is string => Boolean(teamId))
            .map((teamId) => repositories.teams.getById(teamId)),
        )
      ).filter(isDefined)
    : [];
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const calendarName = `GameDay ${
    role === "shared" ? "" : `${role} `
  }Schedule`;
  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GameDay//Schedule MVP//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${calendarName}`,
    "X-WR-TIMEZONE:America/New_York",
    ...scheduledEvents.map((event) => getCalendarEvent(event, teamById)),
    "END:VCALENDAR",
    "",
  ].join("\r\n");

  return new Response(calendar, {
    headers: {
      "Content-Disposition": 'inline; filename="gameday-calendar.ics"',
      "Content-Type": "text/calendar; charset=utf-8",
    },
  });
}
