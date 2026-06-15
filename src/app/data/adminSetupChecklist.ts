import {
  isActiveCoachAssignment,
  type CoachAssignment,
} from "./coachAssignmentRecords";
import { isPublishedEvent, type GameDayEvent } from "./events";
import {
  getRegistrationInviteAvailability,
  getRegistrationInviteStatus,
  type RegistrationInvite,
} from "./invites";
import type { Organization } from "./organizations";
import {
  isCoachVisibleRosterRegistration,
  isRegistrationPending,
  type Registration,
} from "./registrations";
import { isActiveTeam, type Team } from "./teams";

export type AdminSetupChecklistStepStatus =
  | "complete"
  | "next"
  | "optional"
  | "waiting";

export type AdminSetupChecklistStep = {
  actionHref?: string;
  actionLabel?: string;
  count: number;
  description: string;
  id:
    | "organization"
    | "team"
    | "invite"
    | "registration-open"
    | "coach"
    | "event"
    | "review"
    | "roster";
  joinPath?: string;
  label: string;
  required: boolean;
  status: AdminSetupChecklistStepStatus;
};

export type AdminSetupChecklistModel = {
  activeOrganizationId?: string;
  activeOrganizationName?: string;
  completedRequiredSteps: number;
  nextRequiredStep?: AdminSetupChecklistStep;
  requiredStepCount: number;
  steps: AdminSetupChecklistStep[];
};

type AdminSetupChecklistInput = {
  activeOrganization?: Organization;
  coachAssignments: CoachAssignment[];
  events: GameDayEvent[];
  registrationInvites: RegistrationInvite[];
  registrations: Registration[];
  teams: Team[];
};

function getInviteRegistrationCount(
  invite: RegistrationInvite,
  registrations: Registration[],
) {
  return new Set(
    registrations
      .filter(
        (registration) =>
          registration.organizationId === invite.organizationId &&
          (registration.registrationInviteId === invite.id ||
            registration.inviteCode === invite.inviteCode),
      )
      .map((registration) => registration.id),
  ).size;
}

