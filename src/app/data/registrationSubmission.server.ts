import type { Athlete } from "./athletes";
import {
  getRegistrationInviteAvailability,
  getRegistrationInviteUnavailableMessage,
  normalizeRegistrationInvite,
  type RegistrationInvite,
} from "./invites";
import {
  createLiveRecordId,
  getLiveParentId,
  getLiveParentUid,
} from "./liveIdentity";
import type {
  PaymentRequirement,
  PaymentRequirementStatus,
} from "./payments";
import type { ParentGuardian } from "./parents";
import type {
  Registration,
  RegistrationRequirement,
  RegistrationRequirementStatus,
} from "./registrations";
import type {
  RegistrationSubmissionPayload,
  RegistrationSubmissionResult,
} from "./registrationSubmission";
import type { AuthSessionSource } from "../infrastructure/auth";
import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import { FirebaseAdminAuthProvider } from "../infrastructure/firebaseAuth";
import { runFirestoreTransaction } from "../infrastructure/firebaseRepositories";

type SubmitParentRegistrationOptions = {
  sessionSource: AuthSessionSource;
};

export class RegistrationSubmissionError extends Error {
  constructor(
    readonly reason: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "RegistrationSubmissionError";
  }
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNamePart(value: unknown) {
  return normalizeText(value).replace(/\s+/g, " ");
}

function getSubmittedDate() {
  return new Date().toISOString();
}

function uniqueStringList(values: (string | undefined)[]) {
  return [...new Set(values.map(normalizeText).filter(Boolean))];
}

function splitParentName(name: string) {
  const [firstName = "Parent", ...lastNameParts] = name.split(" ");

  return {
    firstName,
    lastName: lastNameParts.join(" ") || "Guardian",
  };
}

function getParentName(
  submittedName: string,
  parent: ParentGuardian | null,
  displayName?: string,
) {
  return submittedName || parent?.name || displayName || "";
}

function createSubmissionError(
  reason: string,
  message: string,
  status = 400,
): never {
  throw new RegistrationSubmissionError(reason, message, status);
}

function buildRegistrationRequirements(
  invite: RegistrationInvite,
  payload: RegistrationSubmissionPayload,
): RegistrationRequirement[] {
  const documentRequirements = Array.isArray(invite.documentRequirements)
    ? invite.documentRequirements
    : [];

  return documentRequirements.map((requirement) => {
    const submittedStatus = payload.requirementStatuses[requirement.label];
    const status: RegistrationRequirementStatus =
      submittedStatus === "Uploaded" || submittedStatus === "Submitted"
        ? submittedStatus
        : "Missing";

    return {
      description: requirement.description,
      label: requirement.label,
      required: requirement.required,
      status,
    };
  });
}

function buildPaymentRequirements(
  invite: RegistrationInvite,
  payload: RegistrationSubmissionPayload,
  registrationId: string,
  athleteId: string,
  parentId: string,
  parentUid: string,
  submittedAt: string,
): PaymentRequirement[] {
  const paymentRequirements = Array.isArray(invite.paymentRequirements)
    ? invite.paymentRequirements
    : [];

  return paymentRequirements.map((requirement) => {
    const submittedStatus = payload.paymentStatuses[requirement.label];
    const status: PaymentRequirementStatus =
      submittedStatus === "Submitted" ? "Submitted" : "Missing";

    return {
      ...requirement,
      amountPaid: 0,
      athleteId,
      createdAt: submittedAt,
      createdByUid: parentUid,
      id: `${registrationId}-${requirement.label
        .toLowerCase()
        .replaceAll(" ", "-")}`,
      intentRecordedAt: status === "Submitted" ? submittedAt : undefined,
      organizationId: invite.organizationId,
      parentId,
      parentUid,
      ownerUid: parentUid,
      registrationId,
      submittedAt: status === "Submitted" ? submittedAt : undefined,
      status,
      teamId: invite.teamId,
      updatedAt: submittedAt,
    };
  });
}

export async function submitParentRegistration(
  payload: RegistrationSubmissionPayload,
  options: SubmitParentRegistrationOptions,
): Promise<RegistrationSubmissionResult> {
  if (!getFirebaseAdminConfig()) {
    createSubmissionError(
      "firebase-unavailable",
      "Registration is not available until Firebase is configured.",
      503,
    );
  }

  const inviteCode = normalizeText(payload.inviteCode);
  const athleteFirstName = normalizeNamePart(payload.athlete.firstName);
  const athleteLastName = normalizeNamePart(payload.athlete.lastName);

  if (!athleteFirstName || !athleteLastName) {
    createSubmissionError(
      "missing-athlete-name",
      "Enter the athlete first and last name before submitting.",
      400,
    );
  }

  const authProvider = new FirebaseAdminAuthProvider();
  const session = await authProvider
    .verifySession(options.sessionSource)
    .catch(() => null);
  const parentUid = getLiveParentUid(session);
  const parentId = getLiveParentId(session);

  if (!session || session.claims.role !== "parent" || !parentUid || !parentId) {
    createSubmissionError(
      "parent-session-required",
      "Please sign in as a parent before submitting registration.",
      403,
    );
  }

  const athleteName = `${athleteFirstName} ${athleteLastName}`;
  const submittedAt = getSubmittedDate();
  const result = await runFirestoreTransaction(async (transaction) => {
    const storedInvite = await transaction.get<RegistrationInvite>(
      "registrationInvites",
      inviteCode,
      "inviteCode",
    );
    const invite = normalizeRegistrationInvite(storedInvite);

    if (!invite) {
      createSubmissionError(
        "invalid-invite",
        "This registration invite could not be found.",
        400,
      );
    }

    const [
      parent,
      inviteOrganization,
      inviteTeam,
      registrationsByInviteId,
      registrationsByInviteCode,
    ] = await Promise.all([
      transaction.get<ParentGuardian>("parents", parentId),
      transaction.get("organizations", invite.organizationId),
      transaction.get<{ lifecycleStatus?: string; organizationId: string }>(
        "teams",
        invite.teamId,
      ),
      transaction.list<Registration>("registrations", {
        scope: { registrationInviteId: invite.id },
      }),
      transaction.list<Registration>("registrations", {
        scope: { inviteCode: invite.inviteCode },
      }),
    ]);
    const inviteScopeIsValid = Boolean(
      inviteOrganization &&
        inviteTeam &&
        inviteTeam.organizationId === invite.organizationId &&
        inviteTeam.lifecycleStatus !== "Inactive",
    );
    const registrationCount = new Set(
      [...registrationsByInviteId, ...registrationsByInviteCode].map(
        (registration) => registration.id,
      ),
    ).size;
    const availability = getRegistrationInviteAvailability(invite, {
      now: new Date(submittedAt),
      registrationCount,
      scopeIsValid: inviteScopeIsValid,
    });

    if (!availability.available) {
      createSubmissionError(
        `invite-${availability.reason}`,
        getRegistrationInviteUnavailableMessage(availability.reason),
        400,
      );
    }

    const athleteId = createLiveRecordId("athlete", [
      invite.teamId,
      athleteName,
    ]);
    const registrationId = createLiveRecordId("registration", [
      invite.teamId,
      athleteName,
    ]);
    const parentName = getParentName(
      normalizeNamePart(payload.parent.name),
      parent,
      session.user.displayName,
    );

    if (!parentName) {
      createSubmissionError(
        "missing-parent-name",
        "Enter the parent or guardian name before submitting.",
        400,
      );
    }

    const parentNameParts = splitParentName(parentName);
    const parentRecord: ParentGuardian = {
      athleteIds: uniqueStringList([...(parent?.athleteIds ?? []), athleteId]),
      createdAt: parent?.createdAt ?? submittedAt,
      createdByUid: parent?.createdByUid ?? parentUid,
      email:
        normalizeText(payload.parent.email) ||
        parent?.email ||
        session.user.email ||
        "",
      firstName: parentNameParts.firstName,
      id: parentId,
      lastName: parentNameParts.lastName,
      name: parentName,
      ownerUid: parentUid,
      organizationIds: uniqueStringList([
        ...(parent?.organizationIds ?? []),
        invite.organizationId,
      ]),
      parentId,
      parentUid,
      phone: normalizeText(payload.parent.phone) || parent?.phone || "",
      source: parent?.source ?? "firebase-registration",
      updatedAt: submittedAt,
    };
    const registration: Registration = {
      athleteId,
      athleteName,
      createdAt: submittedAt,
      createdByUid: parentUid,
      details: "Registration was submitted from a team invite.",
      id: registrationId,
      inviteCode: invite.inviteCode,
      ownerUid: parentUid,
      organizationId: invite.organizationId,
      parentId,
      parentUid,
      parentName,
      paymentRequirements: buildPaymentRequirements(
        invite,
        payload,
        registrationId,
        athleteId,
        parentId,
        parentUid,
        submittedAt,
      ),
      registrationInviteId: invite.id,
      registrationId,
      requirements: buildRegistrationRequirements(invite, payload),
      rosterStatus: "not_rostered",
      source: "team-invite",
      status: "Pending Review",
      submittedDate: submittedAt,
      teamId: invite.teamId,
      updatedAt: submittedAt,
    };
    const athlete: Athlete = {
      createdAt: submittedAt,
      createdByUid: parentUid,
      dateOfBirth: "",
      firstName: athleteFirstName,
      grade: normalizeText(payload.athlete.grade),
      id: athleteId,
      jerseySize: "",
      lastName: athleteLastName,
      name: athleteName,
      organizationId: invite.organizationId,
      ownerUid: parentUid,
      parentId,
      parentUid,
      registrationId,
      school: normalizeText(payload.athlete.school),
      source: "team-invite",
      teamId: invite.teamId,
      upcomingEventIds: [],
      updatedAt: submittedAt,
    };

    transaction.set("parents", parentId, parentRecord);
    transaction.create("athletes", athleteId, athlete);
    transaction.create("registrations", registrationId, registration);

    return {
      athleteId,
      athleteName,
      parentId,
      parentName,
      parentUid,
      registrationId,
      source: "firestore" as const,
      status: registration.status,
      teamId: invite.teamId,
    };
  });

  console.info("Parent registration committed atomically.", {
    athleteId: result.athleteId,
    hasParentUid: Boolean(parentUid),
    parentId,
    registrationId: result.registrationId,
    teamId: result.teamId,
  });

  return result;
}
