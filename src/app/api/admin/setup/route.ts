import { NextRequest, NextResponse } from "next/server";
import {
  AdminSetupError,
  createAdminSetupRecord,
  type AdminSetupPayload,
} from "../../../data/adminSetup.server";

export const runtime = "nodejs";

function getText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getBoolean(value: unknown) {
  return typeof value === "boolean" ? value : false;
}

function getInviteStatus(value: unknown): "Active" | "Paused" {
  return value === "Paused" ? "Paused" : "Active";
}

function getTeamStatus(value: unknown): "Active" | "Inactive" {
  return value === "Inactive" ? "Inactive" : "Active";
}

function getCoachStatus(value: unknown): "Active" | "Inactive" {
  return value === "Inactive" ? "Inactive" : "Active";
}

function getStringList(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function getSetupPayload(body: Record<string, unknown> | null) {
  if (!body) {
    return null;
  }

  const actionType = body?.actionType;

  if (actionType === "organization") {
    return {
      actionType,
      name: getText(body.name),
      organizationId: getText(body.organizationId),
    } satisfies AdminSetupPayload;
  }

  if (actionType === "team") {
    return {
      actionType,
      division: getText(body.division),
      name: getText(body.name),
      organizationId: getText(body.organizationId),
      season: getText(body.season),
      status: getTeamStatus(body.status),
    } satisfies AdminSetupPayload;
  }

  if (actionType === "coach-assignment") {
    return {
      actionType,
      email: getText(body.email),
      name: getText(body.name),
      organizationId: getText(body.organizationId),
      status: getCoachStatus(body.status),
      teamIds: getStringList(body.teamIds),
      uid: getText(body.uid),
    } satisfies AdminSetupPayload;
  }

  if (actionType === "registration-invite") {
    return {
      actionType,
      includePayment: getBoolean(body.includePayment),
      organizationId: getText(body.organizationId),
      status: getInviteStatus(body.status),
      teamId: getText(body.teamId),
      title: getText(body.title),
    } satisfies AdminSetupPayload;
  }

  return null;
}

function getSetupErrorResponse(error: unknown) {
  const status = error instanceof AdminSetupError ? error.status : 500;
  const message =
    error instanceof Error ? error.message : "Could not save setup.";
  const reason =
    error instanceof AdminSetupError ? error.reason : "admin-setup-failed";

  console.warn("Admin setup failed.", {
    errorName: error instanceof Error ? error.name : typeof error,
    message,
    reason,
    status,
  });

  return NextResponse.json(
    {
      error: status >= 500 ? "Could not save setup." : message,
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
  const payload = getSetupPayload(body);

  if (!payload) {
    return NextResponse.json(
      {
        error: "Choose a setup action.",
        reason: "invalid-setup-action",
      },
      { status: 400 },
    );
  }

  try {
    const result = await createAdminSetupRecord(payload, {
      sessionSource: {
        authorizationHeader: request.headers.get("authorization") ?? undefined,
        cookieHeader: request.headers.get("cookie") ?? undefined,
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return getSetupErrorResponse(error);
  }
}