export function buildAdminSetupChecklist({
  activeOrganization,
  coachAssignments,
  events,
  registrationInvites,
  registrations,
  teams,
}: AdminSetupChecklistInput): AdminSetupChecklistModel {
  const organizationId = activeOrganization?.id;
  const organizationTeams = organizationId
    ? teams.filter((team) => team.organizationId === organizationId)
    : [];
  const activeTeams = organizationTeams.filter(isActiveTeam);
  const activeTeamIdSet = new Set(activeTeams.map((team) => team.id));
  const organizationInvites = organizationId
    ? registrationInvites.filter(
        (invite) => invite.organizationId === organizationId,
      )
    : [];
  const currentInvites = organizationInvites.filter(
    (invite) => getRegistrationInviteStatus(invite) !== "archived",
  );
  const availableInvites = currentInvites.filter((invite) =>
    getRegistrationInviteAvailability(invite, {
      registrationCount: getInviteRegistrationCount(invite, registrations),
      scopeIsValid: activeTeamIdSet.has(invite.teamId),
    }).available,
  );
  const activeCoachAssignments = organizationId
    ? coachAssignments.filter(
        (assignment) =>
          assignment.organizationId === organizationId &&
          isActiveCoachAssignment(assignment) &&
          assignment.teamIds.some((teamId) => activeTeamIdSet.has(teamId)),
      )
    : [];
  const publishedEvents = organizationId
    ? events.filter(
        (event) =>
          event.organizationId === organizationId && isPublishedEvent(event),
      )
    : [];
  const pendingRegistrations = organizationId
    ? registrations.filter(
        (registration) =>
          registration.organizationId === organizationId &&
          isRegistrationPending(registration.status),
      )
    : [];
  const rosteredRegistrations = organizationId
    ? registrations.filter(
        (registration) =>
          registration.organizationId === organizationId &&
          isCoachVisibleRosterRegistration(registration),
      )
    : [];
  const hasOrganization = Boolean(activeOrganization);
  const hasActiveTeam = activeTeams.length > 0;
  const hasInvite = currentInvites.length > 0;
  const hasOpenInvite = availableInvites.length > 0;
  const joinPath = hasOpenInvite
    ? `/join/${availableInvites[0].inviteCode}`
    : undefined;
  const steps: AdminSetupChecklistStep[] = [
    {
      actionHref: "/admin/setup#organization",
      actionLabel: hasOrganization ? "View organization" : "Create organization",
      count: hasOrganization ? 1 : 0,
      description: hasOrganization
        ? `${activeOrganization?.name} is the active organization.`
        : "Create the organization record and owner membership first.",
      id: "organization",
      label: "Organization",
      required: true,
      status: hasOrganization ? "complete" : "next",
    },
    {
      actionHref: "/admin/setup#team",
      actionLabel: hasActiveTeam ? "Manage teams" : "Create active team",
      count: activeTeams.length,
      description: hasActiveTeam
        ? `${activeTeams.length} active team${activeTeams.length === 1 ? "" : "s"} available.`
        : hasOrganization
          ? "Create an active team before opening registration."
          : "An organization is required before teams can be created.",
      id: "team",
      label: "Active team",
      required: true,
      status: hasActiveTeam ? "complete" : hasOrganization ? "next" : "waiting",
    },
    {
      actionHref: "/admin/setup#registration-invites",
      actionLabel: hasInvite ? "Manage invites" : "Create invite",
      count: currentInvites.length,
      description: hasInvite
        ? `${currentInvites.length} current registration invite${currentInvites.length === 1 ? "" : "s"} exist.`
        : hasActiveTeam
          ? "Create a registration invite for an active team."
          : "An active team is required before creating an invite.",
      id: "invite",
      label: "Registration invite",
      required: true,
      status: hasInvite ? "complete" : hasActiveTeam ? "next" : "waiting",
    },
    {
      actionHref: "/admin/setup#registration-invites",
      actionLabel: hasOpenInvite ? "Manage open invite" : "Open registration",
      count: availableInvites.length,
      description: hasOpenInvite
        ? "A date-valid, capacity-available invite is open for registration."
        : hasInvite
          ? "Open an invite with a valid schedule and available capacity."
          : "Create an invite before opening registration.",
      id: "registration-open",
      joinPath,
      label: "Registration open",
      required: true,
      status: hasOpenInvite ? "complete" : hasInvite ? "next" : "waiting",
    },
    {
      actionHref: "/admin/setup#coach-assignments",
      actionLabel: "Manage coach assignments",
      count: activeCoachAssignments.length,
      description:
        activeCoachAssignments.length > 0
          ? `${activeCoachAssignments.length} active assignment${activeCoachAssignments.length === 1 ? "" : "s"} cover active teams.`
          : "Optional: assign a coach when the team is ready for operations.",
      id: "coach",
      label: "Coach assignment",
      required: false,
      status: activeCoachAssignments.length > 0 ? "complete" : "optional",
    },
    {
      actionHref: "/events",
      actionLabel: publishedEvents.length > 0 ? "View schedule" : "Create event",
      count: publishedEvents.length,
      description:
        publishedEvents.length > 0
          ? `${publishedEvents.length} published event${publishedEvents.length === 1 ? "" : "s"} exist.`
          : "Optional: create and publish the first team event.",
      id: "event",
      label: "Published event",
      required: false,
      status: publishedEvents.length > 0 ? "complete" : "optional",
    },
    {
      actionHref: "/admin/registrations",
      actionLabel: "Review registrations",
      count: pendingRegistrations.length,
      description:
        pendingRegistrations.length > 0
          ? `${pendingRegistrations.length} submitted registration${pendingRegistrations.length === 1 ? " needs" : "s need"} review.`
          : hasOpenInvite
            ? "Waiting for parent registrations through the open invite."
            : "Registration review begins after an invite is opened and submitted.",
      id: "review",
      label: "Registration review",
      required: false,
      status: pendingRegistrations.length > 0 ? "next" : "waiting",
    },
    {
      actionHref: "/admin/registrations",
      actionLabel: "Manage roster",
      count: rosteredRegistrations.length,
      description:
        rosteredRegistrations.length > 0
          ? `${rosteredRegistrations.length} active roster registration${rosteredRegistrations.length === 1 ? "" : "s"}.`
          : registrations.length > 0
            ? "Approve and roster eligible registrations when review is complete."
            : "The active roster appears after registrations are approved and rostered.",
      id: "roster",
      label: "Active roster",
      required: false,
      status: rosteredRegistrations.length > 0 ? "complete" : "waiting",
    },
  ];
  const requiredSteps = steps.filter((step) => step.required);
  const nextRequiredStep = requiredSteps.find(
    (step) => step.status === "next",
  );

  return {
    activeOrganizationId: organizationId,
    activeOrganizationName: activeOrganization?.name,
    completedRequiredSteps: requiredSteps.filter(
      (step) => step.status === "complete",
    ).length,
    nextRequiredStep,
    requiredStepCount: requiredSteps.length,
    steps,
  };
}
