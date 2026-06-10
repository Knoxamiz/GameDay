export type MessageAudience = "admin" | "coach" | "parent";
export type MessagePriority = "Critical" | "Important" | "Informational";
export type MessageType =
  | "Direct Message"
  | "Emergency Alert"
  | "Event Announcement"
  | "Organization Announcement"
  | "Team Announcement";

export type GameDayMessage = {
  id: string;
  audience: MessageAudience[];
  content: string;
  eventId?: string;
  organizationId: string;
  priority: MessagePriority;
  recipientAthleteId?: string;
  recipientParentId?: string;
  senderId: string;
  subject: string;
  teamId?: string;
  timestamp: string;
  type: MessageType;
};

export const messages: GameDayMessage[] = [];

function byNewest(first: GameDayMessage, second: GameDayMessage) {
  return second.timestamp.localeCompare(first.timestamp);
}

export function getMessagesByAudience(
  audience: MessageAudience,
  organizationId?: string,
) {
  return messages
    .filter((message) => message.audience.includes(audience))
    .filter((message) =>
      organizationId ? message.organizationId === organizationId : true,
    )
    .sort(byNewest);
}

export function getMessagesByEventId(eventId: string) {
  return messages
    .filter((message) => message.eventId === eventId)
    .sort(byNewest);
}

export function getMessagesByTeamId(teamId: string) {
  return messages.filter((message) => message.teamId === teamId).sort(byNewest);
}

export function getMessagesByParentId(parentId: string) {
  return messages
    .filter((message) => message.recipientParentId === parentId)
    .sort(byNewest);
}

export function getMessagesByAthleteId(athleteId: string) {
  return messages
    .filter((message) => message.recipientAthleteId === athleteId)
    .sort(byNewest);
}

export const teamCommunicationItems = ["Team Messages", "Contact Coaches"];
