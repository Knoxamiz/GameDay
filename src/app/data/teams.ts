export type Team = {
  id: string;
  organizationId: string;
  name: string;
  label: string;
  playerCount: number;
  coachIds: string[];
  athleteIds: string[];
  rosterPreviewIds: string[];
  eventIds: string[];
  nextEventId?: string;
  status: string[];
};

export const teams: Team[] = [];

export function getTeamById(teamId: string) {
  return teams.find((team) => team.id === teamId);
}

export function getTeamsByOrganizationId(organizationId: string) {
  return teams.filter((team) => team.organizationId === organizationId);
}

export function getTeamsByCoachId(coachId: string) {
  return teams.filter((team) => team.coachIds.includes(coachId));
}

export function getTeamsNeedingCoaches(teamList: Team[] = teams) {
  return teamList.filter((team) => team.coachIds.length === 0);
}
