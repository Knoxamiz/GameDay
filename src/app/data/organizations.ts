export type Organization = {
  id: string;
  name: string;
  status: {
    registeredPlayers: number;
    activeTeams: number;
    coaches: number;
    upcomingEvents: number;
  };
};

export const organizations: Organization[] = [
  {
    id: "black-diamonds",
    name: "Black Diamonds Girls Flag Football",
    status: {
      registeredPlayers: 127,
      activeTeams: 5,
      coaches: 12,
      upcomingEvents: 18,
    },
  },
];

export const blackDiamondsOrganization = organizations[0];

export function getOrganizationById(organizationId: string) {
  return organizations.find((organization) => organization.id === organizationId);
}
