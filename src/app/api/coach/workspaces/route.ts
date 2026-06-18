import { NextRequest, NextResponse } from "next/server";
import {
  CoachWorkspaceProvisioningError,
  createCoachSingleTeamWorkspace,
  type CoachWorkspaceProvisioningPayload,
} from "../../../data/coachWorkspaceProvisioning.server";

export const runtime = "nodejs";

function getText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getPayload(
  body: Record<string, unknown> | null,
): CoachWorkspaceProvisioningPayload | null {
  if (!body) {
    return null;
  }

  return {
    division: getText(body.division),
    season: getText(body.season),
    teamName: getText(body.teamName),
  };
}

function getErrorResponse(error: unknown) {
  const status =
    error instanceof CoachWorkspaceProvisioningError ? error.status : 500;
  const message =
    error instanceof Error ? error.message : "Could not create team workspace.";
  const reason =
    error instanceof CoachWorkspaceProvisioningError
      ? error.reason
      : "coach-workspace-provisioning-failed";

  console.warn("Coach workspace provisioning failed.", {
    errorName: error instanceof Error ? error.name : typeof error,
    message,
    reason,
    status,
  });

  return NextResponse.json(
    {
      error: status >= 500 ? "Could not create team workspace." : message,
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
  const payload = getPayload(body);

  if (!payload) {
    return NextResponse.json(
      {
        error: "Team name, division, and season are required.",
        reason: "invalid-coach-workspace-payload",
      },
      { status: 400 },
    );
  }

  try {
    const result = await createCoachSingleTeamWorkspace(payload, {
      sessionSource: {
        authorizationHeader: request.headers.get("authorization") ?? undefined,
        cookieHeader: request.headers.get("cookie") ?? undefined,
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return getErrorResponse(error);
  }
}
