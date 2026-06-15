import {
  summarizeAttendanceEntries,
  type AttendanceEntry,
} from "./attendance";
import type { GameDayEvent, GameDayEventStatus } from "./events";
import { summarizePaymentRequirements } from "./payments";
import {
  isRequirementCleared,
  summarizeRegistrationRequirements,
  type Registration,
} from "./registrations";
import {
  summarizeTransportationEntries,
  type TransportationEntry,
} from "./transportation";

export type CoachNextActionTone = "attention" | "ready" | "waiting";

export type CoachNextAction = {
  description: string;
  href?: string;
  label: string;
  tone: CoachNextActionTone;
};

export type CoachTeamReadinessSummary = {
  label: string;
  limited: boolean;
  missingRequirements: number;
  needsReview: number;
  openItems: number;
  readyAthletes: number;
  rosteredAthletes: number;
};

export type CoachTeamResponseSummary = {
  attendanceMissing: number;
  attendanceSubmitted: number;
  attendanceTotal: number;
  transportationMissing: number;
  transportationSubmitted: number;
  transportationTotal: number;
};

export type CoachNextActionInput = {
  eventHref?: string;
  nextEvent?: {
    status: GameDayEventStatus;
  };
  responseSummary: CoachTeamResponseSummary;
  rosteredAthletes: number;
  teamHref: string;
};

function getRequiredRegistrationRequirements(registration: Registration) {
  return registration.requirements.filter(
    (requirement) => requirement.required !== false,
  );
}

function getRequiredPaymentRequirements(registration: Registration) {
  return (registration.paymentRequirements ?? []).filter(
    (requirement) => requirement.required !== false,
  );
}

function getRespondedAthleteCount(
  entries: Array<{ athleteId?: string }>,
  rosteredAthleteIds: string[],
) {
  const rosteredAthleteIdSet = new Set(rosteredAthleteIds);
  const respondedAthleteIds = new Set(
    entries
      .map((entry) => entry.athleteId)
      .filter(
        (athleteId): athleteId is string =>
          typeof athleteId === "string" &&
          rosteredAthleteIdSet.has(athleteId),
      ),
  );

  return respondedAthleteIds.size;
}

export function getCoachTeamReadinessSummary(
  registrations: Registration[],
): CoachTeamReadinessSummary {
  const requirementSummary = summarizeRegistrationRequirements(
    registrations.flatMap(getRequiredRegistrationRequirements),
  );
  const paymentSummary = summarizePaymentRequirements(
    registrations.flatMap(getRequiredPaymentRequirements),
  );
  const totalTrackedRequirements =
    registrations.reduce(
      (total, registration) =>
        total + getRequiredRegistrationRequirements(registration).length,
      0,
    ) +
    registrations.reduce(
      (total, registration) =>
        total + getRequiredPaymentRequirements(registration).length,
      0,
    );
  const readyAthletes = registrations.filter((registration) => {
    const requiredRequirements =
      getRequiredRegistrationRequirements(registration);
    const requiredPayments = getRequiredPaymentRequirements(registration);

    if (requiredRequirements.length + requiredPayments.length === 0) {
      return false;
    }

    return (
      registration.status === "Approved" &&
      requiredRequirements.every(isRequirementCleared) &&
      requiredPayments.every(
        (requirement) =>
          requirement.status === "Paid" || requirement.status === "Waived",
      )
    );
  }).length;
  const openItems = requirementSummary.open + paymentSummary.open;
  const missingRequirements = requirementSummary.missing + paymentSummary.missing;
  const needsReview =
    requirementSummary.needsReview + paymentSummary.needsReview;
  const limited = registrations.length > 0 && totalTrackedRequirements === 0;
  const label = limited
    ? "Readiness limited"
    : openItems > 0
      ? `${missingRequirements} missing, ${needsReview} waiting review`
      : registrations.length > 0
        ? "Roster readiness clear"
        : "No rostered athletes";

  return {
    label,
    limited,
    missingRequirements,
    needsReview,
    openItems,
    readyAthletes,
    rosteredAthletes: registrations.length,
  };
}

export function getCoachTeamResponseSummary({
  attendanceEntries,
  event,
  rosteredAthleteIds,
  transportationEntries,
}: {
  attendanceEntries: AttendanceEntry[];
  event?: GameDayEvent;
  rosteredAthleteIds: string[];
  transportationEntries: TransportationEntry[];
}): CoachTeamResponseSummary {
  if (!event) {
    return {
      attendanceMissing: 0,
      attendanceSubmitted: 0,
      attendanceTotal: 0,
      transportationMissing: 0,
      transportationSubmitted: 0,
      transportationTotal: 0,
    };
  }

  const attendance = summarizeAttendanceEntries(event.id, attendanceEntries);
  const transportation = summarizeTransportationEntries(
    event.id,
    transportationEntries,
  );
  const rosteredCount = rosteredAthleteIds.length;
  const attendanceSubmitted = getRespondedAthleteCount(
    attendanceEntries,
    rosteredAthleteIds,
  );
  const transportationSubmitted = getRespondedAthleteCount(
    transportationEntries,
    rosteredAthleteIds,
  );

  return {
    attendanceMissing: Math.max(rosteredCount - attendanceSubmitted, 0),
    attendanceSubmitted,
    attendanceTotal: attendance.totalPlayers,
    transportationMissing: Math.max(rosteredCount - transportationSubmitted, 0),
    transportationSubmitted,
    transportationTotal: transportation.totalUpdates,
  };
}

export function getCoachTeamNextAction({
  eventHref,
  nextEvent,
  responseSummary,
  rosteredAthletes,
  teamHref,
}: CoachNextActionInput): CoachNextAction {
  if (rosteredAthletes === 0) {
    return {
      description: "Admin has not rostered eligible athletes for this team yet.",
      href: teamHref,
      label: "Wait for roster",
      tone: "waiting",
    };
  }

  if (!nextEvent) {
    return {
      description: "No published or canceled upcoming event is in this team scope.",
      href: teamHref,
      label: "Wait for schedule",
      tone: "waiting",
    };
  }

  if (nextEvent.status === "canceled") {
    return {
      description: "The next event is canceled, so active planning is closed.",
      href: eventHref,
      label: "View canceled event",
      tone: "waiting",
    };
  }

  if (
    responseSummary.attendanceMissing > 0 ||
    responseSummary.transportationMissing > 0
  ) {
    return {
      description: "Some rostered athletes have not submitted event responses yet.",
      href: eventHref,
      label: "Review event responses",
      tone: "attention",
    };
  }

  return {
    description: "Roster and event responses are available for review.",
    href: eventHref,
    label: "View event",
    tone: "ready",
  };
}
