import type { AuthSessionSource } from "../infrastructure/auth";
import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import { runFirestoreTransaction } from "../infrastructure/firebaseRepositories";
import type { Athlete } from "./athletes";
import {
  canManageOrganization,
  getAdminActor,
  resolveAdminOrganizationScope,
  verifyAdminAccessSession,
} from "./adminOrganizationScope.server";
import { createLiveRecordId } from "./liveIdentity";
import type { Organization } from "./organizations";
import type { ParentGuardian } from "./parents";
import type { Registration } from "./registrations";
import { isActiveTeam, type Team } from "./teams";

export type AdminTeamMemberPayload =
  | {
      actionType: "player-add";
      athleteFirstName: string;
      athleteLastName: string;
      dateOfBirth?: string;
      grade?: string;
      jerseySize?: string;
      organizationId: string;
      parentEmail?: string;
      parentName?: string;
      parentPhone?: string;
      school?: string;
      teamId: string;
    }
  | {
      actionType: "players-bulk-add";
      organizationId: string;
      players: AdminTeamMemberPlayerInput[];
      teamId: string;
    }
  | {
      actionType: "player-remove";
      organizationId: string;
      registrationId: string;
      teamId: string;
    };

export type AdminTeamMemberPlayerInput = {
  athleteFirstName: string;
  athleteLastName: string;
  dateOfBirth?: string;
  grade?: string;
  jerseySize?: string;
  parentEmail?: string;
  parentName?: string;
  parentPhone?: string;
  school?: string;
};

export type AdminTeamMemberResult = {
  athleteId?: string;
  id: string;
  message: string;
  parentId?: string;
  registrationId?: string;
  source: "firestore";
};

type AdminTeamMemberWriteOptions = {
  activeOrganizationId?: string;
  sessionSource: AuthSessionSource;
};

export class AdminTeamMemberError extends Error {
  constructor(
    readonly reason: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "AdminTeamMemberError";
  }
}

