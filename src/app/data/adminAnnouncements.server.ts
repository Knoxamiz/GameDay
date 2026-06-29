import type { AuthSessionSource } from "../infrastructure/auth";
import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import { runFirestoreTransaction } from "../infrastructure/firebaseRepositories";
import {
  canManageOrganization,
  canUseAdminSetup,
  resolveAdminOrganizationScope,
  verifyAdminAccessSession,
} from "./adminOrganizationScope.server";
import { createLiveRecordId } from "./liveIdentity";
import {
  getEventTeamIds,
  type GameDayEvent,
} from "./events";
import type {
  GameDayMessage,
  MessageAudience,
  MessagePriority,
} from "./messages";
import type { Organization } from "./organizations";
import type { Team } from "./teams";

export type AdminAnnouncementPayload = {
  audience?: MessageAudience[];
  content: string;
  eventId?: string;
  organizationId: string;
  priority?: MessagePriority;
  subject: string;
  teamId?: string;
};

export type AdminAnnouncementResult = {
  announcement: GameDayMessage;
  id: string;
  message: string;
  source: "firestore";
};

type AdminAnnouncementWriteOptions = {
  activeOrganizationId?: string;
  sessionSource: AuthSessionSource;
};

export class AdminAnnouncementError extends Error {
  constructor(
    readonly reason: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "AdminAnnouncementError";
  }
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeAudienceList(value: unknown): MessageAudience[] {
  const values = Array.isArray(value) ? value : [];
  const allowedAudiences = new Set<MessageAudience>([
    "admin",
    "coach",
    "parent",
  ]);

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

function createAdminAnnouncementError(
  reason: string,
  message: string,
  status = 400,
): never {
  throw new AdminAnnouncementError(reason, message, status);
}

async function requireAdminAnnouncementSession(source: AuthSessionSource) {
  if (!getFirebaseAdminConfig()) {
    createAdminAnnouncementError(
      "firebase-unavailable",
      "Announcements are not available until Firebase is configured.",
      503,
    );
  }

  const session = await verifyAdminAccessSession(source);

  if (!session) {
    createAdminAnnouncementError(
      "admin-session-required",
      "Please sign in as an admin before creating announcements.",
      403,
    );
  }

  const scope = await resolveAdminOrganizationScope(session);

  if (!canUseAdminSetup(scope)) {
    createAdminAnnouncementError(
      "admin-announcement-capability-required",
      "This admin cannot create organization announcements.",
      403,
    );
  }

  if (scope.organizationIds.length === 0) {
    createAdminAnnouncementError(
      "admin-organization-scope-required",
      "Create an organization before creating announcements.",
      403,
    );
  }

  return scope;
}

export async function createAdminAnnouncement(
  payload: AdminAnnouncementPayload,
  options: AdminAnnouncementWriteOptions,
): Promise<AdminAnnouncementResult> {
  const scope = await requireAdminAnnouncementSession(options.sessionSource);
  const organizationId = normalizeText(payload.organizationId);
  const activeOrganizationId = normalizeText(options.activeOrganizationId);
  const eventId = normalizeText(payload.eventId);
  const teamId = normalizeText(payload.teamId);
  const subject = normalizeText(payload.subject);
  const content = normalizeText(payload.content);
  const audience = normalizeAudienceList(payload.audience);
  const priority = normalizePriority(payload.priority);

  if (!organizationId) {
    createAdminAnnouncementError(
      "organization-required",
      "Choose an organization before creating an announcement.",
      400,
    );
  }

  if (activeOrganizationId && activeOrganizationId !== organizationId) {
    createAdminAnnouncementError(
      "active-organization-mismatch",
      "Open the organization workspace before creating an announcement.",
      403,
    );
  }

  if (!canManageOrganization(scope, organizationId)) {
    createAdminAnnouncementError(
      "admin-organization-access-required",
      "This admin cannot create announcements for that organization.",
      403,
    );
  }

  if (!subject) {
    createAdminAnnouncementError(
      "announcement-subject-required",
      "Add an announcement title.",
      400,
    );
  }

  if (!content) {
    createAdminAnnouncementError(
      "announcement-content-required",
      "Add announcement details.",
      400,
    );
  }

  const finalAudience =
    audience.length > 0
      ? audience
      : (["admin", "coach", "parent"] satisfies MessageAudience[]);
  const now = new Date().toISOString();
  const announcement = await runFirestoreTransaction(async (transaction) => {
    const [organization, team, event] = await Promise.all([
      transaction.get<Organization>("organizations", organizationId),
      teamId ? transaction.get<Team>("teams", teamId) : Promise.resolve(null),
      eventId
        ? transaction.get<GameDayEvent>("events", eventId)
        : Promise.resolve(null),
    ]);

    if (!organization) {
      createAdminAnnouncementError(
        "organization-not-found",
        "Create the organization before creating announcements.",
        404,
      );
    }

    if (eventId && (!event || event.organizationId !== organizationId)) {
      createAdminAnnouncementError(
        "event-not-found",
        "Choose an event from this organization before sending an event update.",
        404,
      );
    }

    if (teamId && (!team || team.organizationId !== organizationId)) {
      createAdminAnnouncementError(
        "team-not-found",
        "Choose a team from this organization before sending a team message.",
        404,
      );
    }

    if (event && teamId && !getEventTeamIds(event).includes(teamId)) {
      createAdminAnnouncementError(
        "event-team-mismatch",
        "Choose a team that belongs to this event before sending an event update.",
        403,
      );
    }

    const eventTeamId =
      event && !teamId ? getEventTeamIds(event)[0] ?? "" : "";
    const finalTeamId = teamId || eventTeamId;
    const nextAnnouncement: GameDayMessage = {
      audience: finalAudience,
      content,
      eventId: eventId || undefined,
      id: createLiveRecordId(
        eventId ? "event-message" : finalTeamId ? "team-message" : "announcement",
        [organizationId, eventId, finalTeamId, subject],
      ),
      organizationId,
      priority,
      senderId: scope.session.user.id,
      subject,
      teamId: finalTeamId || undefined,
      timestamp: now,
      type: eventId
        ? "Event Announcement"
        : finalTeamId
          ? "Team Announcement"
          : "Organization Announcement",
    };

    transaction.create("messages", nextAnnouncement.id, nextAnnouncement);

    return nextAnnouncement;
  });

  console.info("Admin announcement created.", {
    announcementId: announcement.id,
    audience: announcement.audience,
    eventId: announcement.eventId,
    organizationId,
    senderUid: scope.session.user.id,
    teamId: announcement.teamId,
  });

  return {
    announcement,
    id: announcement.id,
    message: `Announcement created: ${announcement.subject}`,
    source: "firestore",
  };
}
