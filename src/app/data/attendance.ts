export type AttendanceStatus = "Attending" | "Unknown" | "Not Attending";

export type AttendanceEntry = {
  id: string;
  eventId: string;
  athleteId?: string;
  name: string;
  status: AttendanceStatus;
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

export const attendanceEntries: AttendanceEntry[] = [
  {
    id: "attendance-emma-practice-jun-2",
    eventId: "practice-jun-2",
    athleteId: "emma-smith",
    name: "Emma Smith",
    status: "Attending",
  },
  {
    id: "attendance-sarah-practice-jun-2",
    eventId: "practice-jun-2",
    athleteId: "sarah-jones",
    name: "Sarah Jones",
    status: "Unknown",
  },
  {
    id: "attendance-katie-practice-jun-2",
    eventId: "practice-jun-2",
    athleteId: "katie-brown",
    name: "Katie Brown",
    status: "Not Attending",
  },
  {
    id: "attendance-confirmed-practice-jun-2",
    eventId: "practice-jun-2",
    name: "Additional confirmed players",
    status: "Attending",
    count: 17,
  },
  {
    id: "attendance-unreported-practice-jun-2",
    eventId: "practice-jun-2",
    name: "Additional unreported players",
    status: "Unknown",
    count: 1,
  },
  {
    id: "attendance-out-practice-jun-2",
    eventId: "practice-jun-2",
    name: "Additional unavailable players",
    status: "Not Attending",
    count: 1,
  },
  {
    id: "attendance-unknown-practice-jun-5",
    eventId: "practice-jun-5",
    name: "Black Diamonds 12U roster",
    status: "Unknown",
    count: 22,
  },
  {
    id: "attendance-unknown-tournament-jun-7",
    eventId: "tournament-jun-7",
    name: "Black Diamonds 12U roster",
    status: "Unknown",
    count: 22,
  },
  {
    id: "attendance-olivia-tournament-saturday-10u",
    eventId: "tournament-saturday-10u",
    athleteId: "olivia-smith",
    name: "Olivia Smith",
    status: "Unknown",
  },
  {
    id: "attendance-unknown-tournament-saturday-10u",
    eventId: "tournament-saturday-10u",
    name: "Additional 10U players",
    status: "Unknown",
    count: 17,
  },
  {
    id: "attendance-unknown-team-meeting-10u",
    eventId: "team-meeting-10u",
    name: "Black Diamonds 10U roster",
    status: "Unknown",
    count: 18,
  },
  {
    id: "attendance-mason-offseason-training-hs",
    eventId: "offseason-training-hs",
    athleteId: "mason-smith",
    name: "Mason Smith",
    status: "Unknown",
  },
  {
    id: "attendance-unknown-offseason-training-hs",
    eventId: "offseason-training-hs",
    name: "Additional high school players",
    status: "Unknown",
    count: 30,
  },
  {
    id: "attendance-unknown-tournament-saturday-14u",
    eventId: "tournament-saturday-14u",
    name: "Black Diamonds 14U roster",
    status: "Unknown",
    count: 20,
  },
];

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
