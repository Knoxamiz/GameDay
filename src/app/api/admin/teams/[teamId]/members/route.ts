import { NextRequest, NextResponse } from "next/server";
import {
  addAdminTeamPlayer,
  addAdminTeamPlayers,
  AdminTeamMemberError,
  removeAdminTeamPlayer,
  type AdminTeamMemberPlayerInput,
  type AdminTeamMemberPayload,
} from "../../../../../data/adminTeamMembers.server";

type AdminTeamMembersRouteProps = {
  params: Promise<{
    teamId: string;
  }>;
};

export const runtime = "nodejs";

function getText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getAddPlayerPayload(
  teamId: string,
  body: Record<string, unknown> | null,
): Extract<AdminTeamMemberPayload, { actionType: "player-add" }> | null {
  if (body?.actionType !== "player-add") {
    return null;
  }

  return {
    actionType: "player-add",
    athleteFirstName: getText(body.athleteFirstName),
    athleteLastName: getText(body.athleteLastName),
    dateOfBirth: getText(body.dateOfBirth),
    grade: getText(body.grade),
    jerseySize: getText(body.jerseySize),
    organizationId: getText(body.organizationId),
    parentEmail: getText(body.parentEmail),
    parentName: getText(body.parentName),
    parentPhone: getText(body.parentPhone),
    school: getText(body.school),
    teamId,
  };
}

function getBulkAddPlayerPayload(
  teamId: string,
  body: Record<string, unknown> | null,
): Extract<AdminTeamMemberPayload, { actionType: "players-bulk-add" }> | null {
  if (body?.actionType !== "players-bulk-add" || !Array.isArray(body.players)) {
    return null;
  }

  const players = body.players
    .filter(
      (player): player is Record<string, unknown> =>
        player !== null && typeof player === "object",
    )
    .map(
      (player): AdminTeamMemberPlayerInput => ({
        athleteFirstName: getText(player.athleteFirstName),
        athleteLastName: getText(player.athleteLastName),
        dateOfBirth: getText(player.dateOfBirth),
        grade: getText(player.grade),
        jerseySize: getText(player.jerseySize),
        parentEmail: getText(player.parentEmail),
        parentName: getText(player.parentName),
        parentPhone: getText(player.parentPhone),
        school: getText(player.school),
      }),
    );

  return {
    actionType: "players-bulk-add",
    organizationId: getText(body.organizationId),
    players,
    teamId,
  };
}

function getRemovePlayerPayload(
  teamId: string,
  body: Record<string, unknown> | null,
): Extract<AdminTeamMemberPayload, { actionType: "player-remove" }> | null {
  if (body?.actionType !== "player-remove") {
    return null;
  }

  return {
    actionType: "player-remove",
    organizationId: getText(body.organizationId),
    registrationId: getText(body.registrationId),
    teamId,
  };
}

function getErrorResponse(error: unknown) {
  const status = error instanceof AdminTeamMemberError ? error.status : 500;
  const message =
    error instanceof Error ? error.message : "Could not update team members.";
  const reason =
    error instanceof AdminTeamMemberError
      ? error.reason
      : "admin-team-member-update-failed";

  console.warn("Admin team member update failed.", {
    errorName: error instanceof Error ? error.name : typeof error,
    message,
    reason,
    status,
  });

  return NextResponse.json(
    {
      error: status >= 500 ? "Could not update team members." : message,
      reason,
    },
    { status },
  );
}

export async function POST(
  request: NextRequest,
  { params }: AdminTeamMembersRouteProps,
) {
  const { teamId } = await params;
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const payload =
    getBulkAddPlayerPayload(teamId, body) ?? getAddPlayerPayload(teamId, body);

  if (!payload) {
    return NextResponse.json(
      {
        error: "Unsupported team member action.",
        reason: "unsupported-team-member-action",
      },
      { status: 400 },
    );
  }

  try {
    const result =
      payload.actionType === "players-bulk-add"
        ? await addAdminTeamPlayers(payload, {
            activeOrganizationId: getText(body?.activeOrganizationId),
            sessionSource: {
              authorizationHeader:
                request.headers.get("authorization") ?? undefined,
              cookieHeader: request.headers.get("cookie") ?? undefined,
            },
          })
        : await addAdminTeamPlayer(payload, {
            activeOrganizationId: getText(body?.activeOrganizationId),
            sessionSource: {
              authorizationHeader:
                request.headers.get("authorization") ?? undefined,
              cookieHeader: request.headers.get("cookie") ?? undefined,
            },
          });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return getErrorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: AdminTeamMembersRouteProps,
) {
  const { teamId } = await params;
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const payload = getRemovePlayerPayload(teamId, body);

  if (!payload) {
    return NextResponse.json(
      {
        error: "Unsupported team member action.",
        reason: "unsupported-team-member-action",
      },
      { status: 400 },
    );
  }

  try {
    const result = await removeAdminTeamPlayer(payload, {
      activeOrganizationId: getText(body?.activeOrganizationId),
      sessionSource: {
        authorizationHeader: request.headers.get("authorization") ?? undefined,
        cookieHeader: request.headers.get("cookie") ?? undefined,
      },
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return getErrorResponse(error);
  }
}
