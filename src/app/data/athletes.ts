export type Athlete = {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  teamId: string;
  nextEventId?: string;
  upcomingEventIds: string[];
  registrationId: string;
};

export const parentHomeAthleteIds = [
  "emma-smith",
  "olivia-smith",
  "mason-smith",
];

export const athletes: Athlete[] = [
  {
    id: "emma-smith",
    firstName: "Emma",
    lastName: "Smith",
    name: "Emma Smith",
    teamId: "black-diamonds-12u",
    nextEventId: "practice-jun-2",
    upcomingEventIds: ["practice-jun-2", "practice-jun-5", "tournament-jun-7"],
    registrationId: "registration-emma-smith",
  },
  {
    id: "olivia-smith",
    firstName: "Olivia",
    lastName: "Smith",
    name: "Olivia Smith",
    teamId: "black-diamonds-10u",
    nextEventId: "tournament-saturday-10u",
    upcomingEventIds: ["tournament-saturday-10u", "team-meeting-10u"],
    registrationId: "registration-olivia-smith",
  },
  {
    id: "mason-smith",
    firstName: "Mason",
    lastName: "Smith",
    name: "Mason Smith",
    teamId: "black-diamonds-hs",
    upcomingEventIds: ["offseason-training-hs"],
    registrationId: "registration-mason-smith",
  },
  {
    id: "sarah-jones",
    firstName: "Sarah",
    lastName: "Jones",
    name: "Sarah Jones",
    teamId: "black-diamonds-12u",
    nextEventId: "practice-jun-2",
    upcomingEventIds: ["practice-jun-2", "practice-jun-5", "tournament-jun-7"],
    registrationId: "registration-sarah-jones",
  },
  {
    id: "katie-brown",
    firstName: "Katie",
    lastName: "Brown",
    name: "Katie Brown",
    teamId: "black-diamonds-12u",
    nextEventId: "practice-jun-2",
    upcomingEventIds: ["practice-jun-2", "practice-jun-5", "tournament-jun-7"],
    registrationId: "registration-katie-brown",
  },
];

export function getAthleteById(athleteId: string) {
  return athletes.find((athlete) => athlete.id === athleteId);
}

export function getAthletesByIds(athleteIds: string[]) {
  return athleteIds
    .map((athleteId) => getAthleteById(athleteId))
    .filter((athlete): athlete is Athlete => Boolean(athlete));
}
