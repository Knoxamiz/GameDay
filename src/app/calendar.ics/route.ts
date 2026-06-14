import {
  getEventLocationLabel,
  getEventNotes,
  getEventTeamIds,
  type GameDayEvent,
} from "../data/events";
import { getCurrentAuthSession } from "../data/currentUser.server";
import { getEventScheduleReadModel } from "../data/eventSchedule.server";
import type { Team } from "../data/teams";

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
): event is GameDayEvent & { endsAt: string; startsAt: string } {
  return Boolean(event.startsAt && event.endsAt);
}

type ScheduledCalendarEvent = GameDayEvent & {
  endsAt: string;
  startsAt: string;
};

function getEventDescription(event: GameDayEvent) {
  const notes = getEventNotes(event);
  const details = [
    event.status ? `Status: ${event.status}` : undefined,
    notes.length > 0 ? `Notes: ${notes.join(", ")}` : undefined,
  ].filter(Boolean);

  return details.join("\n");
}

function getCalendarEvent(
  event: ScheduledCalendarEvent,
  teamById: Map<string, Team>,
) {
  const teams = getEventTeamIds(event)
    .map((teamId) => teamById.get(teamId))
    .filter(Boolean);
  const teamLabel = teams.map((team) => team?.label).join(", ");
  const summary = teamLabel ? `${teamLabel}: ${event.title}` : event.title;

  return [
    "BEGIN:VEVENT",
    `UID:${event.id}@gameday.local`,
    `DTSTAMP:${calendarTimestamp}`,
    `DTSTART:${formatCalendarDate(event.startsAt)}`,
    `DTEND:${formatCalendarDate(event.endsAt)}`,
    `SUMMARY:${escapeCalendarText(summary)}`,
    `LOCATION:${escapeCalendarText(getEventLocationLabel(event))}`,
    `DESCRIPTION:${escapeCalendarText(getEventDescription(event))}`,
    "END:VEVENT",
  ]
    .filter(Boolean)
    .join("\r\n");
}

export async function GET() {
  const session = await getCurrentAuthSession();
  const role = session?.claims.role ?? "shared";
  const schedule = await getEventScheduleReadModel(role);
  const events = schedule.events;
  const scheduledEvents = events.filter(hasCalendarTime);
  const teams = schedule.teams;
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
