import type { AttendanceStatus } from "./attendance";
import type { GameDayEventStatus } from "./events";
import {
  isPaymentBlocked,
  isPaymentCleared,
  isPaymentMissing,
  isPaymentNeedsReview,
  summarizePaymentRequirements,
  type PaymentRequirement,
} from "./payments";
import {
  isRegistrationIncomplete,
  isRegistrationPending,
  isRegistrationTerminal,
  isRequirementBlocked,
  isRequirementCleared,
  isRequirementMissing,
  isRequirementNeedsReview,
  summarizeRegistrationRequirements,
  type RegistrationRequirement,
  type RegistrationStatus,
  type RosterStatus,
} from "./registrations";
import type { TransportationStatus } from "./transportation";

export type ParentNextActionTone =
  | "attention"
  | "blocked"
  | "ready"
  | "waiting";

export type ParentNextAction = {
  description: string;
  href?: string;
  label: string;
  tone: ParentNextActionTone;
};

export type ParentRequirementSummary = {
  complete: number;
  documentsBlocked: number;
  documentsMissing: number;
  documentsNeedsReview: number;
  label: string;
  open: number;
  paymentsBlocked: number;
  paymentsMissing: number;
  paymentsNeedsReview: number;
  total: number;
};

type ParentNextActionInput = {
  attendanceStatus?: AttendanceStatus;
  athleteHref: string;
  eventHref?: string;
  hasPendingLifecycleRequest: boolean;
  hasRegistration: boolean;
  nextEvent?: {
    status: GameDayEventStatus;
  };
  paymentRequirements: PaymentRequirement[];
  registrationStatus: RegistrationStatus;
  requirements: RegistrationRequirement[];
  rosterStatus: RosterStatus;
  transportationStatus?: TransportationStatus;
};

function getRequiredRegistrationRequirements(
  requirements: RegistrationRequirement[],
) {
  return requirements.filter((requirement) => requirement.required !== false);
}

function getRequiredPaymentRequirements(
  paymentRequirements: PaymentRequirement[],
) {
  return paymentRequirements.filter((requirement) => requirement.required !== false);
}

export function getParentRegistrationStatusLabel(status: RegistrationStatus) {
  if (status === "Pending") {
    return "Registration submitted";
  }

  if (status === "Pending Review") {
    return "Awaiting review";
  }

  if (status === "Incomplete") {
    return "Needs updates";
  }

  return status;
}

export function getParentRosterStatusLabel(status: RosterStatus) {
  if (status === "rostered") {
    return "Rostered";
  }

  if (status === "inactive") {
    return "Inactive";
  }

  return "Not rostered yet";
}

export function getParentRequirementSummary(
  requirements: RegistrationRequirement[],
  paymentRequirements: PaymentRequirement[],
  registrationStatus: RegistrationStatus,
  rosterStatus: RosterStatus,
  hasUpcomingEvent: boolean,
): ParentRequirementSummary {
  const requiredRequirements = getRequiredRegistrationRequirements(requirements);
  const requiredPayments = getRequiredPaymentRequirements(paymentRequirements);
  const requirementSummary =
    summarizeRegistrationRequirements(requiredRequirements);
  const paymentSummary = summarizePaymentRequirements(requiredPayments);
  const complete =
    requiredRequirements.filter(isRequirementCleared).length +
    requiredPayments.filter(isPaymentCleared).length;
  const total = requiredRequirements.length + requiredPayments.length;
  const open = requirementSummary.open + paymentSummary.open;
  const documentsBlocked = requiredRequirements.filter(isRequirementBlocked).length;
  const documentsMissing = requiredRequirements.filter(isRequirementMissing).length;
  const documentsNeedsReview = requiredRequirements.filter(
    isRequirementNeedsReview,
  ).length;
  const paymentsBlocked = requiredPayments.filter(isPaymentBlocked).length;
  const paymentsMissing = requiredPayments.filter(isPaymentMissing).length;
  const paymentsNeedsReview = requiredPayments.filter(isPaymentNeedsReview).length;
  let label = "No requirements listed";

  if (documentsBlocked + paymentsBlocked > 0) {
    label = "Needs fix";
  } else if (documentsMissing > 0) {
    label = "Documents missing";
  } else if (paymentsMissing > 0) {
    label = "Payment pending";
  } else if (documentsNeedsReview + paymentsNeedsReview > 0) {
    label = "Ready for review";
  } else if (total > 0 && registrationStatus === "Approved") {
    label =
      rosterStatus === "rostered" && hasUpcomingEvent
        ? "Ready for event"
        : "Requirements complete";
  } else if (total > 0) {
    label = isRegistrationPending(registrationStatus)
      ? "Ready for review"
      : "Requirements complete";
  }

  return {
    complete,
    documentsBlocked,
    documentsMissing,
    documentsNeedsReview,
    label,
    open,
    paymentsBlocked,
    paymentsMissing,
    paymentsNeedsReview,
    total,
  };
}

