export type OrganizationMembershipRole = "owner" | "admin" | "coach" | "staff";

export type OrganizationMembershipStatus = "active" | "invited" | "suspended";

export type OrganizationMembership = {
  id: string;
  organizationId: string;
  uid: string;
  email: string;
  role: OrganizationMembershipRole;
  status: OrganizationMembershipStatus;
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
