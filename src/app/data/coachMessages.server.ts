import type { AuthSessionSource } from "../infrastructure/auth";
import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import { FirebaseAdminAuthProvider } from "../infrastructure/firebaseAuth";
import { runFirestoreTransaction } from "../infrastructure/firebaseRepositories";
import { resolveCoachAssignmentScope } from "./coachAssignments.server";
import {
  eventHasTeamId,
  type GameDayEvent,
} from "./events";
import { createLiveRecordId } from "./liveIdentity";
import type {
  GameDayMessage,
  MessageAudience,
  MessagePriority,
} from "./messages";
import { isActiveTeam, type Team } from "./teams";

export type CoachTeamMessagePayload = {
  audience?: MessageAudience[];
  content: string;
  eventId?: string;
  priority?: MessagePriority;
  subject: string;
  teamId: string;
};

export type CoachTeamMessageResult = {
  id: string;
  message: string;
  source: "firestore";
  teamMessage: GameDayMessage;
};

type CoachTeamMessageWriteOptions = {
  sessionSource: AuthSessionSource;
};

export class CoachTeamMessageError extends Error {
  constructor(
    readonly reason: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "CoachTeamMessageError";
  }
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function createCoachTeamMessageError(
  reason: string,
  message: string,
  status = 400,
): never {
  throw new CoachTeamMessageError(reason, message, status);
}

function normalizeAudienceList(value: unknown): MessageAudience[] {
  const values = Array.isArray(value) ? value : [];
  const allowedAudiences = new Set<MessageAudience>(["coach", "parent"]);

  return [
    ...new Set(
      values
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item): item is MessageAudience =>
          allowedAudiences.has(item as MessageAudience),
        ),
    ),
  ];
}

function normalizePriority(value: unknown): MessagePriority {
  if (
    value === "Critical" ||
    value === "Important" ||
    value === "Informational"
  ) {
    return value;
  }

  return "Informational";
}

async function requireCoachMessageSession(source: AuthSessionSource) {
  if (!getFirebaseAdminConfig()) {
    createCoachTeamMessageError(
      "firebase-unavailable",
      "Team messaging is not available until Firebase is configured.",
      503,
    );
  }

  const authProvider = new FirebaseAdminAuthProvider();
  const session = await authProvider.verifySession(source);

  if (!session) {
    createCoachTeamMessageError(
      "coach-session-required",
      "Please sign in as a coach before sending team messages.",
      403,
    );
  }

  const scope = await resolveCoachAssignmentScope(session);

  if (scope.teamIds.length === 0 || scope.organizationIds.length === 0) {
    createCoachTeamMessageError(
      "coach-team-scope-required",
      "This coach account is not assigned to an active team.",
      403,
    );
  }

  return { scope, session };
}

export async function createCoachTeamMessage(
  payload: CoachTeamMessagePayload,
  options: CoachTeamMessageWriteOptions,
): Promise<CoachTeamMessageResult> {
  const { scope, session } = await requireCoachMessageSession(
    options.sessionSource,
  );
  const teamId = normalizeText(payload.teamId);
  const eventId = normalizeText(payload.eventId);
  const subject = normalizeText(payload.subject);
  const content = normalizeText(payload.content);
  const audience = normalizeAudienceList(payload.audience);
  const priority = normalizePriority(payload.priority);

  if (!teamId) {
    createCoachTeamMessageError(
      "team-required",
      "Choose a team before sending a message.",
      400,
    );
  }

  if (!scope.teamIds.includes(teamId)) {
    createCoachTeamMessageError(
      "coach-team-access-required",
      "This coach cannot message that team.",
      403,
    );
  }

  if (!subject) {
    createCoachTeamMessageError(
      "message-subject-required",
      "Add a message title.",
      400,
    );
  }

  if (!content) {
    createCoachTeamMessageError(
      "message-content-required",
      "Add message details.",
      400,
    );
  }

  const finalAudience =
    audience.length > 0
      ? audience
      : (["parent"] satisfies MessageAudience[]);
  const now = new Date().toISOString();

  const { teamMessage, teamName } = await runFirestoreTransaction(
    async (transaction) => {
      const [team, event] = await Promise.all([
        transaction.get<Team>("teams", teamId),
        eventId
          ? transaction.get<GameDayEvent>("events", eventId)
          : Promise.resolve(null),
      ]);

      if (
        !team ||
        !isActiveTeam(team) ||
        !scope.organizationIds.includes(team.organizationId)
      ) {
        createCoachTeamMessageError(
          "team-not-found",
          "Choose an active assigned team before sending a message.",
          404,
        );
      }

      if (
        eventId &&
        (!event ||
          event.organizationId !== team.organizationId ||
          !eventHasTeamId(event, team.id))
      ) {
        createCoachTeamMessageError(
          "event-not-found",
          "Choose an event for this team before sending an event update.",
          404,
        );
      }

      const nextTeamMessage: GameDayMessage = {
        audience: finalAudience,
        content,
        eventId: eventId || undefined,
        id: createLiveRecordId(
          eventId ? "coach-event-message" : "coach-team-message",
          [team.id, eventId, subject],
        ),
        organizationId: team.organizationId,
        priority,
        senderId: session.user.id,
        subject,
        teamId: team.id,
        timestamp: now,
        type: eventId ? "Event Announcement" : "Team Announcement",
      };

      transaction.create("messages", nextTeamMessage.id, nextTeamMessage);

      return {
        teamMessage: nextTeamMessage,
        teamName: team.name,
      };
    },
  );

  console.info("Coach team message created.", {
    audience: teamMessage.audience,
    eventId: teamMessage.eventId,
    messageId: teamMessage.id,
    senderUid: session.user.id,
    teamId,
  });

  return {
    id: teamMessage.id,
    message: `Message sent to ${teamName}.`,
    source: "firestore",
    teamMessage,
  };
}
