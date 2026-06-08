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

export const messages: GameDayMessage[] = [
  {
    id: "message-parent-uniform-pickup",
    audience: ["parent"],
    content: "Uniform pickup Friday",
    organizationId: "black-diamonds",
    priority: "Important",
    recipientParentId: "jennifer-smith",
    senderId: "black-diamonds",
    subject: "Uniform Pickup",
    timestamp: "2026-06-01T09:00:00-04:00",
    type: "Organization Announcement",
  },
  {
    id: "message-parent-tournament-updated",
    audience: ["parent"],
    content: "Tournament schedule updated",
    organizationId: "black-diamonds",
    priority: "Important",
    recipientParentId: "jennifer-smith",
    senderId: "black-diamonds",
    subject: "Tournament Schedule",
    timestamp: "2026-06-01T11:00:00-04:00",
    type: "Organization Announcement",
  },
  {
    id: "message-practice-water",
    audience: ["coach", "parent"],
    content: "Bring water bottles",
    eventId: "practice-jun-2",
    organizationId: "black-diamonds",
    priority: "Informational",
    senderId: "coach-mick",
    subject: "Practice Reminder",
    teamId: "black-diamonds-12u",
    timestamp: "2026-06-02T12:00:00-04:00",
    type: "Event Announcement",
  },
  {
    id: "message-practice-jersey",
    audience: ["coach", "parent"],
    content: "Wear black jersey",
    eventId: "practice-jun-2",
    organizationId: "black-diamonds",
    priority: "Informational",
    senderId: "coach-mick",
    subject: "Practice Uniform",
    teamId: "black-diamonds-12u",
    timestamp: "2026-06-02T12:05:00-04:00",
    type: "Event Announcement",
  },
  {
    id: "message-practice-field",
    audience: ["coach", "parent"],
    content: "Field 2 tonight",
    eventId: "practice-jun-2",
    organizationId: "black-diamonds",
    priority: "Important",
    senderId: "coach-mick",
    subject: "Field Update",
    teamId: "black-diamonds-12u",
    timestamp: "2026-06-02T15:42:00-04:00",
    type: "Event Announcement",
  },
  {
    id: "message-coach-missing-physical",
    audience: ["coach"],
    content: "2 Players Missing Physical",
    organizationId: "black-diamonds",
    priority: "Important",
    senderId: "black-diamonds",
    subject: "Registration Concern",
    teamId: "black-diamonds-12u",
    timestamp: "2026-06-02T08:00:00-04:00",
    type: "Direct Message",
  },
  {
    id: "message-coach-parent-unread",
    audience: ["coach"],
    content: "1 Parent Message Unread",
    organizationId: "black-diamonds",
    priority: "Informational",
    senderId: "jennifer-smith",
    subject: "Parent Message",
    teamId: "black-diamonds-12u",
    timestamp: "2026-06-02T08:15:00-04:00",
    type: "Direct Message",
  },
  {
    id: "message-coach-roster-due",
    audience: ["coach"],
    content: "Tournament Roster Due Friday",
    organizationId: "black-diamonds",
    priority: "Important",
    senderId: "black-diamonds",
    subject: "Roster Deadline",
    teamId: "black-diamonds-12u",
    timestamp: "2026-06-02T08:30:00-04:00",
    type: "Team Announcement",
  },
  {
    id: "message-admin-unread-coach",
    audience: ["admin"],
    content: "2 Unread Coach Messages",
    organizationId: "black-diamonds",
    priority: "Important",
    senderId: "coach-mick",
    subject: "Coach Messages",
    timestamp: "2026-06-02T09:00:00-04:00",
    type: "Direct Message",
  },
  {
    id: "message-admin-draft",
    audience: ["admin"],
    content: "1 Organization Announcement Draft",
    organizationId: "black-diamonds",
    priority: "Informational",
    senderId: "black-diamonds",
    subject: "Announcement Draft",
    timestamp: "2026-06-02T09:15:00-04:00",
    type: "Organization Announcement",
  },
  {
    id: "message-team-tournament-posted",
    audience: ["coach", "parent"],
    content: "Tournament schedule posted",
    organizationId: "black-diamonds",
    priority: "Important",
    senderId: "coach-mick",
    subject: "Tournament Posted",
    teamId: "black-diamonds-12u",
    timestamp: "2026-06-01T12:00:00-04:00",
    type: "Team Announcement",
  },
  {
    id: "message-team-uniform-pickup",
    audience: ["coach", "parent"],
    content: "Uniform pickup Friday",
    organizationId: "black-diamonds",
    priority: "Important",
    senderId: "black-diamonds",
    subject: "Uniform Pickup",
    teamId: "black-diamonds-12u",
    timestamp: "2026-06-01T12:15:00-04:00",
    type: "Team Announcement",
  },
  {
    id: "message-team-field-change",
    audience: ["coach", "parent"],
    content: "Field change for Tuesday",
    organizationId: "black-diamonds",
    priority: "Important",
    senderId: "coach-mick",
    subject: "Field Change",
    teamId: "black-diamonds-12u",
    timestamp: "2026-06-01T12:30:00-04:00",
    type: "Team Announcement",
  },
  {
    id: "message-emma-roster",
    audience: ["parent"],
    content: "Tournament roster posted",
    organizationId: "black-diamonds",
    priority: "Informational",
    recipientAthleteId: "emma-smith",
    recipientParentId: "jennifer-smith",
    senderId: "coach-mick",
    subject: "Roster Posted",
    teamId: "black-diamonds-12u",
    timestamp: "2026-06-01T14:00:00-04:00",
    type: "Team Announcement",
  },
  {
    id: "message-olivia-tournament-arrival",
    audience: ["parent"],
    content: "Players should arrive 45 minutes before first game.",
    organizationId: "black-diamonds",
    priority: "Important",
    recipientAthleteId: "olivia-smith",
    recipientParentId: "jennifer-smith",
    senderId: "coach-bennett",
    subject: "Tournament Arrival",
    teamId: "black-diamonds-10u",
    timestamp: "2026-06-01T14:30:00-04:00",
    type: "Team Announcement",
  },
  {
    id: "message-mason-registration",
    audience: ["parent"],
    content: "Registration opens next week for returning athletes.",
    organizationId: "black-diamonds",
    priority: "Informational",
    recipientAthleteId: "mason-smith",
    recipientParentId: "jennifer-smith",
    senderId: "black-diamonds",
    subject: "Registration Opens",
    teamId: "black-diamonds-hs",
    timestamp: "2026-06-01T15:00:00-04:00",
    type: "Organization Announcement",
  },
];

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
