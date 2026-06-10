import { NextRequest, NextResponse } from "next/server";
import {
  paymentRequirementStatusValues,
  type PaymentRequirementStatus,
} from "../../../../../data/payments";
import {
  registrationAdminDecisionOptions,
  registrationRequirementStatusValues,
  type RegistrationRequirementStatus,
  type RegistrationStatus,
} from "../../../../../data/registrations";
import type {
  AdminRegistrationReviewPayload,
  AdminRegistrationReviewResult,
} from "../../../../../data/adminRegistrationReview";
import { updateAdminRegistrationReview } from "../../../../../data/adminRegistrationReview.server";

type AdminRegistrationReviewRouteProps = {
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

function getRegistrationStatus(value: unknown): RegistrationStatus {
  return registrationAdminDecisionOptions.includes(value as RegistrationStatus)
    ? (value as RegistrationStatus)
    : "Incomplete";
}

function getRegistrationRequirementStatus(
  value: unknown,
): RegistrationRequirementStatus {
  const status = registrationRequirementStatusValues.includes(
    value as RegistrationRequirementStatus,
  )
    ? (value as RegistrationRequirementStatus)
    : "Rejected";

  return status === "Approved" || status === "Waived" || status === "Rejected"
    ? status
    : "Rejected";
}

function getPaymentRequirementStatus(value: unknown): PaymentRequirementStatus {
  const status = paymentRequirementStatusValues.includes(
    value as PaymentRequirementStatus,
  )
    ? (value as PaymentRequirementStatus)
    : "Rejected";

  return status === "Paid" || status === "Waived" || status === "Rejected"
    ? status
    : "Rejected";
}

function getPayload(
  registrationId: string,
  body: Record<string, unknown> | null,
): AdminRegistrationReviewPayload | null {
  const actionType = getText(body?.actionType);

  if (actionType === "registration-status") {
    return {
      actionType,
      adminNotes: getText(body?.adminNotes),
      registrationId,
      status: getRegistrationStatus(body?.status),
    };
  }

  if (actionType === "requirement-status") {
    return {
      actionType,
      adminNotes: getText(body?.adminNotes),
      registrationId,
      requirementId: getText(body?.requirementId),
      requirementLabel: getText(body?.requirementLabel),
      status: getRegistrationRequirementStatus(body?.status),
    };
  }

  if (actionType === "payment-status") {
    return {
      actionType,
      adminNotes: getText(body?.adminNotes),
      amountDue: getNumber(body?.amountDue),
      description: getText(body?.description),
      label: getText(body?.label),
      paymentRequirementId: getText(body?.paymentRequirementId),
      registrationId,
      required: getBoolean(body?.required),
      status: getPaymentRequirementStatus(body?.status),
    };
  }

  return null;
}

export async function PATCH(
  request: NextRequest,
  { params }: AdminRegistrationReviewRouteProps,
) {
  const { registrationId } = await params;
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const payload = getPayload(registrationId, body);

  if (!payload) {
    return NextResponse.json(
      { reason: "unsupported-admin-registration-action", source: "mock" },
      { status: 400 },
    );
  }

  const result = await updateAdminRegistrationReview(payload, {
    sessionSource: {
      authorizationHeader: request.headers.get("authorization") ?? undefined,
      cookieHeader: request.headers.get("cookie") ?? undefined,
    },
  }).catch(
    (): AdminRegistrationReviewResult => ({
    source: "mock" as const,
    }),
  );

  return NextResponse.json(result, {
    status: result.source === "firestore" ? 200 : result.denied ? 403 : 202,
  });
}
