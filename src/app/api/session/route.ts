import { NextRequest, NextResponse } from "next/server";
import {
  getFirebaseAdminConfig,
  getFirebaseAdminEnvDiagnostics,
} from "../../infrastructure/firebase";
import { getFirebaseAdminApp } from "../../infrastructure/firebaseAdmin";
import {
  firebaseSessionCookieName,
  FirebaseAdminAuthProvider,
} from "../../infrastructure/firebaseAuth";
import type { AuthSession } from "../../infrastructure/auth";
import { getLiveParentId, getLiveParentUid } from "../../data/liveIdentity";
import {
  OrganizationMembershipAcceptanceError,
  acceptOrganizationMembershipInvitations,
} from "../../data/organizationMembershipAcceptance.server";
import {
  getLandingRouteForSession,
  resolveSessionAccessRole,
} from "../../data/sessionAccess.server";

export const runtime = "nodejs";

const sessionMaxAgeSeconds = 60 * 60;
const redactedErrorPatterns = [
  /-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/g,
  /sk_(live|test)_[A-Za-z0-9_]+/g,
];

function getCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

async function getSessionResponseBody(session: AuthSession) {
  const role = await resolveSessionAccessRole(session);

  if (role === "authenticated") {
    return null;
  }

  return {
    adminId: session.claims.adminId,
    coachId: session.claims.coachId,
    email: session.user.email,
    landingRoute: await getLandingRouteForSession(session, role),
    parentId:
      session.claims.role === "parent"
        ? getLiveParentId(session)
        : session.claims.parentId,
    parentUid:
      session.claims.role === "parent" ? getLiveParentUid(session) : undefined,
    role,
    status: "signed-in",
  };
}

function getSafeErrorDetails(error: unknown) {
  if (!(error instanceof Error)) {
    return {
      message: "Non-Error thrown",
      name: typeof error,
    };
  }

  return {
    message: redactedErrorPatterns.reduce(
      (message, pattern) => message.replace(pattern, "[redacted]"),
      error.message,
    ),
    name: error.name,
  };
}

function logFirebaseAdminSessionDiagnostic(
  reason: string,
  options?: {
    adminAppInitialized?: boolean;
    error?: unknown;
  },
) {
  console.warn("Firebase Admin session diagnostic", {
    adminAppInitialized: options?.adminAppInitialized ?? false,
    diagnostics: getFirebaseAdminEnvDiagnostics(),
    error: options?.error ? getSafeErrorDetails(options.error) : undefined,
    reason,
  });
}

export async function GET(request: NextRequest) {
  if (!getFirebaseAdminConfig()) {
    return NextResponse.json({
      configured: false,
      status: "signed-out",
    });
  }

  try {
    const authProvider = new FirebaseAdminAuthProvider();
    const session = await authProvider.verifySession({
      cookieHeader: request.headers.get("cookie") ?? undefined,
    });

    if (!session) {
      return NextResponse.json({
        configured: true,
        status: "signed-out",
      });
    }

    const responseBody = await getSessionResponseBody(session);

    if (!responseBody) {
      return NextResponse.json({
        configured: true,
        status: "signed-out",
      });
    }

    return NextResponse.json({
      configured: true,
      ...responseBody,
    });
  } catch (error) {
    logFirebaseAdminSessionDiagnostic("session-read-failed", { error });

    return NextResponse.json({
      configured: true,
      status: "signed-out",
    });
  }
}

export async function POST(request: NextRequest) {
  if (!getFirebaseAdminConfig()) {
    logFirebaseAdminSessionDiagnostic("config-missing");

    return NextResponse.json(
      { error: "Firebase Admin session verification is not configured." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    idToken?: unknown;
  } | null;
  const idToken = typeof body?.idToken === "string" ? body.idToken.trim() : "";

  if (!idToken) {
    return NextResponse.json({ error: "Missing Firebase ID token." }, { status: 400 });
  }

  let adminAppInitialized = false;

  try {
    adminAppInitialized = Boolean(await getFirebaseAdminApp());

    if (!adminAppInitialized) {
      logFirebaseAdminSessionDiagnostic("admin-app-unavailable", {
        adminAppInitialized,
      });

      return NextResponse.json(
        { error: "Firebase Admin session verification is not configured." },
        { status: 503 },
      );
    }

    const authProvider = new FirebaseAdminAuthProvider();
    const session = await authProvider.verifySession({
      authorizationHeader: `Bearer ${idToken}`,
    });

    if (!session) {
      return NextResponse.json(
        {
          error:
            "This session endpoint requires a valid parent, coach, or admin role.",
        },
        { status: 403 },
      );
    }

    try {
      await acceptOrganizationMembershipInvitations(session);
    } catch (error) {
      if (error instanceof OrganizationMembershipAcceptanceError) {
        throw error;
      }

      console.warn("Organization membership onboarding failed.", {
        error: getSafeErrorDetails(error),
        uid: session.user.id,
      });

      return NextResponse.json(
        {
          error: "Could not complete organization membership onboarding.",
          reason: "membership-onboarding-failed",
        },
        { status: 500 },
      );
    }

    const responseBody = await getSessionResponseBody(session);

    if (!responseBody) {
      return NextResponse.json(
        {
          error:
            "This account does not have an active GameDay role or organization membership.",
        },
        { status: 403 },
      );
    }

    const response = NextResponse.json({
      ...responseBody,
      status: "ok",
    });
    response.cookies.set(
      firebaseSessionCookieName,
      idToken,
      getCookieOptions(sessionMaxAgeSeconds),
    );

    return response;
  } catch (error) {
    if (error instanceof OrganizationMembershipAcceptanceError) {
      return NextResponse.json(
        { error: error.message, reason: error.reason },
        { status: error.status },
      );
    }

    logFirebaseAdminSessionDiagnostic("session-verification-failed", {
      adminAppInitialized,
      error,
    });

    return NextResponse.json(
      { error: "Firebase Admin session verification is not configured." },
      { status: 503 },
    );
  }
}

export function DELETE() {
  const response = NextResponse.json({ status: "ok" });

  response.cookies.set(firebaseSessionCookieName, "", getCookieOptions(0));

  return response;
}
