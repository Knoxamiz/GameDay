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
};

export const organizations: Organization[] = [];

export function getOrganizationById(organizationId: string) {
  return organizations.find((organization) => organization.id === organizationId);
}
