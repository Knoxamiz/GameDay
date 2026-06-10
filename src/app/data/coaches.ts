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

export const currentCoachId = "coach-mick";

export const coaches: Coach[] = [
  {
    id: "coach-mick",
    firstName: "Mick",
    lastName: "Daniels",
    name: "Coach Mick",
    email: "coach.mick@example.com",
    phone: "555-0201",
    organizationId: "black-diamonds",
    teamIds: ["black-diamonds-12u"],
  },
  {
    id: "assistant-coach-jen",
    firstName: "Jen",
    lastName: "Rivera",
    name: "Assistant Coach Jen",
    email: "coach.jen@example.com",
    phone: "555-0202",
    organizationId: "black-diamonds",
    teamIds: ["black-diamonds-12u"],
  },
  {
    id: "coach-bennett",
    firstName: "Bennett",
    lastName: "Cole",
    name: "Coach Bennett",
    email: "coach.bennett@example.com",
    phone: "555-0203",
    organizationId: "black-diamonds",
    teamIds: ["black-diamonds-10u"],
  },
  {
    id: "assistant-coach-rae",
    firstName: "Rae",
    lastName: "Morgan",
    name: "Assistant Coach Rae",
    email: "coach.rae@example.com",
    phone: "555-0204",
    organizationId: "black-diamonds",
    teamIds: ["black-diamonds-10u"],
  },
  {
    id: "coach-daniels",
    firstName: "Daniels",
    lastName: "Reed",
    name: "Coach Daniels",
    email: "coach.daniels@example.com",
    phone: "555-0205",
    organizationId: "black-diamonds",
    teamIds: ["black-diamonds-hs"],
  },
];

export function getCoachById(coachId: string) {
  return coaches.find((coach) => coach.id === coachId);
}

export function getCurrentCoach() {
  return getCoachById(currentCoachId) ?? coaches[0];
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
