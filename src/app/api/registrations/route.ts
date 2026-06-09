import { NextRequest, NextResponse } from "next/server";
import { submitParentRegistration } from "../../data/registrationSubmission.server";
import type { RegistrationSubmissionPayload } from "../../data/registrationSubmission";
import {
  registrationRequirementStatusValues,
  type RegistrationRequirementStatus,
} from "../../data/registrations";

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
    requirementStatuses: getRegistrationRequirementStatuses(
      record.requirementStatuses,
    ),
  };
}

export async function POST(request: NextRequest) {
  const payload = getSubmissionPayload(await request.json().catch(() => null));
  const result = await submitParentRegistration(payload, {
    sessionSource: {
      authorizationHeader: request.headers.get("authorization") ?? undefined,
      cookieHeader: request.headers.get("cookie") ?? undefined,
    },
  }).catch(() => ({
    source: "mock" as const,
  }));

  return NextResponse.json(result, {
    status: result.source === "firestore" ? 201 : 202,
  });
}
