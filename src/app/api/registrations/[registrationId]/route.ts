import { NextRequest, NextResponse } from "next/server";
import type {
  ParentRegistrationCorrection,
  ParentRegistrationLifecyclePayload,
} from "../../../data/parentRegistrationLifecycle";
import {
  ParentRegistrationLifecycleError,
  updateParentRegistrationLifecycle,
} from "../../../data/parentRegistrationLifecycle.server";

export const runtime = "nodejs";

function getText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getCorrection(value: unknown): ParentRegistrationCorrection {
  const record =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  return {
    athleteFirstName: getText(record.athleteFirstName),
    athleteLastName: getText(record.athleteLastName),
    grade: getText(record.grade),
    parentEmail: getText(record.parentEmail),
    parentName: getText(record.parentName),
    parentPhone: getText(record.parentPhone),
    school: getText(record.school),
  };
}

function getPayload(
  body: Record<string, unknown> | null,
): ParentRegistrationLifecyclePayload | null {
  if (body?.actionType === "correction") {
    return {
      actionType: "correction",
      correction: getCorrection(body.correction),
    };
  }

  if (body?.actionType === "withdrawal") {
    return {
      actionType: "withdrawal",
      reason: getText(body.reason),
    };
  }

  return null;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ registrationId: string }> },
) {
  const { registrationId } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const payload = getPayload(body);

  if (!payload) {
    return NextResponse.json(
      {
        error: "Choose a valid registration action.",
        reason: "invalid-registration-lifecycle-action",
      },
      { status: 400 },
    );
  }

  try {
    const result = await updateParentRegistrationLifecycle(
      registrationId,
      payload,
      {
        sessionSource: {
          authorizationHeader:
            request.headers.get("authorization") ?? undefined,
          cookieHeader: request.headers.get("cookie") ?? undefined,
        },
      },
    );

    return NextResponse.json(result);
  } catch (error) {
    const status =
      error instanceof ParentRegistrationLifecycleError ? error.status : 500;
    const reason =
      error instanceof ParentRegistrationLifecycleError
        ? error.reason
        : "parent-registration-lifecycle-failed";

    console.warn("Parent registration lifecycle update failed.", {
      errorName: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : "Unknown error",
      reason,
      registrationId,
      status,
    });

    return NextResponse.json(
      {
        error:
          status >= 500
            ? "Could not update this registration. Please try again."
            : error instanceof Error
              ? error.message
              : "Could not update this registration.",
        reason,
      },
      { status },
    );
  }
}
