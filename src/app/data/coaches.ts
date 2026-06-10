export type Coach = {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  organizationId: string;
  teamIds: string[];
};

export const currentCoachId = "";

export const coaches: Coach[] = [];

const emptyCoach: Coach = {
  email: "",
  firstName: "Coach",
  id: "",
  lastName: "",
  name: "GameDay Coach",
  organizationId: "",
  phone: "",
  teamIds: [],
};

export function getCoachById(coachId: string) {
  return coaches.find((coach) => coach.id === coachId);
}

export function getCurrentCoach() {
  return getCoachById(currentCoachId) ?? emptyCoach;
}

export function getCoachesByIds(coachIds?: string[] | null) {
  const safeCoachIds = Array.isArray(coachIds) ? coachIds : [];

  return safeCoachIds
    .map((coachId) => getCoachById(coachId))
    .filter((coach): coach is Coach => Boolean(coach));
}

export function getCoachesByOrganizationId(organizationId: string) {
  return coaches.filter((coach) => coach.organizationId === organizationId);
}
