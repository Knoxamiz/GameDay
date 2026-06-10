export type Athlete = {
  id: string;
  organizationId?: string;
  firstName: string;
  lastName: string;
  name: string;
  dateOfBirth: string;
  grade: string;
  jerseySize: string;
  parentId: string;
  parentUid?: string;
  ownerUid?: string;
  createdByUid?: string;
  createdAt?: string;
  source?: string;
  school: string;
  teamId: string;
  nextEventId?: string;
  upcomingEventIds?: string[];
  registrationId: string;
  updatedAt?: string;
};

export const athletes: Athlete[] = [];

export function getAthleteById(athleteId: string) {
  return athletes.find((athlete) => athlete.id === athleteId);
}

export function getAthletesByParentId(parentId: string) {
  return athletes.filter((athlete) => athlete.parentId === parentId);
}

export function getAthletesByIds(athleteIds?: string[] | null) {
  const safeAthleteIds = Array.isArray(athleteIds) ? athleteIds : [];

  return safeAthleteIds
    .map((athleteId) => getAthleteById(athleteId))
    .filter((athlete): athlete is Athlete => Boolean(athlete));
}