function createTeamMemberError(
  reason: string,
  message: string,
  status = 400,
): never {
  throw new AdminTeamMemberError(reason, message, status);
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNamePart(value: unknown) {
  return normalizeText(value).replace(/\s+/g, " ");
}

function normalizeEmail(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function uniqueStringList(values: (string | undefined)[]) {
  return [...new Set(values.map(normalizeText).filter(Boolean))];
}

function removeStringValue(values: string[] | undefined, removedValue: string) {
  return uniqueStringList(
    (Array.isArray(values) ? values : []).filter(
      (value) => value !== removedValue,
    ),
  );
}

function getNameParts(name: string) {
  const [firstName = name, ...lastNameParts] = name.split(/\s+/);

  return {
    firstName,
    lastName: lastNameParts.join(" "),
  };
}

async function requireAdminTeamMemberScope(
  payloadOrganizationId: string,
  options: AdminTeamMemberWriteOptions,
) {
  if (!getFirebaseAdminConfig()) {
    createTeamMemberError(
      "firebase-unavailable",
      "Team member changes are not available until Firebase is configured.",
      503,
    );
  }

  const session = await verifyAdminAccessSession(options.sessionSource);

  if (!session) {
    createTeamMemberError(
      "admin-session-required",
      "Please sign in as an admin before changing team members.",
      401,
    );
  }

  const scope = await resolveAdminOrganizationScope(session);
  const activeOrganizationId = normalizeText(options.activeOrganizationId);
  const organizationId = normalizeText(payloadOrganizationId);

  if (!activeOrganizationId || !canManageOrganization(scope, activeOrganizationId)) {
    createTeamMemberError(
      "active-organization-required",
      "Choose an organization you manage before changing team members.",
      403,
    );
  }

  if (!organizationId || organizationId !== activeOrganizationId) {
    createTeamMemberError(
      "active-organization-mismatch",
      "This team member change is outside the active organization.",
      403,
    );
  }

  return {
    activeOrganizationId,
    actor: getAdminActor(scope),
    scope,
    session,
  };
}

function buildParentRecord({
  athleteId,
  createdByUid,
  currentParent,
  organizationId,
  parentEmail,
  parentId,
  parentName,
  parentPhone,
  source,
  timestamp,
}: {
  athleteId: string;
  createdByUid: string;
  currentParent: ParentGuardian | null;
  organizationId: string;
  parentEmail: string;
  parentId: string;
  parentName: string;
  parentPhone: string;
  source: string;
  timestamp: string;
}) {
  const nameParts = getNameParts(parentName);
  const parentUid = currentParent?.parentUid ?? currentParent?.ownerUid;

  return {
    athleteIds: uniqueStringList([...(currentParent?.athleteIds ?? []), athleteId]),
    createdAt: currentParent?.createdAt ?? timestamp,
    createdByUid: currentParent?.createdByUid ?? createdByUid,
    email: parentEmail || currentParent?.email || "",
    firstName: nameParts.firstName,
    id: parentId,
    lastName: nameParts.lastName,
    name: parentName,
    ...(parentUid ? { ownerUid: parentUid, parentUid } : {}),
    organizationIds: uniqueStringList([
      ...(currentParent?.organizationIds ?? []),
      organizationId,
    ]),
    parentId: currentParent?.parentId ?? parentId,
    phone: parentPhone || currentParent?.phone || "",
    source: currentParent?.source ?? source,
    updatedAt: timestamp,
  } satisfies ParentGuardian;
}

export async function addAdminTeamPlayer(
  payload: Extract<AdminTeamMemberPayload, { actionType: "player-add" }>,
  options: AdminTeamMemberWriteOptions,
): Promise<AdminTeamMemberResult> {
  const { actor, session } = await requireAdminTeamMemberScope(
    payload.organizationId,
    options,
  );
  const organizationId = normalizeText(payload.organizationId);
  const teamId = normalizeText(payload.teamId);
  const athleteFirstName = normalizeNamePart(payload.athleteFirstName);
  const athleteLastName = normalizeNamePart(payload.athleteLastName);
  const parentEmail = normalizeEmail(payload.parentEmail);
  const submittedParentName = normalizeNamePart(payload.parentName);
  const parentPhone = normalizeText(payload.parentPhone);
  const athleteName = `${athleteFirstName} ${athleteLastName}`.trim();
  const timestamp = new Date().toISOString();

  if (!teamId || !athleteFirstName || !athleteLastName) {
    createTeamMemberError(
      "invalid-player-payload",
      "Enter the team and player first and last name.",
      400,
    );
  }

  const result = await runFirestoreTransaction(async (transaction) => {
    const [organization, team, parentsByEmail] = await Promise.all([
      transaction.get<Organization>("organizations", organizationId),
      transaction.get<Team>("teams", teamId),
      parentEmail
        ? transaction.list<ParentGuardian>("parents", {
            limit: 2,
            scope: { email: parentEmail },
          })
        : [],
    ]);

    if (!organization) {
      createTeamMemberError(
        "organization-required",
        "Create the organization before adding players.",
        400,
      );
    }

    if (!team || team.organizationId !== organizationId || !isActiveTeam(team)) {
      createTeamMemberError(
        "team-required",
        "Choose an active team inside this organization before adding players.",
        400,
      );
    }

    if (parentsByEmail.length > 1) {
      createTeamMemberError(
        "parent-email-conflict",
        "Multiple parent records use this email. Resolve them before adding the player.",
        409,
      );
    }

    const currentParent = parentsByEmail[0] ?? null;
    const parentName =
      submittedParentName ||
      currentParent?.name ||
      parentEmail ||
      "Admin Managed Contact";
    const parentId =
      currentParent?.id ??
      createLiveRecordId("parent", [organizationId, teamId, parentName]);
    const athleteId = createLiveRecordId("athlete", [teamId, athleteName]);
    const registrationId = createLiveRecordId("registration", [
      teamId,
      athleteName,
    ]);
    const parentRecord = buildParentRecord({
      athleteId,
      createdByUid: session.user.id,
      currentParent,
      organizationId,
      parentEmail,
      parentId,
      parentName,
      parentPhone,
      source: "admin-managed-roster",
      timestamp,
    });
    const linkedParentUid = parentRecord.parentUid ?? parentRecord.ownerUid;
    const registration: Registration = {
      adminNotes: "Player was added directly by an organization admin.",
      athleteId,
      athleteName,
      createdAt: timestamp,
      createdByUid: session.user.id,
      details: "Player was added directly by an organization admin.",
      id: registrationId,
      ...(linkedParentUid ? { ownerUid: linkedParentUid, parentUid: linkedParentUid } : {}),
      organizationId,
      parentId,
      parentName,
      registrationId,
      requirements: [],
      reviewedAt: timestamp,
      reviewedBy: actor.id,
      rosteredAt: timestamp,
      rosteredBy: actor.id,
      rosterStatus: "rostered",
      source: "admin-managed-roster",
      status: "Approved",
      submittedDate: timestamp,
      teamId,
      updatedAt: timestamp,
    };
    const athlete: Athlete = {
      createdAt: timestamp,
      createdByUid: session.user.id,
      dateOfBirth: normalizeText(payload.dateOfBirth),
      firstName: athleteFirstName,
      grade: normalizeText(payload.grade),
      id: athleteId,
      jerseySize: normalizeText(payload.jerseySize),
      lastName: athleteLastName,
      name: athleteName,
      organizationId,
      ...(linkedParentUid ? { ownerUid: linkedParentUid, parentUid: linkedParentUid } : {}),
      parentId,
      registrationId,
      school: normalizeText(payload.school),
      source: "admin-managed-roster",
      teamId,
      upcomingEventIds: [],
      updatedAt: timestamp,
    };
    const nextAthleteIds = uniqueStringList([
      ...(team.athleteIds ?? []),
      athleteId,
    ]);
    const nextRosterPreviewIds = uniqueStringList([
      ...(team.rosterPreviewIds ?? []),
      athleteId,
    ]);

    transaction.set("parents", parentId, parentRecord);
    transaction.create("athletes", athleteId, athlete);
    transaction.create("registrations", registrationId, registration);
    transaction.update<Team>("teams", team.id, {
      athleteIds: nextAthleteIds,
      playerCount: nextAthleteIds.length,
      rosterPreviewIds: nextRosterPreviewIds,
      updatedAt: timestamp,
    });

    return {
      athleteId,
      parentId,
      registrationId,
      source: "firestore" as const,
    };
  });

  console.info("Admin team player added.", {
    athleteId: result.athleteId,
    organizationId,
    registrationId: result.registrationId,
    teamId,
  });

  return {
    ...result,
    id: result.registrationId,
    message: `Player added: ${athleteName}`,
  };
}

export async function addAdminTeamPlayers(
  payload: Extract<AdminTeamMemberPayload, { actionType: "players-bulk-add" }>,
  options: AdminTeamMemberWriteOptions,
): Promise<AdminTeamMemberResult> {
  const { actor, session } = await requireAdminTeamMemberScope(
    payload.organizationId,
    options,
  );
  const organizationId = normalizeText(payload.organizationId);
  const teamId = normalizeText(payload.teamId);
  const players = payload.players.map((player) => ({
    athleteFirstName: normalizeNamePart(player.athleteFirstName),
    athleteLastName: normalizeNamePart(player.athleteLastName),
    dateOfBirth: normalizeText(player.dateOfBirth),
    grade: normalizeText(player.grade),
    jerseySize: normalizeText(player.jerseySize),
    parentEmail: normalizeEmail(player.parentEmail),
    parentName: normalizeNamePart(player.parentName),
    parentPhone: normalizeText(player.parentPhone),
    school: normalizeText(player.school),
  }));
  const timestamp = new Date().toISOString();

  if (!teamId || players.length === 0) {
    createTeamMemberError(
      "invalid-player-bulk-payload",
      "Enter at least one player for this team.",
      400,
    );
  }

  if (players.length > 60) {
    createTeamMemberError(
      "player-bulk-limit",
      "Add up to 60 players at a time.",
      400,
    );
  }

  if (players.some((player) => !player.athleteFirstName)) {
    createTeamMemberError(
      "invalid-player-bulk-name",
      "Each player needs a name.",
      400,
    );
  }

  const result = await runFirestoreTransaction(async (transaction) => {
    const parentEmails = uniqueStringList(
      players.map((player) => player.parentEmail),
    );
    const [organization, team, ...parentLists] = await Promise.all([
      transaction.get<Organization>("organizations", organizationId),
      transaction.get<Team>("teams", teamId),
      ...parentEmails.map((email) =>
        transaction.list<ParentGuardian>("parents", {
          limit: 2,
          scope: { email },
        }),
      ),
    ]);

    if (!organization) {
      createTeamMemberError(
        "organization-required",
        "Create the organization before adding players.",
        400,
      );
    }

    if (!team || team.organizationId !== organizationId || !isActiveTeam(team)) {
      createTeamMemberError(
        "team-required",
        "Choose an active team inside this organization before adding players.",
        400,
      );
    }

    const currentParentsByEmail = new Map<string, ParentGuardian>();
    parentEmails.forEach((email, index) => {
      const parents = parentLists[index] ?? [];

      if (parents.length > 1) {
        createTeamMemberError(
          "parent-email-conflict",
          `Multiple parent records use ${email}. Resolve them before adding the roster.`,
          409,
        );
      }

      if (parents[0]) {
        currentParentsByEmail.set(email, parents[0]);
      }
    });

    const parentUpdatesByEmail = new Map<string, ParentGuardian>();
    const nextAthleteIds = [...(team.athleteIds ?? [])];
    const nextRosterPreviewIds = [...(team.rosterPreviewIds ?? [])];
    const registrationIds: string[] = [];

    players.forEach((player) => {
      const athleteName =
        `${player.athleteFirstName} ${player.athleteLastName}`.trim();
      const currentParent = player.parentEmail
        ? (parentUpdatesByEmail.get(player.parentEmail) ??
          currentParentsByEmail.get(player.parentEmail) ??
          null)
        : null;
      const parentName =
        player.parentName ||
        currentParent?.name ||
        player.parentEmail ||
        "Admin Managed Contact";
      const parentId =
        currentParent?.id ??
        createLiveRecordId("parent", [organizationId, teamId, parentName]);
      const athleteId = createLiveRecordId("athlete", [teamId, athleteName]);
      const registrationId = createLiveRecordId("registration", [
        teamId,
        athleteName,
      ]);
      const parentRecord = buildParentRecord({
        athleteId,
        createdByUid: session.user.id,
        currentParent,
        organizationId,
        parentEmail: player.parentEmail,
        parentId,
        parentName,
        parentPhone: player.parentPhone,
        source: "admin-managed-roster",
        timestamp,
      });
      const linkedParentUid = parentRecord.parentUid ?? parentRecord.ownerUid;
      const registration: Registration = {
        adminNotes: "Player was added directly by an organization admin.",
        athleteId,
        athleteName,
        createdAt: timestamp,
        createdByUid: session.user.id,
        details: "Player was added directly by an organization admin.",
        id: registrationId,
        ...(linkedParentUid
          ? { ownerUid: linkedParentUid, parentUid: linkedParentUid }
          : {}),
        organizationId,
        parentId,
        parentName,
        registrationId,
        requirements: [],
        reviewedAt: timestamp,
        reviewedBy: actor.id,
        rosteredAt: timestamp,
        rosteredBy: actor.id,
        rosterStatus: "rostered",
        source: "admin-managed-roster",
        status: "Approved",
        submittedDate: timestamp,
        teamId,
        updatedAt: timestamp,
      };
      const athlete: Athlete = {
        createdAt: timestamp,
        createdByUid: session.user.id,
        dateOfBirth: player.dateOfBirth,
        firstName: player.athleteFirstName,
        grade: player.grade,
        id: athleteId,
        jerseySize: player.jerseySize,
        lastName: player.athleteLastName,
        name: athleteName,
        organizationId,
        ...(linkedParentUid
          ? { ownerUid: linkedParentUid, parentUid: linkedParentUid }
          : {}),
        parentId,
        registrationId,
        school: player.school,
        source: "admin-managed-roster",
        teamId,
        upcomingEventIds: [],
        updatedAt: timestamp,
      };

      transaction.set("parents", parentId, parentRecord);
      transaction.create("athletes", athleteId, athlete);
      transaction.create("registrations", registrationId, registration);

      if (player.parentEmail) {
        parentUpdatesByEmail.set(player.parentEmail, parentRecord);
      }

      nextAthleteIds.push(athleteId);
      nextRosterPreviewIds.push(athleteId);
      registrationIds.push(registrationId);
    });

    const uniqueAthleteIds = uniqueStringList(nextAthleteIds);
    const uniqueRosterPreviewIds = uniqueStringList(nextRosterPreviewIds);

    transaction.update<Team>("teams", team.id, {
      athleteIds: uniqueAthleteIds,
      playerCount: uniqueAthleteIds.length,
      rosterPreviewIds: uniqueRosterPreviewIds,
      updatedAt: timestamp,
    });

    return {
      registrationIds,
      source: "firestore" as const,
    };
  });

  console.info("Admin team players added.", {
    count: result.registrationIds.length,
    organizationId,
    teamId,
  });

  return {
    id: result.registrationIds[0] ?? teamId,
    message: `${result.registrationIds.length} player${
      result.registrationIds.length === 1 ? "" : "s"
    } added.`,
    registrationId: result.registrationIds[0],
    source: result.source,
  };
}

export async function removeAdminTeamPlayer(
  payload: Extract<AdminTeamMemberPayload, { actionType: "player-remove" }>,
  options: AdminTeamMemberWriteOptions,
): Promise<AdminTeamMemberResult> {
  const { actor } = await requireAdminTeamMemberScope(
    payload.organizationId,
    options,
  );
  const organizationId = normalizeText(payload.organizationId);
  const teamId = normalizeText(payload.teamId);
  const registrationId = normalizeText(payload.registrationId);
  const timestamp = new Date().toISOString();

  if (!teamId || !registrationId) {
    createTeamMemberError(
      "invalid-player-remove-payload",
      "Choose the rostered player to remove.",
      400,
    );
  }

  const result = await runFirestoreTransaction(async (transaction) => {
    const [registration, team] = await Promise.all([
      transaction.get<Registration>("registrations", registrationId),
      transaction.get<Team>("teams", teamId),
    ]);

    if (!registration) {
      createTeamMemberError(
        "registration-not-found",
        "Could not find this roster record.",
        404,
      );
    }

    if (
      registration.organizationId !== organizationId ||
      registration.teamId !== teamId
    ) {
      createTeamMemberError(
        "registration-team-mismatch",
        "This roster record is outside the selected team.",
        403,
      );
    }

    if (!team || team.organizationId !== organizationId) {
      createTeamMemberError(
        "team-required",
        "Could not verify this team in the active organization.",
        400,
      );
    }

    const nextAthleteIds = removeStringValue(
      team.athleteIds,
      registration.athleteId,
    );
    const nextRosterPreviewIds = removeStringValue(
      removeStringValue(team.rosterPreviewIds, registration.athleteId),
      registration.id,
    );

    transaction.update<Registration>("registrations", registration.id, {
      adminNotes: "Player was removed from this roster by an organization admin.",
      reviewedAt: timestamp,
      reviewedBy: actor.id,
      rosterStatus: "inactive",
      status: "Inactive",
      updatedAt: timestamp,
    });
    transaction.update<Team>("teams", team.id, {
      athleteIds: nextAthleteIds,
      playerCount: nextAthleteIds.length,
      rosterPreviewIds: nextRosterPreviewIds,
      updatedAt: timestamp,
    });

    return {
      athleteId: registration.athleteId,
      parentId: registration.parentId,
      registrationId: registration.id,
      source: "firestore" as const,
    };
  });

  console.info("Admin team player removed.", {
    organizationId,
    registrationId,
    teamId,
  });

  return {
    ...result,
    id: result.registrationId,
    message: "Player removed from roster.",
  };
}
