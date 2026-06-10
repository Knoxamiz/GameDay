import { NextRequest, NextResponse } from "next/server";
import {
  paymentRequirementStatusValues,
  type PaymentRequirementStatus,
} from "../../../../data/payments";
import type { ParentPaymentRequirementUpdatePayload } from "../../../../data/paymentRequirementUpdate";
import { updateParentPaymentRequirementIntent } from "../../../../data/paymentRequirementUpdate.server";

type RegistrationPaymentRouteProps = {
  params: Promise<{
    registrationId: string;
  }>;
};

function getText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getBoolean(value: unknown) {
  return typeof value === "boolean" ? value : false;
}

function getNumber(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getPaymentRequirementStatus(value: unknown): PaymentRequirementStatus {
  return paymentRequirementStatusValues.includes(value as PaymentRequirementStatus)
    ? (value as PaymentRequirementStatus)
    : "Missing";
}

export async function PATCH(
  request: NextRequest,
  { params }: RegistrationPaymentRouteProps,
) {
  const { registrationId } = await params;
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const payload: ParentPaymentRequirementUpdatePayload = {
    amountDue: getNumber(body?.amountDue),
    athleteId: getText(body?.athleteId),
    description: getText(body?.description),
    label: getText(body?.label),
    organizationId: getText(body?.organizationId),
    parentId: getText(body?.parentId),
    paymentRequirementId: getText(body?.paymentRequirementId),
    registrationId,
    required: getBoolean(body?.required),
    status: getPaymentRequirementStatus(body?.status),
  };
  const result = await updateParentPaymentRequirementIntent(payload, {
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
