export type TeamLifecycleStatus = "active" | "inactive" | "archived";

export type Team = {
  ageGroup?: string;
  archivedAt?: string;
  archivedByUid?: string;
  createdAt?: string;
  createdByUid?: string;
  division?: string;
  id: string;
  organizationId: string;
  name: string;
  label: string;
  // Legacy read compatibility. New writes use the canonical status field.
  lifecycleStatus?: "Active" | "Inactive";
  playerCount: number;
  coachIds: string[];
  athleteIds: string[];
  rosterPreviewIds: string[];
  eventIds: string[];
  nextEventId?: string;
  season?: string;
  status: TeamLifecycleStatus | string[];
  teamId?: string;
  updatedAt?: string;
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

export function getTeamLifecycleStatus(team: Team): TeamLifecycleStatus {
  if (
    team.status === "active" ||
    team.status === "inactive" ||
    team.status === "archived"
  ) {
    return team.status;
  }

  if (Array.isArray(team.status)) {
    const legacyStatus = team.status.find((status) =>
      ["active", "inactive", "archived"].includes(status.toLowerCase()),
    );

    if (legacyStatus) {
      return legacyStatus.toLowerCase() as TeamLifecycleStatus;
    }
  }

  return team.lifecycleStatus === "Inactive" ? "inactive" : "active";
}

export function isActiveTeam(team: Team) {
  return getTeamLifecycleStatus(team) === "active";
}

export function isArchivedTeam(team: Team) {
  return getTeamLifecycleStatus(team) === "archived";
}

export function getTeamStatusLabel(team: Team) {
  const status = getTeamLifecycleStatus(team);

  return `${status.charAt(0).toUpperCase()}${status.slice(1)}`;
}

export function getTeamsNeedingCoaches(teamList: Team[] = teams) {
  return teamList.filter(
    (team) => isActiveTeam(team) && team.coachIds.length === 0,
  );
}
