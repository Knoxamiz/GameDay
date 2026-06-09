import { NextRequest, NextResponse } from "next/server";
import { updateParentRegistrationRequirementStatus } from "../../../../data/registrationRequirementUpdate.server";
import type { ParentRegistrationRequirementUpdatePayload } from "../../../../data/registrationRequirementUpdate";
import {
  registrationRequirementStatusValues,
  type RegistrationRequirementStatus,
} from "../../../../data/registrations";

type RegistrationRequirementRouteProps = {
  params: Promise<{
    registrationId: string;
  }>;
};

function getText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getRegistrationRequirementStatus(
  value: unknown,
): RegistrationRequirementStatus {
  return registrationRequirementStatusValues.includes(
    value as RegistrationRequirementStatus,
  )
    ? (value as RegistrationRequirementStatus)
    : "Missing";
}

export async function PATCH(
  request: NextRequest,
  { params }: RegistrationRequirementRouteProps,
) {
  const { registrationId } = await params;
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const payload: ParentRegistrationRequirementUpdatePayload = {
    athleteId: getText(body?.athleteId),
    parentId: getText(body?.parentId),
    registrationId,
    requirementId: getText(body?.requirementId),
    requirementLabel: getText(body?.requirementLabel),
    status: getRegistrationRequirementStatus(body?.status),
  };
  const result = await updateParentRegistrationRequirementStatus(payload, {
    sessionSource: {
      authorizationHeader: request.headers.get("authorization") ?? undefined,
      cookieHeader: request.headers.get("cookie") ?? undefined,
    },
  }).catch(() => ({
    source: "mock" as const,
  }));

  return NextResponse.json(result, {
    status: result.source === "firestore" ? 200 : 202,
  });
}
