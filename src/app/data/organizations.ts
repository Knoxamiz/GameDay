export type Organization = {
  adminIds?: string[];
  createdAt?: string;
  createdByUid?: string;
  id: string;
  name: string;
  ownerUid?: string;
  status: {
    registeredPlayers: number;
    activeTeams: number;
    coaches: number;
    upcomingEvents: number;
  };
  updatedAt?: string;
};

export const organizations: Organization[] = [
  {
    id: "black-diamonds",
    name: "Black Diamonds Girls Flag Football",
    status: {
      registeredPlayers: 0,
      activeTeams: 0,
      coaches: 0,
      upcomingEvents: 0,
    },
  },
];

export const blackDiamondsOrganization = organizations[0];

export function getOrganizationById(organizationId: string) {
  return organizations.find((organization) => organization.id === organizationId);
}
