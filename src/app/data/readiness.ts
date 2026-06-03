import {
  summarizeAttendanceEntries,
  type AttendanceEntry,
  type AttendanceStatus,
} from "./attendance";
import {
  isRegistrationIncomplete,
  isRegistrationPending,
  summarizeRegistrations,
  type Registration,
  type RegistrationRequirement,
  type RegistrationStatus,
} from "./registrations";
import {
  summarizeTransportationEntries,
  type TransportationEntry,
  type TransportationStatus,
} from "./transportation";

export type ReadinessCategory =
  | "Ready"
  | "Needs Attention"
  | "Blocked"
  | "Unknown";

export type ReadinessConcern = {
  category: ReadinessCategory;
  label: string;
  source: "Attendance" | "Transportation" | "Registration" | "Schedule";
};

export type ReadinessResult = {
  category: ReadinessCategory;
  concerns: ReadinessConcern[];
};

export type ReadinessCountSummary = {
  ready: number;
  needsAttention: number;
  blocked: number;
  unknown: number;
  totalConcerns: number;
};

export type AthleteReadinessInput = {
  attendanceStatus?: AttendanceStatus;
  hasUpcomingEvent: boolean;
  registrationStatus: RegistrationStatus;
  requirements: RegistrationRequirement[];
  transportationStatus?: TransportationStatus;
};

export type EventReadinessInput = {
  attendanceEntries: AttendanceEntry[];
  eventId: string;
  registrations?: Registration[];
  transportationEntries: TransportationEntry[];
};

export type TeamReadinessInput = EventReadinessInput & {
  registrations: Registration[];
};

const readinessRank: Record<ReadinessCategory, number> = {
  Ready: 0,
  Unknown: 1,
  "Needs Attention": 2,
  Blocked: 3,
};

export function getReadinessTone(category: ReadinessCategory) {
  if (category === "Ready") {
    return "bg-blue-500/20 text-blue-300";
  }

  if (category === "Blocked") {
    return "bg-red-500/20 text-red-300";
  }

  if (category === "Needs Attention") {
    return "bg-yellow-500/20 text-yellow-200";
  }

  return "bg-slate-700 text-slate-300";
}

export function getReadinessScore(category: ReadinessCategory) {
  return readinessRank[category];
}

export function combineReadiness(
  concerns: ReadinessConcern[],
): ReadinessCategory {
  return concerns.reduce<ReadinessCategory>(
    (currentCategory, concern) =>
      readinessRank[concern.category] > readinessRank[currentCategory]
        ? concern.category
        : currentCategory,
    "Ready",
  );
}

export function countReadinessResults(
  results: ReadinessResult[],
): ReadinessCountSummary {
  return results.reduce<ReadinessCountSummary>(
    (summary, result) => {
      if (result.category === "Ready") {
        summary.ready += 1;
      }

      if (result.category === "Needs Attention") {
        summary.needsAttention += 1;
      }

      if (result.category === "Blocked") {
        summary.blocked += 1;
      }

      if (result.category === "Unknown") {
        summary.unknown += 1;
      }

      summary.totalConcerns += result.concerns.length;

      return summary;
    },
    {
      ready: 0,
      needsAttention: 0,
      blocked: 0,
      unknown: 0,
      totalConcerns: 0,
    },
  );
}

export function buildAthleteReadiness({
  attendanceStatus,
  hasUpcomingEvent,
  registrationStatus,
  requirements,
  transportationStatus,
}: AthleteReadinessInput): ReadinessResult {
  const concerns: ReadinessConcern[] = [];
  const missingRequirements = requirements.filter(
    (requirement) => requirement.status === "Missing",
  );

  if (!hasUpcomingEvent) {
    concerns.push({
      category: "Unknown",
      label: "No upcoming event is set.",
      source: "Schedule",
    });
  }

  if (attendanceStatus === "Not Attending") {
    concerns.push({
      category: "Needs Attention",
      label: "Marked not attending.",
      source: "Attendance",
    });
  } else if (attendanceStatus === "Unknown" || !attendanceStatus) {
    concerns.push({
      category: "Unknown",
      label: "Attendance has not been confirmed.",
      source: "Attendance",
    });
  }

  if (transportationStatus === "Needs Ride") {
    concerns.push({
      category: "Needs Attention",
      label: "Needs a ride.",
      source: "Transportation",
    });
  } else if (transportationStatus === "Unknown" || !transportationStatus) {
    concerns.push({
      category: "Unknown",
      label: "Transportation has not been confirmed.",
      source: "Transportation",
    });
  }

  if (registrationStatus === "Rejected") {
    concerns.push({
      category: "Blocked",
      label: "Registration has been rejected.",
      source: "Registration",
    });
  } else if (isRegistrationIncomplete(registrationStatus)) {
    concerns.push({
      category: "Needs Attention",
      label: "Registration is incomplete.",
      source: "Registration",
    });
  } else if (isRegistrationPending(registrationStatus)) {
    concerns.push({
      category: "Needs Attention",
      label: "Registration is waiting for review.",
      source: "Registration",
    });
  }

  if (missingRequirements.length > 0) {
    concerns.push({
      category: "Needs Attention",
      label: `Missing ${missingRequirements
        .map((requirement) => requirement.label)
        .join(", ")}.`,
      source: "Registration",
    });
  }

  return {
    category: combineReadiness(concerns),
    concerns,
  };
}

export function buildEventReadiness({
  attendanceEntries,
  eventId,
  registrations = [],
  transportationEntries,
}: EventReadinessInput): ReadinessResult {
  const concerns: ReadinessConcern[] = [];
  const attendance = summarizeAttendanceEntries(eventId, attendanceEntries);
  const transportation = summarizeTransportationEntries(
    eventId,
    transportationEntries,
  );
  const registration = summarizeRegistrations(registrations);

  if (attendance.totalPlayers === 0) {
    concerns.push({
      category: "Unknown",
      label: "No attendance responses are available.",
      source: "Attendance",
    });
  }

  if (attendance.notAttending > 0) {
    concerns.push({
      category: "Needs Attention",
      label: `${attendance.notAttending} not attending.`,
      source: "Attendance",
    });
  }

  if (attendance.unknown > 0) {
    concerns.push({
      category: "Unknown",
      label: `${attendance.unknown} unknown attendance.`,
      source: "Attendance",
    });
  }

  if (transportation.needsRide > 0) {
    concerns.push({
      category: "Needs Attention",
      label: `${transportation.needsRide} need ride help.`,
      source: "Transportation",
    });
  }

  if (transportation.unknown > 0) {
    concerns.push({
      category: "Unknown",
      label: `${transportation.unknown} unknown transportation.`,
      source: "Transportation",
    });
  }

  if (registration.incompleteRegistrations > 0) {
    concerns.push({
      category: "Needs Attention",
      label: `${registration.incompleteRegistrations} incomplete registrations.`,
      source: "Registration",
    });
  }

  if (registration.rejectedRegistrations > 0) {
    concerns.push({
      category: "Blocked",
      label: `${registration.rejectedRegistrations} rejected registrations.`,
      source: "Registration",
    });
  }

  if (registration.pendingRegistrations > 0) {
    concerns.push({
      category: "Needs Attention",
      label: `${registration.pendingRegistrations} registrations pending review.`,
      source: "Registration",
    });
  }

  return {
    category: combineReadiness(concerns),
    concerns,
  };
}

export function buildTeamReadiness(input: TeamReadinessInput) {
  return buildEventReadiness(input);
}
