export type Coach = {
  id: string;
  name: string;
  email: string;
  teamIds: string[];
};

export const coaches: Coach[] = [
  {
    id: "coach-mick",
    name: "Coach Mick",
    email: "coach.mick@example.com",
    teamIds: ["black-diamonds-12u"],
  },
  {
    id: "assistant-coach-jen",
    name: "Assistant Coach Jen",
    email: "coach.jen@example.com",
    teamIds: ["black-diamonds-12u"],
  },
  {
    id: "coach-bennett",
    name: "Coach Bennett",
    email: "coach.bennett@example.com",
    teamIds: ["black-diamonds-10u"],
  },
  {
    id: "assistant-coach-rae",
    name: "Assistant Coach Rae",
    email: "coach.rae@example.com",
    teamIds: ["black-diamonds-10u"],
  },
  {
    id: "coach-daniels",
    name: "Coach Daniels",
    email: "coach.daniels@example.com",
    teamIds: ["black-diamonds-hs"],
  },
];

export function getCoachById(coachId: string) {
  return coaches.find((coach) => coach.id === coachId);
}

export function getCoachesByIds(coachIds: string[]) {
  return coachIds
    .map((coachId) => getCoachById(coachId))
    .filter((coach): coach is Coach => Boolean(coach));
}
