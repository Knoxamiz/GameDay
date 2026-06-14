export type CoachAssignmentStatus = "active" | "inactive" | "archived";

export type CoachAssignmentRole = "coach" | "assistant" | "staff";

export type CoachAssignment = {
  archivedAt?: string;
  archivedByUid?: string;
  coachId: string;
  createdAt: string;
  createdByUid: string;
  email: string;
  id: string;
  organizationId: string;
  role: CoachAssignmentRole;
  status: CoachAssignmentStatus;
  teamIds: string[];
  uid?: string;
  updatedAt: string;
};

export function isActiveCoachAssignment(
  assignment: CoachAssignment | null | undefined,
) {
  return assignment?.status === "active";
}

export function isArchivedCoachAssignment(
  assignment: CoachAssignment | null | undefined,
) {
  return assignment?.status === "archived";
}

export function getCoachAssignmentStatusLabel(
  assignment: CoachAssignment,
) {
  return `${assignment.status.charAt(0).toUpperCase()}${assignment.status.slice(1)}`;
}
