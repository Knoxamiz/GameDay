export type OrganizationMembershipRole = "owner" | "admin" | "coach" | "staff";

export type OrganizationMembershipStatus =
  | "active"
  | "invited"
  | "removed"
  | "suspended";

export type OrganizationMembership = {
  id: string;
  organizationId: string;
  acceptedAt?: string;
  email: string;
  invitedByUid?: string;
  role: OrganizationMembershipRole;
  removedAt?: string;
  removedByUid?: string;
  status: OrganizationMembershipStatus;
  suspendedAt?: string;
  suspendedByUid?: string;
  uid?: string;
  createdByUid: string;
  createdAt: string;
  updatedAt: string;
};

export const organizationMemberships: OrganizationMembership[] = [];

export function isActiveOrganizationMembership(
  membership: OrganizationMembership | null | undefined,
): membership is OrganizationMembership {
  return membership?.status === "active";
}

export function canManageOrganizationMembership(
  membership: OrganizationMembership | null | undefined,
) {
  return Boolean(
    isActiveOrganizationMembership(membership) &&
      (membership.role === "owner" || membership.role === "admin"),
  );
}
