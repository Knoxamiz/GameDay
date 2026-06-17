import {
  isActiveCoachAssignment,
  type CoachAssignment,
} from "./coachAssignmentRecords";
import {
  eventHasTeamId,
  isPublishedEvent,
  isUpcomingEvent,
  type GameDayEvent,
} from "./events";
import {
  getRegistrationInviteAvailability,
  getRegistrationInviteStatus,
  type RegistrationInvite,
} from "./invites";
import { isPaymentOpen } from "./payments";
import type { OrganizationWorkspaceType } from "./organizations";
import {
  getRegistrationRosterStatus,
  isCoachVisibleRosterRegistration,
  isRegistrationPending,
  isRequirementOpen,
  type Registration,
} from "./registrations";
import { isActiveTeam, type Team } from "./teams";

export type AdminOperatingAction = {
  description: string;
  href: string;
  id:
    | "assign-coach"
    | "copy-join-link"
    | "create-event"
    | "create-invite"
    | "create-team"
    | "open-registration"
    | "review-readiness"
    | "review-registrations"
    | "roster-athletes"
    | "view-schedule";
  joinPath?: string;
  label: string;
};

export type AdminOperatingModel = {
  activeTeams: Team[];
  approvedNotRosteredRegistrations: Registration[];
  currentInvites: RegistrationInvite[];
  openInvites: RegistrationInvite[];
  pendingRegistrations: Registration[];
  readinessIssueCount: number;
  rosteredRegistrations: Registration[];
  rosteredTeamsWithoutEvents: Team[];
  stageDescription: string;
  stageLabel: string;
  teamsNeedingCoaches: Team[];
  nextAction: AdminOperatingAction;
};

