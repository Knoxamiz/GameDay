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

function getAnnouncementPayload(body: Record<string, unknown> | null) {
  if (!body) {
    return null;
  }

  return {
    content: getText(body.content),
    organizationId: getText(body.organizationId),
    subject: getText(body.subject),
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
