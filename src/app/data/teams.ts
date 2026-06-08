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

export const teams: Team[] = [
  {
    id: "black-diamonds-10u",
    organizationId: "black-diamonds",
    name: "Black Diamonds 10U",
    label: "10U Girls",
    playerCount: 18,
    coachIds: ["coach-bennett", "assistant-coach-rae"],
    athleteIds: ["olivia-smith"],
    rosterPreviewIds: ["olivia-smith"],
    eventIds: ["tournament-saturday-10u", "team-meeting-10u"],
    nextEventId: "tournament-saturday-10u",
    status: ["18 Registered"],
  },
  {
    id: "black-diamonds-12u",
    organizationId: "black-diamonds",
    name: "Black Diamonds 12U",
    label: "12U Girls",
    playerCount: 22,
    coachIds: ["coach-mick", "assistant-coach-jen"],
    athleteIds: ["emma-smith", "sarah-jones", "katie-brown"],
    rosterPreviewIds: ["emma-smith", "sarah-jones", "katie-brown"],
    eventIds: ["practice-jun-2", "practice-jun-5", "tournament-jun-7"],
    nextEventId: "practice-jun-2",
    status: [
      "22 Registered",
      "18 Confirmed For Practice",
      "2 Need Ride",
      "2 Missing Physical",
    ],
  },
  {
    id: "black-diamonds-14u",
    organizationId: "black-diamonds",
    name: "Black Diamonds 14U",
    label: "14U Girls",
    playerCount: 20,
    coachIds: [],
    athleteIds: [],
    rosterPreviewIds: [],
    eventIds: ["tournament-saturday-14u"],
    nextEventId: "tournament-saturday-14u",
    status: ["20 Registered"],
  },
  {
    id: "black-diamonds-hs",
    organizationId: "black-diamonds",
    name: "Black Diamonds HS",
    label: "High School",
    playerCount: 31,
    coachIds: ["coach-daniels"],
    athleteIds: ["mason-smith"],
    rosterPreviewIds: ["mason-smith"],
    eventIds: ["offseason-training-hs"],
    status: ["31 Registered"],
  },
];

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
