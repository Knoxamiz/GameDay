import { NextRequest, NextResponse } from "next/server";
import {
  listAccountDeletionRequests,
  updateAccountDeletionRequest,
  type AccountDeletionRequestStatus,
} from "../../../data/accountDeletionRequests.server";

export const runtime = "nodejs";

function hasSupportOperationsAccess(request: NextRequest) {
  const token = process.env.SUPPORT_OPERATIONS_TOKEN?.trim();

  return Boolean(
    token && request.headers.get("x-gameday-support-token") === token,
  );
}

function getStatus(value: unknown): AccountDeletionRequestStatus | undefined {
  return value === "completed" ||
    value === "in_review" ||
    value === "rejected" ||
    value === "requested"
    ? value
    : undefined;
}

export async function GET(request: NextRequest) {
  if (!hasSupportOperationsAccess(request)) {
    return NextResponse.json({ error: "Support access required." }, { status: 403 });
  }

  const status = getStatus(request.nextUrl.searchParams.get("status"));
  const limit = Number(request.nextUrl.searchParams.get("limit"));
  const requests = await listAccountDeletionRequests({
    ...(Number.isInteger(limit) && limit > 0 && limit <= 100 ? { limit } : {}),
    ...(status ? { status } : {}),
  });

  return NextResponse.json({
    requests,
    status: "ok",
  });
}

export async function PATCH(request: NextRequest) {
  if (!hasSupportOperationsAccess(request)) {
    return NextResponse.json({ error: "Support access required." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    id?: unknown;
    notes?: unknown;
    reviewedBy?: unknown;
    status?: unknown;
  } | null;
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  const status = getStatus(body?.status);
  const reviewedBy =
    typeof body?.reviewedBy === "string" ? body.reviewedBy.trim() : "";
  const notes = typeof body?.notes === "string" ? body.notes.trim() : null;

  if (!id || !status || !reviewedBy) {
    return NextResponse.json(
      { error: "Request id, status, and reviewer are required." },
      { status: 400 },
    );
  }

  try {
    const updatedRequest = await updateAccountDeletionRequest(id, {
      notes,
      reviewedBy,
      status,
    });

    return NextResponse.json({
      request: updatedRequest,
      status: "ok",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not update deletion request.",
      },
      { status: 400 },
    );
  }
}
