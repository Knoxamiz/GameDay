import type { AuthSession } from "../infrastructure/auth";
import { getFirebaseAdminUser } from "../infrastructure/firebaseAuth";
import {
  createFirestoreRepositories,
  runFirestoreTransaction,
} from "../infrastructure/firebaseRepositories";
import type { OrganizationMembership } from "./organizationMemberships";

export class OrganizationMembershipAcceptanceError extends Error {
  constructor(
    readonly reason: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "OrganizationMembershipAcceptanceError";
  }
}

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isOpenInvitation(membership: OrganizationMembership) {
  return membership.status === "invited";
}

export async function acceptOrganizationMembershipInvitations(
  session: AuthSession,
) {
  const email = normalizeEmail(session.user.email);

  if (!email) {
    return [];
  }

  const repositories = createFirestoreRepositories();
  const invitedMemberships = (
    await repositories.organizationMemberships.list({ scope: { email } })
  ).filter(isOpenInvitation);

  if (invitedMemberships.length === 0) {
    return [];
  }

  const firebaseUser = await getFirebaseAdminUser(session.user.id);

  if (!firebaseUser) {
    throw new OrganizationMembershipAcceptanceError(
      "firebase-user-verification-unavailable",
      "GameDay could not verify this Firebase account.",
      503,
    );
  }

  if (normalizeEmail(firebaseUser.email) !== email) {
    throw new OrganizationMembershipAcceptanceError(
      "invited-email-required",
      "Sign in with the invited email address before accepting organization access.",
      403,
    );
  }

  if (
    invitedMemberships.some(
      (membership) => membership.role === "owner" || membership.role === "admin",
    ) &&
    !firebaseUser.emailVerified
  ) {
    throw new OrganizationMembershipAcceptanceError(
      "verified-email-required",
      "Verify the invited email address in Firebase before accepting owner or admin access.",
      403,
    );
  }

  const acceptedMemberships = await runFirestoreTransaction(
    async (transaction) => {
      const currentInvitations = (
        await Promise.all(
          invitedMemberships.map((membership) =>
            transaction.get<OrganizationMembership>(
              "organizationMemberships",
              membership.id,
            ),
          ),
        )
      ).filter(
        (membership): membership is OrganizationMembership =>
          membership !== null &&
          isOpenInvitation(membership) &&
          normalizeEmail(membership.email) === email,
      );
      const organizationIds = [
        ...new Set(
          currentInvitations.map((membership) => membership.organizationId),
        ),
      ];
      const organizationMembershipLists = await Promise.all(
        organizationIds.map((organizationId) =>
          transaction.list<OrganizationMembership>(
            "organizationMemberships",
            { scope: { organizationId } },
          ),
        ),
      );
      const now = new Date().toISOString();

      currentInvitations.forEach((membership) => {
        if (membership.uid && membership.uid !== session.user.id) {
          throw new OrganizationMembershipAcceptanceError(
            "membership-linked-to-another-user",
            "This invitation is already linked to another Firebase account.",
            409,
          );
        }

        const organizationIndex = organizationIds.indexOf(
          membership.organizationId,
        );
        const organizationMemberships =
          organizationMembershipLists[organizationIndex] ?? [];
        const duplicateMembership = organizationMemberships.find(
          (candidate) =>
            candidate.id !== membership.id &&
            candidate.uid === session.user.id &&
            candidate.status !== "removed",
        );

        if (duplicateMembership) {
          throw new OrganizationMembershipAcceptanceError(
            "membership-already-exists",
            "This Firebase account already has organization membership.",
            409,
          );
        }
      });

      return currentInvitations.map((membership) => {
        const acceptedMembership: OrganizationMembership = {
          ...membership,
          acceptedAt: now,
          status: "active",
          uid: session.user.id,
          updatedAt: now,
        };

        delete acceptedMembership.removedAt;
        delete acceptedMembership.removedByUid;
        delete acceptedMembership.suspendedAt;
        delete acceptedMembership.suspendedByUid;

        transaction.set(
          "organizationMemberships",
          acceptedMembership.id,
          acceptedMembership,
        );

        return acceptedMembership;
      });
    },
  );

  if (acceptedMemberships.length > 0) {
    console.info("Organization membership invitations accepted.", {
      membershipIds: acceptedMemberships.map((membership) => membership.id),
      organizationIds: acceptedMemberships.map(
        (membership) => membership.organizationId,
      ),
      uid: session.user.id,
    });
  }

  return acceptedMemberships;
}
