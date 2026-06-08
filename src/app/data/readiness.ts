import {
  summarizeAttendanceEntries,
  type AttendanceEntry,
  type AttendanceStatus,
} from "./attendance";
import {
  isDocumentBlocked,
  isDocumentMissing,
  isDocumentNeedsReview,
  summarizeDocumentRequirements,
  type DocumentRequirement,
} from "./documents";
import {
  isPaymentBlocked,
  isPaymentMissing,
  isPaymentNeedsReview,
  summarizePaymentRequirements,
  type PaymentRequirement,
} from "./payments";
import {
  isRegistrationIncomplete,
  isRegistrationPending,
  isRequirementBlocked,
  isRequirementMissing,
  isRequirementNeedsReview,
  isRequirementOpen,
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
  source:
    | "Attendance"
    | "Documents"
    | "Payments"
    | "Transportation"
    | "Registration"
    | "Schedule";
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
  documentRequirements?: DocumentRequirement[];
  hasUpcomingEvent: boolean;
  paymentRequirements?: PaymentRequirement[];
  registrationStatus: RegistrationStatus;
  requirements: RegistrationRequirement[];
  transportationStatus?: TransportationStatus;
};

export type EventReadinessInput = {
  attendanceEntries: AttendanceEntry[];
  documentRequirements?: DocumentRequirement[];
  eventId: string;
  paymentRequirements?: PaymentRequirement[];
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
  documentRequirements = [],
  hasUpcomingEvent,
  paymentRequirements = [],
  registrationStatus,
  requirements,
  transportationStatus,
}: AthleteReadinessInput): ReadinessResult {
  const concerns: ReadinessConcern[] = [];
  const openRequirements = requirements.filter(isRequirementOpen);
  const blockedRequirements = requirements.filter(isRequirementBlocked);
  const missingRequirements = requirements.filter(isRequirementMissing);
  const reviewRequirements = requirements.filter(isRequirementNeedsReview);
  const blockedDocuments = documentRequirements.filter(isDocumentBlocked);
  const missingDocuments = documentRequirements.filter(isDocumentMissing);
  const reviewDocuments = documentRequirements.filter(isDocumentNeedsReview);
  const blockedPayments = paymentRequirements.filter(isPaymentBlocked);
  const missingPayments = paymentRequirements.filter(isPaymentMissing);
  const reviewPayments = paymentRequirements.filter(isPaymentNeedsReview);

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

  if (blockedRequirements.length > 0) {
    concerns.push({
      category: "Blocked",
      label: `Rejected ${blockedRequirements
        .map((requirement) => requirement.label)
        .join(", ")}.`,
      source: "Registration",
    });
  }

  if (blockedDocuments.length > 0) {
    concerns.push({
      category: "Blocked",
      label: `Rejected documents: ${blockedDocuments
        .map((requirement) => requirement.label)
        .join(", ")}.`,
      source: "Documents",
    });
  }

  if (missingDocuments.length > 0) {
    concerns.push({
      category: "Needs Attention",
      label: `Missing documents: ${missingDocuments
        .map((requirement) => requirement.label)
        .join(", ")}.`,
      source: "Documents",
    });
  }

  if (reviewDocuments.length > 0) {
    concerns.push({
      category: "Needs Attention",
      label: `Documents need review: ${reviewDocuments
        .map((requirement) => requirement.label)
        .join(", ")}.`,
      source: "Documents",
    });
  }

  if (blockedPayments.length > 0) {
    concerns.push({
      category: "Blocked",
      label: `Rejected payment: ${blockedPayments
        .map((requirement) => requirement.label)
        .join(", ")}.`,
      source: "Payments",
    });
  }

  if (missingPayments.length > 0) {
    concerns.push({
      category: "Needs Attention",
      label: `Missing payment: ${missingPayments
        .map((requirement) => requirement.label)
        .join(", ")}.`,
      source: "Payments",
    });
  }

  if (reviewPayments.length > 0) {
    concerns.push({
      category: "Needs Attention",
      label: `Payment needs review: ${reviewPayments
        .map((requirement) => requirement.label)
        .join(", ")}.`,
      source: "Payments",
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

  if (reviewRequirements.length > 0) {
    concerns.push({
      category: "Needs Attention",
      label: `Waiting for review: ${reviewRequirements
        .map((requirement) => requirement.label)
        .join(", ")}.`,
      source: "Registration",
    });
  }

  if (
    openRequirements.length === 0 &&
    registrationStatus !== "Approved" &&
    !isRegistrationPending(registrationStatus) &&
    !isRegistrationIncomplete(registrationStatus)
  ) {
    concerns.push({
      category: "Unknown",
      label: "Registration needs admin status.",
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
  documentRequirements = [],
  eventId,
  paymentRequirements = [],
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
  const documents = summarizeDocumentRequirements(documentRequirements);
  const payments = summarizePaymentRequirements(paymentRequirements);

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

  if (registration.missingRequirements > 0) {
    concerns.push({
      category: "Needs Attention",
      label: `${registration.missingRequirements} missing registration items.`,
      source: "Registration",
    });
  }

  if (registration.submittedRequirements > 0) {
    concerns.push({
      category: "Needs Attention",
      label: `${registration.submittedRequirements} registration items need review.`,
      source: "Registration",
    });
  }

  if (documents.missing > 0) {
    concerns.push({
      category: "Needs Attention",
      label: `${documents.missing} missing documents.`,
      source: "Documents",
    });
  }

  if (documents.needsReview > 0) {
    concerns.push({
      category: "Needs Attention",
      label: `${documents.needsReview} documents need review.`,
      source: "Documents",
    });
  }

  if (documents.blocked > 0) {
    concerns.push({
      category: "Blocked",
      label: `${documents.blocked} rejected documents.`,
      source: "Documents",
    });
  }

  if (payments.missing > 0) {
    concerns.push({
      category: "Needs Attention",
      label: `${payments.missing} missing payments.`,
      source: "Payments",
    });
  }

  if (payments.needsReview > 0) {
    concerns.push({
      category: "Needs Attention",
      label: `${payments.needsReview} payments need review.`,
      source: "Payments",
    });
  }

  if (payments.blocked > 0) {
    concerns.push({
      category: "Blocked",
      label: `${payments.blocked} rejected payments.`,
      source: "Payments",
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
