export type CoachAssignmentStatus = "Active" | "Inactive";

export type Coach = {
  id: string;
  coachId?: string;
  uid?: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  organizationId: string;
  organizationIds?: string[];
  role?: "coach";
  status?: CoachAssignmentStatus;
  teamIds: string[];
  createdAt?: string;
  createdByUid?: string;
  updatedAt?: string;
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
  organizationIds: [],
  phone: "",
  role: "coach",
  status: "Inactive",
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
  return coaches.filter(
    (coach) =>
      coach.organizationId === organizationId ||
      getCoachOrganizationIds(coach).includes(organizationId),
  );
}

export function getCoachOrganizationIds(coach: Coach) {
  return [
    ...new Set([
      ...(Array.isArray(coach.organizationIds) ? coach.organizationIds : []),
      coach.organizationId,
    ].filter(Boolean)),
  ];
}

export function isActiveCoach(coach: Coach | null | undefined) {
  return Boolean(coach && coach.status !== "Inactive");
}
