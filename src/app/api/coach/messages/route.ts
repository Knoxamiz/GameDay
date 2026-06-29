import { NextRequest, NextResponse } from "next/server";
import {
  CoachTeamMessageError,
  createCoachTeamMessage,
  type CoachTeamMessagePayload,
} from "../../../data/coachMessages.server";

export const runtime = "nodejs";

function getText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getAudience(value: unknown) {
  const allowed = new Set(["coach", "parent"]);

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

function getTeamMessagePayload(body: Record<string, unknown> | null) {
  if (!body) {
    return null;
  }

  return {
    audience: getAudience(body.audience) as CoachTeamMessagePayload["audience"],
    content: getText(body.content),
    eventId: getText(body.eventId),
    priority: getPriority(body.priority),
    subject: getText(body.subject),
    teamId: getText(body.teamId),
  } satisfies CoachTeamMessagePayload;
}

function getTeamMessageErrorResponse(error: unknown) {
  const status = error instanceof CoachTeamMessageError ? error.status : 500;
  const message =
    error instanceof Error ? error.message : "Could not send this message.";
  const reason =
    error instanceof CoachTeamMessageError
      ? error.reason
      : "coach-team-message-failed";

  console.warn("Coach team message failed.", {
    errorName: error instanceof Error ? error.name : typeof error,
    message,
    reason,
    status,
  });

  return NextResponse.json(
    {
      error: status >= 500 ? "Could not send this message." : message,
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
  const payload = getTeamMessagePayload(body);

  if (!payload) {
    return NextResponse.json(
      {
        error: "Enter message details.",
        reason: "invalid-team-message-payload",
      },
      { status: 400 },
    );
  }

  try {
    const result = await createCoachTeamMessage(payload, {
      sessionSource: {
        authorizationHeader: request.headers.get("authorization") ?? undefined,
        cookieHeader: request.headers.get("cookie") ?? undefined,
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return getTeamMessageErrorResponse(error);
  }
}
