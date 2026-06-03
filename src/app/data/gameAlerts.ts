export type GameAlertStatus = "Scheduled" | "Live" | "Final";

export type GameAlertSport = "Flag Football" | "Basketball" | "Soccer";

export type GameAlert = {
  eventId: string;
  sport: GameAlertSport;
  status: GameAlertStatus;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  reporterName?: string;
  latestUpdate: string;
};

export const gameAlertScoringPresets: Record<GameAlertSport, number[]> = {
  "Flag Football": [1, 2, 6, 7, -1],
  Basketball: [1, 2, 3, -1],
  Soccer: [1, -1],
};

export const gameAlerts: GameAlert[] = [
  {
    eventId: "tournament-saturday-10u",
    sport: "Flag Football",
    status: "Live",
    homeTeamName: "Black Diamonds 10U",
    awayTeamName: "Wildcats 10U",
    homeScore: 18,
    awayScore: 12,
    reporterName: "Sarah Smith",
    latestUpdate: "Touchdown Black Diamonds",
  },
  {
    eventId: "tournament-saturday-14u",
    sport: "Flag Football",
    status: "Final",
    homeTeamName: "Black Diamonds 14U",
    awayTeamName: "Wildcats 14U",
    homeScore: 24,
    awayScore: 18,
    reporterName: "Mike Jones",
    latestUpdate: "Final score posted",
  },
  {
    eventId: "tournament-jun-7",
    sport: "Flag Football",
    status: "Scheduled",
    homeTeamName: "Black Diamonds 12U",
    awayTeamName: "Wildcats 12U",
    homeScore: 0,
    awayScore: 0,
    reporterName: "Team Manager",
    latestUpdate: "Game scheduled",
  },
];

export function getGameAlertByEventId(eventId: string) {
  return gameAlerts.find((gameAlert) => gameAlert.eventId === eventId);
}
