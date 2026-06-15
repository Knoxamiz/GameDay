export type OrganizationWorkspaceType = "organization" | "single_team";

export type Organization = {
  adminIds?: string[];
  adminUids?: string[];
  createdAt?: string;
  createdByUid?: string;
  id: string;
  name: string;
  organizationId?: string;
  ownerUid?: string;
  ownerUids?: string[];
  slug?: string;
  status: {
    registeredPlayers: number;
    activeTeams: number;
    coaches: number;
    upcomingEvents: number;
  };
  updatedAt?: string;
  workspaceType?: OrganizationWorkspaceType;
};

export const organizations: Organization[] = [];

export function getOrganizationById(organizationId: string) {
  return organizations.find((organization) => organization.id === organizationId);
}

export function getOrganizationWorkspaceType(
  organization: Organization | null | undefined,
): OrganizationWorkspaceType {
  return organization?.workspaceType === "single_team"
    ? "single_team"
    : "organization";
}

export function getOrganizationWorkspaceTypeLabel(
  organization: Organization | null | undefined,
) {
  return getOrganizationWorkspaceType(organization) === "single_team"
    ? "Individual Team"
    : "Organization";
}
