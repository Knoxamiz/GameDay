import { NextRequest, NextResponse } from "next/server";
import {
  ParentEventOperationError,
  updateParentAttendanceStatus,
} from "../../../../data/parentEventOperations.server";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  try {
    const entry = await updateParentAttendanceStatus(
      eventId,
      typeof body?.athleteId === "string" ? body.athleteId : "",
      body?.status,
      {
        sessionSource: {
          authorizationHeader: request.headers.get("authorization") ?? undefined,
          cookieHeader: request.headers.get("cookie") ?? undefined,
        },
      },
    );

    return NextResponse.json({ entry, source: "firestore" });
  } catch (error) {
    const status = error instanceof ParentEventOperationError ? error.status : 500;
    const reason =
      error instanceof ParentEventOperationError
        ? error.reason
        : "attendance-update-failed";

    console.warn("Parent attendance update failed.", {
      errorName: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : "Unknown error",
      reason,
      status,
    });

    return NextResponse.json(
      {
        error:
          status >= 500
            ? "Could not update attendance. Please try again."
            : error instanceof Error
              ? error.message
              : "Could not update attendance.",
        reason,
      },
      { status },
    );
  }
}
