import { NextRequest, NextResponse } from "next/server";
import {
  ParentRegistrationRequirementError,
  updateParentRegistrationRequirementStatus,
  uploadParentRegistrationRequirementDocument,
} from "../../../../data/registrationRequirementUpdate.server";
import type {
  ParentRegistrationRequirementUploadPayload,
  ParentRegistrationRequirementUpdatePayload,
} from "../../../../data/registrationRequirementUpdate";
import {
  isRegistrationDocumentContentType,
  registrationDocumentMaxBytes,
} from "../../../../data/registrationRequirementUpdate";
import {
  registrationRequirementStatusValues,
  type RegistrationRequirementStatus,
} from "../../../../data/registrations";

type RegistrationRequirementRouteProps = {
  params: Promise<{
    registrationId: string;
  }>;
};

export const runtime = "nodejs";

function getText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getFormText(formData: FormData, key: string) {
  return getText(formData.get(key));
}

function getFormFile(formData: FormData) {
  const file = formData.get("file");

  return file instanceof File ? file : null;
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

function getRequirementErrorResponse(error: unknown) {
  const status =
    error instanceof ParentRegistrationRequirementError ? error.status : 500;
  const message =
    error instanceof Error
      ? error.message
      : "Could not update this registration requirement.";
  const reason =
    error instanceof ParentRegistrationRequirementError
      ? error.reason
      : "registration-requirement-update-failed";

  console.warn("Parent registration requirement update failed.", {
    errorName: error instanceof Error ? error.name : typeof error,
    message,
    reason,
    status,
  });

  return NextResponse.json(
    {
      error:
        status >= 500
          ? "Could not update this registration requirement."
          : message,
      reason,
    },
    { status },
  );
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
  try {
    const result = await updateParentRegistrationRequirementStatus(payload, {
      sessionSource: {
        authorizationHeader: request.headers.get("authorization") ?? undefined,
        cookieHeader: request.headers.get("cookie") ?? undefined,
      },
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return getRequirementErrorResponse(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: RegistrationRequirementRouteProps,
) {
  const { registrationId } = await params;
  const formData = await request.formData().catch(() => null);
  const file = formData ? getFormFile(formData) : null;

  if (!formData || !file) {
    return NextResponse.json(
      {
        error: "Choose a document before uploading.",
        reason: "missing-upload-file",
      },
      { status: 400 },
    );
  }

  if (file.size <= 0 || file.size > registrationDocumentMaxBytes) {
    return NextResponse.json(
      {
        error: "Choose a document smaller than 10 MB.",
        reason: "invalid-upload-size",
      },
      { status: 400 },
    );
  }

  if (!isRegistrationDocumentContentType(file.type)) {
    return NextResponse.json(
      {
        error: "Upload a PDF, JPEG, PNG, WebP, HEIC, or HEIF document.",
        reason: "invalid-upload-type",
      },
      { status: 400 },
    );
  }

  const payload: ParentRegistrationRequirementUploadPayload = {
    athleteId: getFormText(formData, "athleteId"),
    contentLength: file.size,
    contentType: file.type,
    data: Buffer.from(await file.arrayBuffer()),
    fileName: file.name,
    organizationId: getFormText(formData, "organizationId"),
    parentId: getFormText(formData, "parentId"),
    registrationId,
    requirementId: getFormText(formData, "requirementId"),
    requirementLabel: getFormText(formData, "requirementLabel"),
  };
  try {
    const result = await uploadParentRegistrationRequirementDocument(payload, {
      sessionSource: {
        authorizationHeader: request.headers.get("authorization") ?? undefined,
        cookieHeader: request.headers.get("cookie") ?? undefined,
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return getRequirementErrorResponse(error);
  }
}
