import { NextRequest, NextResponse } from "next/server";
import {
  RegistrationSubmissionError,
  submitParentRegistration,
} from "../../data/registrationSubmission.server";
import type { RegistrationSubmissionPayload } from "../../data/registrationSubmission";
import {
  paymentRequirementStatusValues,
  type PaymentRequirementStatus,
} from "../../data/payments";
import {
  registrationRequirementStatusValues,
  type RegistrationRequirementStatus,
} from "../../data/registrations";

export const runtime = "nodejs";

function getStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      typeof entry === "string" ? entry : "",
    ]),
  );
}

function getRegistrationRequirementStatuses(
  value: unknown,
): Record<string, RegistrationRequirementStatus> {
  const statuses = getStringRecord(value);

  return Object.fromEntries(
    Object.entries(statuses).filter(
      (entry): entry is [string, RegistrationRequirementStatus] =>
        registrationRequirementStatusValues.includes(
          entry[1] as RegistrationRequirementStatus,
        ),
    ),
  );
}

function getPaymentRequirementStatuses(
  value: unknown,
): Record<string, PaymentRequirementStatus> {
  const statuses = getStringRecord(value);

  return Object.fromEntries(
    Object.entries(statuses).filter(
      (entry): entry is [string, PaymentRequirementStatus] =>
        paymentRequirementStatusValues.includes(
          entry[1] as PaymentRequirementStatus,
        ),
    ),
  );
}

function getSubmissionPayload(body: unknown): RegistrationSubmissionPayload {
  const payload = body && typeof body === "object" ? body : {};
  const record = payload as Record<string, unknown>;
  const athlete = getStringRecord(record.athlete);
  const parent = getStringRecord(record.parent);

  return {
    athlete: {
      firstName: athlete.firstName ?? "",
      grade: athlete.grade ?? "",
      lastName: athlete.lastName ?? "",
      school: athlete.school ?? "",
    },
    inviteCode: typeof record.inviteCode === "string" ? record.inviteCode : "",
    parent: {
      email: parent.email ?? "",
      name: parent.name ?? "",
      phone: parent.phone ?? "",
    },
    paymentStatuses: getPaymentRequirementStatuses(record.paymentStatuses),
    requirementStatuses: getRegistrationRequirementStatuses(
      record.requirementStatuses,
    ),
  };
}

export async function POST(request: NextRequest) {
  const payload = getSubmissionPayload(await request.json().catch(() => null));

  try {
    const result = await submitParentRegistration(payload, {
      sessionSource: {
        authorizationHeader: request.headers.get("authorization") ?? undefined,
        cookieHeader: request.headers.get("cookie") ?? undefined,
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const reason =
      error instanceof RegistrationSubmissionError
        ? error.reason
        : "registration-submit-failed";
    const status =
      error instanceof RegistrationSubmissionError ? error.status : 500;
    const message =
      error instanceof Error
        ? error.message
        : "Could not submit registration.";

    console.warn("Parent registration submission failed.", {
      errorName: error instanceof Error ? error.name : typeof error,
      message,
      reason,
      status,
    });

    return NextResponse.json(
      {
        error:
          status >= 500
            ? "Could not submit registration. Please try again."
            : message,
        reason,
      },
      { status },
    );
  }
}
