import type { Athlete } from "./athletes";
import { getActiveRegistrationInviteByCode } from "./invites";
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
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";

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

function fallbackResult(
  payload: RegistrationSubmissionPayload,
): RegistrationSubmissionResult {
  const athleteFirstName = normalizeNamePart(payload.athlete.firstName);
  const athleteLastName = normalizeNamePart(payload.athlete.lastName);
  const athleteName = [athleteFirstName, athleteLastName]
    .filter(Boolean)
    .join(" ");
  const registrationId = createRecordId("preview-registration", [
    athleteFirstName,
    athleteLastName,
  ]);

  return {
    athleteId: createRecordId("preview-athlete", [
      athleteFirstName,
      athleteLastName,
    ]),
    athleteName: athleteName || "New Athlete",
    registrationId,
    source: "mock",
    status: "Pending Review",
  };
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNamePart(value: unknown) {
  return normalizeText(value).replace(/\s+/g, " ");
}

function createRecordId(prefix: string, parts: string[]) {
  const slug = parts
    .map((part) =>
      part
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    )
    .filter(Boolean)
    .join("-");

  return `${prefix}-${slug || "record"}`;
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
  invite: NonNullable<ReturnType<typeof getActiveRegistrationInviteByCode>>,
  payload: RegistrationSubmissionPayload,
): RegistrationRequirement[] {
  return invite.documentRequirements.map((requirement) => {
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
  invite: NonNullable<ReturnType<typeof getActiveRegistrationInviteByCode>>,
  payload: RegistrationSubmissionPayload,
  registrationId: string,
  athleteId: string,
  parentId: string,
  parentUid: string,
  submittedAt: string,
): PaymentRequirement[] {
  return invite.paymentRequirements.map((requirement) => {
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
    return fallbackResult(payload);
  }

  const inviteCode = normalizeText(payload.inviteCode);
  const invite = getActiveRegistrationInviteByCode(inviteCode);
  const athleteFirstName = normalizeNamePart(payload.athlete.firstName);
  const athleteLastName = normalizeNamePart(payload.athlete.lastName);

  if (!invite) {
    createSubmissionError(
      "invalid-invite",
      "This registration invite is not active.",
      400,
    );
  }

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

  const repositories = createFirestoreRepositories();
  const parent = await repositories.parents.getById(parentId);
  const athleteName = `${athleteFirstName} ${athleteLastName}`;
  const athleteId = createLiveRecordId("athlete", [
    invite.teamId,
    athleteName,
  ]);
  const registrationId = createLiveRecordId("registration", [
    invite.teamId,
    athleteName,
  ]);
  const submittedAt = getSubmittedDate();
  const actor = {
    athleteIds: uniqueStringList([...session.claims.athleteIds, athleteId]),
    id: parentId,
    organizationIds: uniqueStringList([
      ...session.claims.organizationIds,
      invite.organizationId,
    ]),
    role: session.claims.role,
    teamIds: uniqueStringList([...session.claims.teamIds, invite.teamId]),
  };
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
    registrationId,
    requirements: buildRegistrationRequirements(invite, payload),
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

  console.info("Parent registration live identity resolved.", {
    athleteId,
    hasParentUid: Boolean(parentUid),
    parentId,
    registrationId,
    teamId: invite.teamId,
  });

  if (parent) {
    await repositories.parents.update(parentId, parentRecord, {
      actor,
      reason: "Parent submitted team invite registration.",
    });
  } else {
    await repositories.parents.create(parentRecord, {
      actor,
      reason: "Parent submitted team invite registration.",
    });
  }
  await repositories.athletes.create(athlete, {
    actor,
    reason: "Parent submitted team invite registration.",
  });
  await repositories.registrations.create(registration, {
    actor,
    reason: "Parent submitted team invite registration.",
  });

  return {
    athleteId,
    athleteName,
    parentId,
    parentName,
    parentUid,
    registrationId,
    source: "firestore",
    status: registration.status,
  };
}