export function getParentRequirementCountLabel(
  summary: ParentRequirementSummary,
) {
  if (summary.total === 0) {
    return "No required items listed";
  }

  return `${summary.complete} of ${summary.total} requirements complete`;
}

export function getParentNextAction({
  attendanceStatus = "Unknown",
  athleteHref,
  eventHref,
  hasPendingLifecycleRequest,
  hasRegistration,
  nextEvent,
  paymentRequirements,
  registrationStatus,
  requirements,
  rosterStatus,
  transportationStatus = "Unknown",
}: ParentNextActionInput): ParentNextAction {
  const summary = getParentRequirementSummary(
    requirements,
    paymentRequirements,
    registrationStatus,
    rosterStatus,
    Boolean(nextEvent),
  );

  if (!hasRegistration) {
    return {
      description: "This athlete is missing a linked registration record.",
      label: "Registration unavailable",
      tone: "blocked",
    };
  }

  if (isRegistrationTerminal(registrationStatus)) {
    return {
      description: "This registration is closed and has no parent action available.",
      label: `${registrationStatus} registration`,
      tone: "blocked",
    };
  }

  if (registrationStatus === "Waitlisted") {
    return {
      description: "The athlete is waitlisted. Event actions are not available yet.",
      label: "Waitlisted",
      tone: "waiting",
    };
  }

  if (hasPendingLifecycleRequest) {
    return {
      description: "Your request is waiting for admin review.",
      href: athleteHref,
      label: "Request pending",
      tone: "waiting",
    };
  }

  if (summary.documentsBlocked > 0) {
    return {
      description: "A submitted document needs to be fixed before review can continue.",
      href: athleteHref,
      label: "Resubmit required document",
      tone: "blocked",
    };
  }

  if (summary.documentsMissing > 0) {
    return {
      description: "Upload the required document from the athlete details page.",
      href: athleteHref,
      label: "Upload required document",
      tone: "attention",
    };
  }

  if (summary.paymentsBlocked > 0) {
    return {
      description: "The recorded payment needs attention before review can continue.",
      href: athleteHref,
      label: "Review payment status",
      tone: "blocked",
    };
  }

  if (summary.paymentsMissing > 0) {
    return {
      description: "Record the required payment status from the athlete details page.",
      href: athleteHref,
      label: "Complete payment step",
      tone: "attention",
    };
  }

  if (summary.documentsNeedsReview + summary.paymentsNeedsReview > 0) {
    return {
      description: "Submitted items are waiting for admin review.",
      href: athleteHref,
      label: "View submitted items",
      tone: "waiting",
    };
  }

  if (isRegistrationIncomplete(registrationStatus)) {
    return {
      description: "Open athlete details to review what needs to be corrected.",
      href: athleteHref,
      label: "Review registration updates",
      tone: "attention",
    };
  }

  if (isRegistrationPending(registrationStatus)) {
    return {
      description: "Registration is submitted and waiting for admin review.",
      label: "Wait for review",
      tone: "waiting",
    };
  }

  if (registrationStatus === "Approved" && rosterStatus !== "rostered") {
    return {
      description: "The registration is approved. Admin still needs to roster the athlete.",
      label: "Wait for roster assignment",
      tone: "waiting",
    };
  }

  if (!nextEvent) {
    return {
      description: "There are no upcoming scoped events for this athlete yet.",
      label: "Wait for schedule",
      tone: "waiting",
    };
  }

  if (nextEvent.status === "canceled") {
    return {
      description: "This event is canceled. Attendance and transportation updates are closed.",
      href: eventHref,
      label: "View canceled event",
      tone: "waiting",
    };
  }

  if (attendanceStatus === "Unknown" || transportationStatus === "Unknown") {
    return {
      description: "Set attendance and transportation for the next event.",
      href: eventHref,
      label: "Set event plan",
      tone: "attention",
    };
  }

  return {
    description: "Registration, roster, attendance, and transportation are ready.",
    href: eventHref,
    label: "View next event",
    tone: "ready",
  };
}