type AdminOperatingModelInput = {
  coachAssignments: CoachAssignment[];
  events: GameDayEvent[];
  registrationInvites: RegistrationInvite[];
  registrations: Registration[];
  teams: Team[];
  workspaceType?: OrganizationWorkspaceType;
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

function getTeamsNeedingActiveCoachAssignments(
  teams: Team[],
  coachAssignments: CoachAssignment[],
) {
  const activeAssignmentTeamIds = new Set(
    coachAssignments
      .filter(isActiveCoachAssignment)
      .flatMap((assignment) => assignment.teamIds),
  );

  return teams.filter((team) => !activeAssignmentTeamIds.has(team.id));
}

function getReadinessIssueCount(registrations: Registration[]) {
  return registrations.reduce((total, registration) => {
    const openRequirements = registration.requirements.filter(isRequirementOpen)
      .length;
    const openPayments = (registration.paymentRequirements ?? []).filter(
      isPaymentOpen,
    ).length;

    return total + openRequirements + openPayments;
  }, 0);
}

function getRosteredTeamsWithoutPublishedEvents(
  activeTeams: Team[],
  registrations: Registration[],
  events: GameDayEvent[],
) {
  const rosteredTeamIds = new Set(
    registrations
      .filter(isCoachVisibleRosterRegistration)
      .map((registration) => registration.teamId),
  );

  return activeTeams.filter((team) => {
    if (!rosteredTeamIds.has(team.id)) {
      return false;
    }

    return !events.some(
      (event) =>
        isPublishedEvent(event) &&
        isUpcomingEvent(event) &&
        eventHasTeamId(event, team.id),
    );
  });
}

function getStageLabel({
  activeTeams,
  currentInvites,
  openInvites,
  pendingRegistrations,
  rosteredRegistrations,
  workspaceType,
}: {
  activeTeams: Team[];
  currentInvites: RegistrationInvite[];
  openInvites: RegistrationInvite[];
  pendingRegistrations: Registration[];
  rosteredRegistrations: Registration[];
  workspaceType?: OrganizationWorkspaceType;
}) {
  const isSingleTeamWorkspace = workspaceType === "single_team";

  if (activeTeams.length === 0) {
    return {
      description: isSingleTeamWorkspace
        ? "Create the team record for this Team Builder workspace."
        : "Create the first active team or age group.",
      label: isSingleTeamWorkspace ? "Team Builder setup" : "Workspace setup",
    };
  }

  if (currentInvites.length === 0 || openInvites.length === 0) {
    return {
      description: isSingleTeamWorkspace
        ? "Create and open the team registration link for families."
        : "Configure registration access for families.",
      label: isSingleTeamWorkspace
        ? "Team registration setup"
        : "Registration setup",
    };
  }

  if (pendingRegistrations.length > 0) {
    return {
      description: "Parents are submitting registrations for admin review.",
      label: "Registration review",
    };
  }

  if (rosteredRegistrations.length === 0) {
    return {
      description: isSingleTeamWorkspace
        ? "The team link is open and waiting for rostered players."
        : "Registration is open and waiting for rostered athletes.",
      label: isSingleTeamWorkspace ? "Player intake" : "Registration intake",
    };
  }

  return {
    description: isSingleTeamWorkspace
      ? "Team roster and schedule are ready for daily operations."
      : "Teams, roster, and schedule are ready for daily operations.",
    label: isSingleTeamWorkspace ? "Team operations" : "Active operations",
  };
}

export function buildAdminOperatingModel({
  coachAssignments,
  events,
  registrationInvites,
  registrations,
  teams,
  workspaceType,
}: AdminOperatingModelInput): AdminOperatingModel {
  const isSingleTeamWorkspace = workspaceType === "single_team";
  const activeTeams = teams.filter(isActiveTeam);
  const activeTeamIdSet = new Set(activeTeams.map((team) => team.id));
  const currentInvites = registrationInvites.filter(
    (invite) => getRegistrationInviteStatus(invite) !== "archived",
  );
  const openInvites = currentInvites.filter((invite) =>
    getRegistrationInviteAvailability(invite, {
      registrationCount: getInviteRegistrationCount(invite, registrations),
      scopeIsValid: activeTeamIdSet.has(invite.teamId),
    }).available,
  );
  const pendingRegistrations = registrations.filter((registration) =>
    isRegistrationPending(registration.status),
  );
  const approvedNotRosteredRegistrations = registrations.filter(
    (registration) =>
      registration.status === "Approved" &&
      getRegistrationRosterStatus(registration) !== "rostered",
  );
  const rosteredRegistrations = registrations.filter(
    isCoachVisibleRosterRegistration,
  );
  const teamsNeedingCoaches = isSingleTeamWorkspace
    ? []
    : getTeamsNeedingActiveCoachAssignments(activeTeams, coachAssignments);
  const rosteredTeamsWithoutEvents = getRosteredTeamsWithoutPublishedEvents(
    activeTeams,
    registrations,
    events,
  );
  const readinessIssueCount = getReadinessIssueCount(registrations);
  const stage = getStageLabel({
    activeTeams,
    currentInvites,
    openInvites,
    pendingRegistrations,
    rosteredRegistrations,
    workspaceType,
  });
  const joinPath = openInvites[0]?.inviteCode
    ? `/join/${openInvites[0].inviteCode}`
    : undefined;
  let nextAction: AdminOperatingAction = {
    description: "Review the schedule and keep operating the season.",
    href: "/admin/schedule",
    id: "view-schedule",
    label: "View schedule",
  };

  if (activeTeams.length === 0) {
    nextAction = {
      description: isSingleTeamWorkspace
        ? "Create the active team for this Team Builder workspace."
        : "Start by creating the first active team or age group.",
      href: "/admin/teams#create-team",
      id: "create-team",
      label: "Create team",
    };
  } else if (currentInvites.length === 0) {
    nextAction = {
      description: isSingleTeamWorkspace
        ? "Create the real join link parents will use to register players."
        : "Create the invite parents will use to register athletes.",
      href: "/admin/registrations",
      id: "create-invite",
      label: isSingleTeamWorkspace
        ? "Create registration link"
        : "Create invite",
    };
  } else if (openInvites.length === 0) {
    nextAction = {
      description: isSingleTeamWorkspace
        ? "Open the team registration link so parents can register."
        : "Open a valid invite so parents can register.",
      href: "/admin/registrations",
      id: "open-registration",
      label: isSingleTeamWorkspace
        ? "Open team registration"
        : "Open registration",
    };
  } else if (registrations.length === 0) {
    nextAction = {
      description: isSingleTeamWorkspace
        ? "Share the open team join link with families."
        : "Share the open invite link with families.",
      href: "/admin/registrations",
      id: "copy-join-link",
      joinPath,
      label: isSingleTeamWorkspace ? "Copy team join link" : "Copy join link",
    };
  } else if (pendingRegistrations.length > 0) {
    nextAction = {
      description: "Review submitted registrations and resolve open items.",
      href: "/admin/registrations#review",
      id: "review-registrations",
      label: "Review registrations",
    };
  } else if (approvedNotRosteredRegistrations.length > 0) {
    nextAction = {
      description: "Move approved athletes onto the active roster.",
      href: "/admin/registrations#roster",
      id: "roster-athletes",
      label: "Roster athletes",
    };
  } else if (teamsNeedingCoaches.length > 0) {
    nextAction = {
      description: "Give the team operator access by assigning a coach.",
      href: "/admin/setup#coach-assignments",
      id: "assign-coach",
      label: "Assign coach",
    };
  } else if (rosteredTeamsWithoutEvents.length > 0) {
    nextAction = {
      description: "Create the first published event for a rostered team.",
      href: "/admin/schedule?action=create-event#create-event",
      id: "create-event",
      label: "Create event",
    };
  } else if (readinessIssueCount > 0) {
    nextAction = {
      description: "Resolve open document, payment, or requirement items.",
      href: "/admin/registrations#readiness",
      id: "review-readiness",
      label: "Review readiness",
    };
  }

  return {
    activeTeams,
    approvedNotRosteredRegistrations,
    currentInvites,
    openInvites,
    pendingRegistrations,
    readinessIssueCount,
    rosteredRegistrations,
    rosteredTeamsWithoutEvents,
    stageDescription: stage.description,
    stageLabel: stage.label,
    teamsNeedingCoaches,
    nextAction,
  };
}
