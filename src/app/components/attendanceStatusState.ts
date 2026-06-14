"use client";

import {
  summarizeAttendanceEntries,
  type AttendanceEntry,
  type AttendanceStatus,
  type AttendanceSummary,
} from "../data/attendance";

export function useAttendanceStatus(
  _athleteId: string,
  _eventId: string,
  initialStatus: AttendanceStatus,
) {
  return initialStatus;
}

export function useAttendanceEntries(
  _eventId: string,
  entries: AttendanceEntry[],
) {
  return entries;
}

export function useAllAttendanceEntries(entries: AttendanceEntry[]) {
  return entries;
}

export function useAttendanceSummary(
  eventId: string,
  entries: AttendanceEntry[],
): AttendanceSummary {
  return summarizeAttendanceEntries(eventId, entries);
}

export function useAttendanceConcernCount(entries: AttendanceEntry[]) {
  return new Set(
    entries
      .filter(
        (entry) =>
          entry.status === "Unknown" || entry.status === "Not Attending",
      )
      .map((entry) => entry.eventId),
  ).size;
}
