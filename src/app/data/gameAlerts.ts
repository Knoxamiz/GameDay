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

export const gameAlerts: GameAlert[] = [];

export function getGameAlertByEventId(eventId: string) {
  return gameAlerts.find((gameAlert) => gameAlert.eventId === eventId);
}
