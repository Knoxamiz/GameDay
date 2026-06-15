import type { AuthSessionSource } from "../infrastructure/auth";
import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import { FirebaseAdminAuthProvider } from "../infrastructure/firebaseAuth";
import { runFirestoreTransaction } from "../infrastructure/firebaseRepositories";
import type { Athlete } from "./athletes";
import { getLiveParentId, getLiveParentUid } from "./liveIdentity";
import type { ParentGuardian } from "./parents";
import type {
  ParentRegistrationCorrection,
  ParentRegistrationLifecyclePayload,
  ParentRegistrationLifecycleResult,
} from "./parentRegistrationLifecycle";
import {
  canParentDirectlyCorrectRegistration,
  isRegistrationTerminal,
  type Registration,
} from "./registrations";

type ParentRegistrationLifecycleOptions = {
  sessionSource: AuthSessionSource;
};

export class ParentRegistrationLifecycleError extends Error {
  constructor(
    readonly reason: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "ParentRegistrationLifecycleError";
  }
}

function createLifecycleError(
  reason: string,
  message: string,
  status = 400,
): never {
  throw new ParentRegistrationLifecycleError(reason, message, status);
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function normalizeEmail(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function splitName(name: string) {
  const [firstName = "", ...lastNameParts] = name.split(" ");

  return {
    firstName,
    lastName: lastNameParts.join(" "),
  };
}

function normalizeCorrection(
  correction: ParentRegistrationCorrection,
): ParentRegistrationCorrection {
  return {
    athleteFirstName: normalizeText(correction.athleteFirstName),
    athleteLastName: normalizeText(correction.athleteLastName),
    grade: normalizeText(correction.grade),
    parentEmail: normalizeEmail(correction.parentEmail),
    parentName: normalizeText(correction.parentName),
    parentPhone: normalizeText(correction.parentPhone),
    school: normalizeText(correction.school),
  };
}

function validateCorrection(correction: ParentRegistrationCorrection) {
  if (
    !correction.athleteFirstName ||
    !correction.athleteLastName ||
    !correction.parentName
  ) {
    createLifecycleError(
      "required-correction-fields-missing",
      "Athlete first name, athlete last name, and parent name are required.",
    );
  }
}

async function requireParentSession(source: AuthSessionSource) {
  if (!getFirebaseAdminConfig()) {
    createLifecycleError(
      "firebase-unavailable",
      "Registration changes are unavailable until Firebase is configured.",
      503,
    );
  }

  const session = await new FirebaseAdminAuthProvider()
    .verifySession(source)
    .catch(() => null);
  const parentId = getLiveParentId(session);
  const parentUid = getLiveParentUid(session);

  if (!session || session.claims.role !== "parent" || !parentId || !parentUid) {
    createLifecycleError(
      "parent-session-required",
      "Please sign in as a parent before changing a registration.",
      403,
    );
  }

  return { parentId, parentUid, session };
}

function assertParentOwnsRegistration(
  registration: Registration | null,
  athlete: Athlete | null,
  parent: ParentGuardian | null,
  parentId: string,
  parentUid: string,
) {
  if (
    !registration ||
    registration.parentId !== parentId ||
    (registration.ownerUid && registration.ownerUid !== parentUid) ||
    (registration.parentUid && registration.parentUid !== parentUid)
  ) {
    createLifecycleError(
      "registration-not-owned",
      "Could not find a registration owned by this parent.",
      404,
    );
  }

  if (
    !athlete ||
    athlete.id !== registration.athleteId ||
    athlete.parentId !== parentId ||
    (athlete.ownerUid && athlete.ownerUid !== parentUid) ||
    (athlete.parentUid && athlete.parentUid !== parentUid)
  ) {
    createLifecycleError(
      "athlete-not-owned",
      "Could not find the athlete linked to this registration.",
      404,
    );
  }

  if (
    !parent ||
    parent.id !== parentId ||
    (parent.ownerUid && parent.ownerUid !== parentUid) ||
    (parent.parentUid && parent.parentUid !== parentUid)
  ) {
    createLifecycleError(
      "parent-profile-not-owned",
      "Could not find the parent profile linked to this registration.",
      404,
    );
  }
}

export function applyParentRegistrationCorrection(
  correction: ParentRegistrationCorrection,
  athlete: Athlete,
  parent: ParentGuardian,
  registration: Registration,
  updatedAt: string,
) {
  const athleteName = `${correction.athleteFirstName} ${correction.athleteLastName}`;
  const parentName = splitName(correction.parentName);

  return {
    athlete: {
      ...athlete,
      firstName: correction.athleteFirstName,
      grade: correction.grade,
      lastName: correction.athleteLastName,
      name: athleteName,
      school: correction.school,
      updatedAt,
    },
    parent: {
      ...parent,
      email: correction.parentEmail,
      firstName: parentName.firstName,
      lastName: parentName.lastName,
      name: correction.parentName,
      phone: correction.parentPhone,
      updatedAt,
    },
    registration: {
      ...registration,
      athleteName,
      parentName: correction.parentName,
      updatedAt,
    },
  };
}

export async function updateParentRegistrationLifecycle(
  registrationIdValue: string,
  payload: ParentRegistrationLifecyclePayload,
  options: ParentRegistrationLifecycleOptions,
): Promise<ParentRegistrationLifecycleResult> {
  const registrationId = normalizeText(registrationIdValue);

  if (!registrationId) {
    createLifecycleError(
      "registration-required",
      "A registration ID is required.",
    );
  }

  const { parentId, parentUid } = await requireParentSession(
    options.sessionSource,
  );
  const now = new Date().toISOString();

  return runFirestoreTransaction(async (transaction) => {
    const registration = await transaction.get<Registration>(
      "registrations",
      registrationId,
    );
    const [athlete, parent] = await Promise.all([
      registration
        ? transaction.get<Athlete>("athletes", registration.athleteId)
        : null,
      transaction.get<ParentGuardian>("parents", parentId),
    ]);

    assertParentOwnsRegistration(
      registration,
      athlete,
      parent,
      parentId,
      parentUid,
    );

    if (!registration || !athlete || !parent) {
      createLifecycleError(
        "registration-context-missing",
        "Registration context is incomplete.",
        409,
      );
    }

    if (isRegistrationTerminal(registration.status)) {
      createLifecycleError(
        "registration-lifecycle-closed",
        "This registration can no longer be changed by the parent.",
        409,
      );
    }

    if (payload.actionType === "correction") {
      if (registration.withdrawalRequest?.status === "pending") {
        createLifecycleError(
          "withdrawal-request-pending",
          "Resolve the pending withdrawal request before requesting corrections.",
          409,
        );
      }

      if (registration.parentChangeRequest?.status === "pending") {
        createLifecycleError(
          "parent-change-request-pending",
          "A correction request is already waiting for admin review.",
          409,
        );
      }

      const correction = normalizeCorrection(payload.correction);
      validateCorrection(correction);

      if (canParentDirectlyCorrectRegistration(registration)) {
        const corrected = applyParentRegistrationCorrection(
          correction,
          athlete,
          parent,
          registration,
          now,
        );

        transaction.set("parents", parent.id, corrected.parent);
        transaction.set("athletes", athlete.id, corrected.athlete);
        transaction.set("registrations", registration.id, corrected.registration);

        return {
          message: "Registration information updated.",
          mode: "updated",
          registrationId,
          source: "firestore",
        };
      }

      transaction.update<Registration>("registrations", registration.id, {
        parentChangeRequest: {
          correction,
          requestedAt: now,
          requestedByUid: parentUid,
          status: "pending",
        },
        updatedAt: now,
      });

      return {
        message: "Correction request sent for admin review.",
        mode: "requested",
        registrationId,
        source: "firestore",
      };
    }

    if (registration.parentChangeRequest?.status === "pending") {
      createLifecycleError(
        "parent-change-request-pending",
        "Resolve the pending correction request before requesting withdrawal.",
        409,
      );
    }

    if (registration.withdrawalRequest?.status === "pending") {
      createLifecycleError(
        "withdrawal-request-pending",
        "A withdrawal request is already waiting for admin review.",
        409,
      );
    }

    const reason = normalizeText(payload.reason);

    if (canParentDirectlyCorrectRegistration(registration)) {
      transaction.update<Registration>("registrations", registration.id, {
        rosterStatus: "inactive",
        status: "Withdrawn",
        updatedAt: now,
        withdrawnAt: now,
        withdrawnByUid: parentUid,
        ...(reason ? { withdrawalReason: reason } : {}),
      });

      return {
        message: "Registration withdrawn.",
        mode: "withdrawn",
        registrationId,
        source: "firestore",
      };
    }

    transaction.update<Registration>("registrations", registration.id, {
      updatedAt: now,
      withdrawalRequest: {
        ...(reason ? { reason } : {}),
        requestedAt: now,
        requestedByUid: parentUid,
        status: "pending",
      },
    });

    return {
      message: "Withdrawal request sent for admin review.",
      mode: "requested",
      registrationId,
      source: "firestore",
    };
  });
}
