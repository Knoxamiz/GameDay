import { NextRequest, NextResponse } from "next/server";
import {
  AdminEventError,
  createAdminEvent,
  type AdminEventPayload,
} from "../../../data/adminEvents.server";
import type {
  GameDayEventStatus,
  GameDayEventType,
} from "../../../data/events";

export const runtime = "nodejs";

const eventTypes: GameDayEventType[] = [
  "practice",
  "game",
  "tournament",
  "meeting",
  "other",
];

const eventStatuses: GameDayEventStatus[] = [
  "draft",
  "published",
  "canceled",
];

function getText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getEventType(value: unknown): GameDayEventType {
  return eventTypes.includes(value as GameDayEventType)
    ? (value as GameDayEventType)
    : "practice";
}

function getEventStatus(value: unknown): GameDayEventStatus {
  return eventStatuses.includes(value as GameDayEventStatus)
    ? (value as GameDayEventStatus)
    : "published";
}

function getTeamIds(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function getAdminEventPayload(body: Record<string, unknown> | null) {
  if (!body) {
    return null;
  }

  return {
    address: getText(body.address),
    endsAt: getText(body.endsAt),
    locationName: getText(body.locationName),
    notes: getText(body.notes),
    organizationId: getText(body.organizationId),
    startsAt: getText(body.startsAt),
    status: getEventStatus(body.status),
    teamIds: getTeamIds(body.teamIds),
    title: getText(body.title),
    type: getEventType(body.type),
  } satisfies AdminEventPayload;
}

function getEventErrorResponse(error: unknown) {
  const status = error instanceof AdminEventError ? error.status : 500;
  const message =
    error instanceof Error ? error.message : "Could not create event.";
  const reason =
    error instanceof AdminEventError ? error.reason : "admin-event-failed";

  console.warn("Admin event create failed.", {
    errorName: error instanceof Error ? error.name : typeof error,
    message,
    reason,
    status,
  });

  return NextResponse.json(
    {
      error: status >= 500 ? "Could not create event." : message,
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
  const payload = getAdminEventPayload(body);

  if (!payload) {
    return NextResponse.json(
      {
        error: "Enter event details.",
        reason: "invalid-event-payload",
      },
      { status: 400 },
    );
  }

  try {
    const result = await createAdminEvent(payload, {
      sessionSource: {
        authorizationHeader: request.headers.get("authorization") ?? undefined,
        cookieHeader: request.headers.get("cookie") ?? undefined,
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return getEventErrorResponse(error);
  }
}
