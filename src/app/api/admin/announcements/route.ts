import { NextRequest, NextResponse } from "next/server";
import {
  AdminAnnouncementError,
  createAdminAnnouncement,
  type AdminAnnouncementPayload,
} from "../../../data/adminAnnouncements.server";

export const runtime = "nodejs";

function getText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getAudience(value: unknown) {
  const allowed = new Set(["admin", "coach", "parent"]);

  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .filter((item) => allowed.has(item))
    : [];
}

function getPriority(value: unknown) {
  const priority = getText(value);

  return priority === "Critical" ||
    priority === "Important" ||
    priority === "Informational"
    ? priority
    : undefined;
}

function getAnnouncementPayload(body: Record<string, unknown> | null) {
  if (!body) {
    return null;
  }

  return {
    audience: getAudience(body.audience) as AdminAnnouncementPayload["audience"],
    content: getText(body.content),
    eventId: getText(body.eventId),
    organizationId: getText(body.organizationId),
    priority: getPriority(body.priority),
    subject: getText(body.subject),
    teamId: getText(body.teamId),
  } satisfies AdminAnnouncementPayload;
}

function getAnnouncementErrorResponse(error: unknown) {
  const status =
    error instanceof AdminAnnouncementError ? error.status : 500;
  const message =
    error instanceof Error ? error.message : "Could not create announcement.";
  const reason =
    error instanceof AdminAnnouncementError
      ? error.reason
      : "admin-announcement-failed";

  console.warn("Admin announcement save failed.", {
    errorName: error instanceof Error ? error.name : typeof error,
    message,
    reason,
    status,
  });

  return NextResponse.json(
    {
      error: status >= 500 ? "Could not create announcement." : message,
      reason,
    },
    { status },
  );
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const payload = getAnnouncementPayload(body);

  if (!payload) {
    return NextResponse.json(
      {
        error: "Enter announcement details.",
        reason: "invalid-announcement-payload",
      },
      { status: 400 },
    );
  }

  try {
    const result = await createAdminAnnouncement(payload, {
      activeOrganizationId: getText(body?.activeOrganizationId),
      sessionSource: {
        authorizationHeader: request.headers.get("authorization") ?? undefined,
        cookieHeader: request.headers.get("cookie") ?? undefined,
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return getAnnouncementErrorResponse(error);
  }
}
