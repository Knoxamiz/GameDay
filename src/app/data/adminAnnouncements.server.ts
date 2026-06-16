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
import type { GameDayMessage } from "./messages";
import type { Organization } from "./organizations";

export type AdminAnnouncementPayload = {
  content: string;
  organizationId: string;
  subject: string;
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
  const subject = normalizeText(payload.subject);
  const content = normalizeText(payload.content);

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

  const now = new Date().toISOString();
  const announcement: GameDayMessage = {
    audience: ["admin", "coach", "parent"],
    content,
    id: createLiveRecordId("announcement", [organizationId, subject]),
    organizationId,
    priority: "Informational",
    senderId: scope.session.user.id,
    subject,
    timestamp: now,
    type: "Organization Announcement",
  };

  await runFirestoreTransaction(async (transaction) => {
    const organization = await transaction.get<Organization>(
      "organizations",
      organizationId,
    );

    if (!organization) {
      createAdminAnnouncementError(
        "organization-not-found",
        "Create the organization before creating announcements.",
        404,
      );
    }

    transaction.create("messages", announcement.id, announcement);
  });

  console.info("Admin announcement created.", {
    announcementId: announcement.id,
    organizationId,
    senderUid: scope.session.user.id,
  });

  return {
    announcement,
    id: announcement.id,
    message: `Announcement created: ${announcement.subject}`,
    source: "firestore",
  };
}
