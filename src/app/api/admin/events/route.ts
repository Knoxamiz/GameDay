import { NextRequest, NextResponse } from "next/server";
import {
  AdminEventError,
  createAdminEvent,
  updateAdminEvent,
  type AdminEventPayload,
  type AdminEventUpdatePayload,
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
  "archived",
];

function getText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getEventType(value: unknown): GameDayEventType | null {
  return eventTypes.includes(value as GameDayEventType)
    ? (value as GameDayEventType)
    : null;
}

function getEventStatus(value: unknown): GameDayEventStatus | null {
  return eventStatuses.includes(value as GameDayEventStatus)
    ? (value as GameDayEventStatus)
    : null;
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

  const status = getEventStatus(body.status);
  const type = getEventType(body.type);

  if (
    !status ||
    !type ||
    status === "archived" ||
    status === "canceled"
  ) {
    return null;
  }

  return {
    address: getText(body.address),
    endsAt: getText(body.endsAt),
    locationName: getText(body.locationName),
    notes: getText(body.notes),
    organizationId: getText(body.organizationId),
    startsAt: getText(body.startsAt),
    status,
    teamIds: getTeamIds(body.teamIds),
    title: getText(body.title),
    type,
  } satisfies AdminEventPayload;
}

function getAdminEventUpdatePayload(body: Record<string, unknown> | null) {
  if (!body) {
    return null;
  }

  const status = getEventStatus(body.status);
  const type = getEventType(body.type);

  if (!status || !type) {
    return null;
  }

  return {
    address: getText(body.address),
    endsAt: getText(body.endsAt),
    eventId: getText(body.eventId),
    locationName: getText(body.locationName),
    notes: getText(body.notes),
    organizationId: getText(body.organizationId),
    startsAt: getText(body.startsAt),
    status,
    teamIds: getTeamIds(body.teamIds),
    title: getText(body.title),
    type,
  } satisfies AdminEventUpdatePayload;
}

function getEventErrorResponse(error: unknown) {
  const status = error instanceof AdminEventError ? error.status : 500;
  const message =
    error instanceof Error ? error.message : "Could not save event.";
  const reason =
    error instanceof AdminEventError ? error.reason : "admin-event-failed";

  console.warn("Admin event save failed.", {
    errorName: error instanceof Error ? error.name : typeof error,
    message,
    reason,
    status,
  });

  return NextResponse.json(
    {
      error: status >= 500 ? "Could not save event." : message,
      reason,
    },
    { status },
  );
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const payload = getAdminEventUpdatePayload(body);

  if (!payload) {
    return NextResponse.json(
      {
        error: "Enter valid event details.",
        reason: "invalid-event-update-payload",
      },
      { status: 400 },
    );
  }

  try {
    const result = await updateAdminEvent(payload, {
      activeOrganizationId: getText(body?.activeOrganizationId),
      sessionSource: {
        authorizationHeader: request.headers.get("authorization") ?? undefined,
        cookieHeader: request.headers.get("cookie") ?? undefined,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    return getEventErrorResponse(error);
  }
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
      activeOrganizationId: getText(body?.activeOrganizationId),
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
