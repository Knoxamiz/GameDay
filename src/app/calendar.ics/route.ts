import { events, type GameDayEvent } from "../data/events";
import { getTeamById } from "../data/teams";

export const dynamic = "force-static";

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
  const details = [
    event.status ? `Status: ${event.status}` : undefined,
    event.notes.length > 0 ? `Notes: ${event.notes.join(", ")}` : undefined,
    event.directionsUrl ? `Directions: ${event.directionsUrl}` : undefined,
  ].filter(Boolean);

  return details.join("\n");
}

function getCalendarEvent(event: ScheduledCalendarEvent) {
  const team = event.teamId ? getTeamById(event.teamId) : undefined;
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

export function GET() {
  const scheduledEvents = events.filter(hasCalendarTime);
  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GameDay//Schedule MVP//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:GameDay Schedule",
    "X-WR-TIMEZONE:America/New_York",
    ...scheduledEvents.map((event) => getCalendarEvent(event)),
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
