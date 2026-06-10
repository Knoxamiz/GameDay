import { randomUUID } from "crypto";
import type { Athlete } from "./athletes";
import { getActiveRegistrationInviteByCode } from "./invites";
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

function fallbackResult(): RegistrationSubmissionResult {
  return {
    source: "mock",
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

  return `${prefix}-${slug || randomUUID()}`;
}

function getSubmittedDate() {
  return new Date().toISOString();
}

function getParentName(
  submittedName: string,
  parent: ParentGuardian | null,
  displayName?: string,
) {
  return submittedName || parent?.name || displayName || "Parent Guardian";
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
): PaymentRequirement[] {
  const submittedAt = getSubmittedDate();

  return invite.paymentRequirements.map((requirement) => {
    const submittedStatus = payload.paymentStatuses[requirement.label];
    const status: PaymentRequirementStatus =
      submittedStatus === "Submitted" ? "Submitted" : "Missing";

    return {
      ...requirement,
      amountPaid: 0,
      athleteId,
      id: `${registrationId}-${requirement.label
        .toLowerCase()
        .replaceAll(" ", "-")}`,
      intentRecordedAt: status === "Submitted" ? submittedAt : undefined,
      organizationId: invite.organizationId,
      parentId,
      registrationId,
      submittedAt: status === "Submitted" ? submittedAt : undefined,
      status,
      teamId: invite.teamId,
    };
  });
}

export async function submitParentRegistration(
  payload: RegistrationSubmissionPayload,
  options: SubmitParentRegistrationOptions,
): Promise<RegistrationSubmissionResult> {
  if (!getFirebaseAdminConfig()) {
    return fallbackResult();
  }

  const inviteCode = normalizeText(payload.inviteCode);
  const invite = getActiveRegistrationInviteByCode(inviteCode);
  const athleteFirstName = normalizeNamePart(payload.athlete.firstName);
  const athleteLastName = normalizeNamePart(payload.athlete.lastName);

  if (!invite || !athleteFirstName || !athleteLastName) {
    return fallbackResult();
  }

  const authProvider = new FirebaseAdminAuthProvider();
  const session = await authProvider.verifySession(options.sessionSource);
  const parentId = normalizeText(session?.claims.parentId);

  if (session?.claims.role !== "parent" || !parentId) {
    return fallbackResult();
  }

  const repositories = createFirestoreRepositories();
  const parent = await repositories.parents.getById(parentId);

  if (!parent) {
    return fallbackResult();
  }

  const athleteId = createRecordId("athlete", [
    parentId,
    invite.teamId,
    athleteFirstName,
    athleteLastName,
  ]);
  const registrationId = createRecordId("registration", [
    parentId,
    invite.teamId,
    athleteFirstName,
    athleteLastName,
  ]);
  const athleteName = `${athleteFirstName} ${athleteLastName}`;
  const registration: Registration = {
    athleteId,
    details: "Registration was submitted from a team invite.",
    id: registrationId,
    organizationId: invite.organizationId,
    parentId,
    parentName: getParentName(
      normalizeNamePart(payload.parent.name),
      parent,
      session.user.displayName,
    ),
    paymentRequirements: buildPaymentRequirements(
      invite,
      payload,
      registrationId,
      athleteId,
      parentId,
    ),
    requirements: buildRegistrationRequirements(invite, payload),
    status: "Pending Review",
    submittedDate: getSubmittedDate(),
    teamId: invite.teamId,
  };
  const athlete: Athlete = {
    dateOfBirth: "",
    firstName: athleteFirstName,
    grade: normalizeText(payload.athlete.grade),
    id: athleteId,
    jerseySize: "",
    lastName: athleteLastName,
    name: athleteName,
    parentId,
    registrationId,
    school: normalizeText(payload.athlete.school),
    teamId: invite.teamId,
    upcomingEventIds: [],
  };
  const actor = {
    athleteIds: session.claims.athleteIds,
    id: parentId,
    organizationIds: session.claims.organizationIds,
    role: session.claims.role,
    teamIds: session.claims.teamIds,
  };

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
    registrationId,
    source: "firestore",
  };
}
