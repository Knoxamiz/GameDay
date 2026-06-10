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
