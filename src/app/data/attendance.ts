export type AttendanceStatus = "Attending" | "Unknown" | "Not Attending";

export type AttendanceEntry = {
  id: string;
  eventId: string;
  athleteId?: string;
  createdAt?: string;
  createdByUid?: string;
  name: string;
  organizationId?: string;
  ownerUid?: string;
  parentId?: string;
  parentUid?: string;
  status: AttendanceStatus;
  teamId?: string;
  updatedAt?: string;
  count?: number;
};

export type AttendanceSummary = {
  eventId: string;
  totalPlayers: number;
  attending: number;
  unknown: number;
  notAttending: number;
};

export const attendanceStatusValues: AttendanceStatus[] = [
  "Attending",
  "Unknown",
  "Not Attending",
];

export const attendanceOptions: AttendanceStatus[] = [
  "Attending",
  "Not Attending",
  "Unknown",
];

export const attendanceEntries: AttendanceEntry[] = [];

export function summarizeAttendanceEntries(
  eventId: string,
  entries: AttendanceEntry[],
): AttendanceSummary {
  return entries.reduce<AttendanceSummary>(
    (summary, entry) => {
      const count = entry.count ?? 1;

      if (entry.status === "Attending") {
        summary.attending += count;
      }

      if (entry.status === "Unknown") {
        summary.unknown += count;
      }

      if (entry.status === "Not Attending") {
        summary.notAttending += count;
      }

      summary.totalPlayers += count;

      return summary;
    },
    {
      eventId,
      totalPlayers: 0,
      attending: 0,
      unknown: 0,
      notAttending: 0,
    },
  );
}

export function getAttendanceEntriesByEventId(eventId: string) {
  return attendanceEntries.filter((entry) => entry.eventId === eventId);
}

export function getAttendanceEntryByAthleteAndEventId(
  athleteId: string,
  eventId: string,
) {
  return attendanceEntries.find(
    (entry) => entry.athleteId === athleteId && entry.eventId === eventId,
  );
}

export function getAttendanceSummaryByEventId(eventId: string) {
  return summarizeAttendanceEntries(
    eventId,
    getAttendanceEntriesByEventId(eventId),
  );
}

export const attendanceConcernCount = new Set(
  attendanceEntries
    .filter(
      (entry) => entry.status === "Unknown" || entry.status === "Not Attending",
    )
    .map((entry) => entry.eventId),
).size;
