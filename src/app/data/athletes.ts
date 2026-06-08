export type Athlete = {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  dateOfBirth: string;
  grade: string;
  jerseySize: string;
  parentId: string;
  school: string;
  teamId: string;
  nextEventId?: string;
  upcomingEventIds: string[];
  registrationId: string;
};

export const athletes: Athlete[] = [
  {
    id: "emma-smith",
    firstName: "Emma",
    lastName: "Smith",
    name: "Emma Smith",
    dateOfBirth: "2014-04-18",
    grade: "6",
    jerseySize: "Youth L",
    parentId: "jennifer-smith",
    school: "Winslow Township Middle School",
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
    dateOfBirth: "2016-09-02",
    grade: "4",
    jerseySize: "Youth M",
    parentId: "jennifer-smith",
    school: "Winslow Township Elementary",
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
    dateOfBirth: "2009-11-12",
    grade: "10",
    jerseySize: "Adult M",
    parentId: "jennifer-smith",
    school: "Winslow Township High School",
    teamId: "black-diamonds-hs",
    upcomingEventIds: ["offseason-training-hs"],
    registrationId: "registration-mason-smith",
  },
  {
    id: "sarah-jones",
    firstName: "Sarah",
    lastName: "Jones",
    name: "Sarah Jones",
    dateOfBirth: "2014-07-08",
    grade: "6",
    jerseySize: "Youth L",
    parentId: "sarah-jones-parent",
    school: "Winslow Township Middle School",
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
    dateOfBirth: "2015-01-26",
    grade: "5",
    jerseySize: "Youth L",
    parentId: "katie-brown-parent",
    school: "Winslow Township Middle School",
    teamId: "black-diamonds-12u",
    nextEventId: "practice-jun-2",
    upcomingEventIds: ["practice-jun-2", "practice-jun-5", "tournament-jun-7"],
    registrationId: "registration-katie-brown",
  },
];

export function getAthleteById(athleteId: string) {
  return athletes.find((athlete) => athlete.id === athleteId);
}

export function getAthletesByParentId(parentId: string) {
  return athletes.filter((athlete) => athlete.parentId === parentId);
}

export function getAthletesByIds(athleteIds: string[]) {
  return athleteIds
    .map((athleteId) => getAthleteById(athleteId))
    .filter((athlete): athlete is Athlete => Boolean(athlete));
}
