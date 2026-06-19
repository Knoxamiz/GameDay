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
  const announcement: GameDayMessage = {
    audience: finalAudience,
    content,
    id: createLiveRecordId(teamId ? "team-message" : "announcement", [
      organizationId,
      teamId,
      subject,
    ]),
    organizationId,
    priority,
    senderId: scope.session.user.id,
    subject,
    teamId: teamId || undefined,
    timestamp: now,
    type: teamId ? "Team Announcement" : "Organization Announcement",
  };

  await runFirestoreTransaction(async (transaction) => {
    const [organization, team] = await Promise.all([
      transaction.get<Organization>("organizations", organizationId),
      teamId ? transaction.get<Team>("teams", teamId) : Promise.resolve(null),
    ]);

    if (!organization) {
      createAdminAnnouncementError(
        "organization-not-found",
        "Create the organization before creating announcements.",
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

    transaction.create("messages", announcement.id, announcement);
  });

  console.info("Admin announcement created.", {
    announcementId: announcement.id,
    audience: announcement.audience,
    organizationId,
    senderUid: scope.session.user.id,
    teamId: teamId || undefined,
  });

  return {
    announcement,
    id: announcement.id,
    message: `Announcement created: ${announcement.subject}`,
    source: "firestore",
  };
}
