import type { AuthSession, AuthSessionSource } from "../infrastructure/auth";
import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import { FirebaseAdminAuthProvider } from "../infrastructure/firebaseAuth";
import {
  createFirestoreRepositories,
  runFirestoreTransaction,
} from "../infrastructure/firebaseRepositories";
import {
  isActiveCoachAssignment,
  type CoachAssignment,
} from "./coachAssignmentRecords";
import type { Coach } from "./coaches";
import {
  createLiveRecordId,
  normalizeDocumentIdSegment,
  slugifyIdentityPart,
} from "./liveIdentity";
import type { OrganizationMembership } from "./organizationMemberships";
import type { Organization } from "./organizations";
import type { Team } from "./teams";

export type CoachWorkspaceProvisioningPayload = {
  division: string;
  season: string;
  teamName: string;
};

export type CoachWorkspaceProvisioningResult = {
  id: string;
  message: string;
  organizationId: string;
  teamId: string;
};

type CoachWorkspaceProvisioningOptions = {
  sessionSource: AuthSessionSource;
};

export class CoachWorkspaceProvisioningError extends Error {
  constructor(
    readonly reason: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "CoachWorkspaceProvisioningError";
  }
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function createProvisioningError(
  reason: string,
  message: string,
  status = 400,
): never {
  throw new CoachWorkspaceProvisioningError(reason, message, status);
}

function getNameParts(name: string) {
  const [firstName = name, ...lastNameParts] = name.split(/\s+/);

  return {
    firstName,
    lastName: lastNameParts.join(" "),
  };
}

function getCoachIdFromSession(session: AuthSession) {
  const claimCoachId = normalizeDocumentIdSegment(session.claims.coachId ?? "");
  const uidCoachId = normalizeDocumentIdSegment(session.user.id);

  return claimCoachId || `coach-${uidCoachId}`;
}

function getMembershipId(organizationId: string, uid: string) {
  const uidSegment = normalizeDocumentIdSegment(uid);

  if (!uidSegment) {
    createProvisioningError(
      "invalid-membership-uid",
      "A valid signed-in account is required.",
      400,
    );
  }

  return `organization-membership-${organizationId}-${uidSegment}`;
}

function getCoachAssignmentId(organizationId: string, coachId: string) {
  return `coach-assignment-${normalizeDocumentIdSegment(
    organizationId,
  )}-${normalizeDocumentIdSegment(coachId)}`;
}

async function requireGameDaySession(source: AuthSessionSource) {
  if (!getFirebaseAdminConfig()) {
    createProvisioningError(
      "firebase-unavailable",
      "Coach team creation is not available until Firebase is configured.",
      503,
    );
  }

  const authProvider = new FirebaseAdminAuthProvider();
  const session = await authProvider.verifySession(source);

  if (!session) {
    createProvisioningError(
      "session-required",
      "Please sign in before creating a team workspace.",
      403,
    );
  }

  return session;
}

async function getAvailableWorkspaceId(name: string) {
  const repositories = createFirestoreRepositories();
  const baseOrganizationId = slugifyIdentityPart(name);

  if (!baseOrganizationId) {
    createProvisioningError(
      "invalid-team-name",
      "Team name must include letters or numbers.",
      400,
    );
  }

  for (let suffix = 0; suffix < 50; suffix += 1) {
    const organizationId =
      suffix === 0 ? baseOrganizationId : `${baseOrganizationId}-${suffix + 1}`;
    const existingOrganization =
      await repositories.organizations.getById(organizationId);

    if (!existingOrganization) {
      return organizationId;
    }
  }

  createProvisioningError(
    "workspace-id-unavailable",
    "Choose a more specific team name.",
    409,
  );
}

export async function createCoachSingleTeamWorkspace(
  payload: CoachWorkspaceProvisioningPayload,
  options: CoachWorkspaceProvisioningOptions,
): Promise<CoachWorkspaceProvisioningResult> {
  const session = await requireGameDaySession(options.sessionSource);
  const teamName = normalizeText(payload.teamName);
  const division = normalizeText(payload.division);
  const season = normalizeText(payload.season);
  const email = normalizeEmail(session.user.email);
  const coachName = normalizeText(session.user.displayName) || email || "Coach";

  if (!teamName || !division || !season) {
    createProvisioningError(
      "invalid-single-team-workspace",
      "Team name, division, and season are required.",
      400,
    );
  }

  if (!email) {
    createProvisioningError(
      "coach-email-required",
      "A coach login email is required before creating a team workspace.",
      400,
    );
  }

  const organizationId = await getAvailableWorkspaceId(teamName);
  const now = new Date().toISOString();
  const sessionCoachId = getCoachIdFromSession(session);
  const teamId = createLiveRecordId("team", [organizationId, teamName, season]);
  const membershipId = getMembershipId(organizationId, session.user.id);
  const { firstName, lastName } = getNameParts(coachName);

  const result = await runFirestoreTransaction(async (transaction) => {
    const [
      existingOrganization,
      existingMembership,
      existingTeam,
      coachesByEmail,
      coachesByUid,
      sessionCoach,
      activeCoachIdAssignments,
      activeUidAssignments,
      activeEmailAssignments,
    ] = await Promise.all([
      transaction.get<Organization>("organizations", organizationId),
      transaction.get<OrganizationMembership>(
        "organizationMemberships",
        membershipId,
      ),
      transaction.get<Team>("teams", teamId),
      transaction.list<Coach>("coaches", {
        limit: 2,
        scope: { email },
      }),
      transaction.list<Coach>("coaches", {
        limit: 2,
        scope: { uid: session.user.id },
      }),
      transaction.get<Coach>("coaches", sessionCoachId),
      transaction.list<CoachAssignment>("coachAssignments", {
        scope: { coachId: sessionCoachId },
      }),
      transaction.list<CoachAssignment>("coachAssignments", {
        scope: { uid: session.user.id },
      }),
      transaction.list<CoachAssignment>("coachAssignments", {
        scope: { email },
      }),
    ]);

    if (existingOrganization || existingMembership || existingTeam) {
      createProvisioningError(
        "workspace-id-unavailable",
        "Choose a more specific team name.",
        409,
      );
    }

    const activeAssignments = [
      ...activeCoachIdAssignments,
      ...activeUidAssignments,
      ...activeEmailAssignments,
    ].filter(isActiveCoachAssignment);

    if (activeAssignments.length > 0) {
      createProvisioningError(
        "coach-active-assignment-exists",
        "This coach account already has active team access.",
        409,
      );
    }

    if (coachesByEmail.length > 1 || coachesByUid.length > 1) {
      createProvisioningError(
        "coach-identity-conflict",
        "Multiple coach profiles match this account. Ask support to merge them before creating a new team.",
        409,
      );
    }

    const currentCoach =
      coachesByUid[0] ?? coachesByEmail[0] ?? sessionCoach ?? null;
    const coachId = currentCoach?.id ?? sessionCoachId;

    if (
      coachesByEmail[0] &&
      coachesByUid[0] &&
      coachesByEmail[0].id !== coachesByUid[0].id
    ) {
      createProvisioningError(
        "coach-identity-conflict",
        "This coach email and login belong to different coach profiles.",
        409,
      );
    }

    const organization: Organization = {
      billingOwnerUid: session.user.id,
      billingStatus: "active",
      createdAt: now,
      createdByUid: session.user.id,
      id: organizationId,
      name: teamName,
      organizationId,
      ownerUid: session.user.id,
      ownerUids: [session.user.id],
      planTier: "starter",
      slug: slugifyIdentityPart(organizationId),
      status: {
        activeTeams: 1,
        coaches: 1,
        registeredPlayers: 0,
        upcomingEvents: 0,
      },
      updatedAt: now,
      workspaceType: "single_team",
    };
    const team: Team = {
      ageGroup: division,
      athleteIds: [],
      coachIds: [coachId],
      createdAt: now,
      createdByUid: session.user.id,
      division,
      eventIds: [],
      id: teamId,
      label: division,
      name: teamName,
      organizationId,
      playerCount: 0,
      rosterPreviewIds: [],
      season,
      status: "active",
      teamId,
      updatedAt: now,
    };
    const coach: Coach = {
      coachId,
      createdAt: currentCoach?.createdAt ?? now,
      createdByUid: currentCoach?.createdByUid ?? session.user.id,
      email,
      firstName: currentCoach?.firstName || firstName,
      id: coachId,
      lastName: currentCoach?.lastName || lastName,
      name: currentCoach?.name || coachName,
      phone: currentCoach?.phone ?? "",
      role: "coach",
      updatedAt: now,
      uid: session.user.id,
    };
    const assignment: CoachAssignment = {
      coachId,
      createdAt: now,
      createdByUid: session.user.id,
      email,
      id: getCoachAssignmentId(organizationId, coachId),
      organizationId,
      role: "coach",
      status: "active",
      teamIds: [teamId],
      uid: session.user.id,
      updatedAt: now,
    };
    const membership: OrganizationMembership = {
      acceptedAt: now,
      createdAt: now,
      createdByUid: session.user.id,
      displayName: coach.name,
      email,
      id: membershipId,
      organizationId,
      role: "owner",
      status: "active",
      title: "Team Owner / Coach",
      uid: session.user.id,
      updatedAt: now,
    };

    transaction.create("organizations", organization.id, organization);
    transaction.create("teams", team.id, team);

    if (currentCoach) {
      transaction.set("coaches", coach.id, coach);
    } else {
      transaction.create("coaches", coach.id, coach);
    }

    transaction.create("coachAssignments", assignment.id, assignment);
    transaction.create("organizationMemberships", membership.id, membership);

    return { organization, team };
  });

  console.info("Coach single-team workspace provisioned.", {
    organizationId: result.organization.id,
    teamId: result.team.id,
    uid: session.user.id,
    workspaceType: result.organization.workspaceType,
  });

  return {
    id: result.organization.id,
    message: `Team workspace created: ${result.team.name}`,
    organizationId: result.organization.id,
    teamId: result.team.id,
  };
}
