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
import {
  getLandingRouteForClaims,
  type AuthSession,
} from "../../infrastructure/auth";
import { getLiveParentId, getLiveParentUid } from "../../data/liveIdentity";

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

function isValidParentSession(
  session: AuthSession | null,
): session is AuthSession {
  return Boolean(session?.claims.role === "parent" && getLiveParentUid(session));
}

function isValidAdminSession(
  session: AuthSession | null,
): session is AuthSession {
  return Boolean(
    session?.claims.role === "admin" &&
      session.claims.adminId &&
      session.claims.organizationIds.length > 0,
  );
}

function isValidCoachSession(
  session: AuthSession | null,
): session is AuthSession {
  return Boolean(
    session?.claims.role === "coach" &&
      session.claims.coachId &&
      session.claims.organizationIds.length > 0 &&
      session.claims.teamIds.length > 0,
  );
}

function getSessionResponseBody(session: AuthSession) {
  return {
    adminId: session.claims.adminId,
    coachId: session.claims.coachId,
    email: session.user.email,
    landingRoute: getLandingRouteForClaims(session.claims),
    parentId:
      session.claims.role === "parent"
        ? getLiveParentId(session)
        : session.claims.parentId,
    parentUid:
      session.claims.role === "parent" ? getLiveParentUid(session) : undefined,
    role: session.claims.role,
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
      status: "preview",
    });
  }

  try {
    const authProvider = new FirebaseAdminAuthProvider();
    const session = await authProvider.verifySession({
      cookieHeader: request.headers.get("cookie") ?? undefined,
    });

    if (
      !isValidParentSession(session) &&
      !isValidCoachSession(session) &&
      !isValidAdminSession(session)
    ) {
      return NextResponse.json({
        configured: true,
        status: "signed-out",
      });
    }

    return NextResponse.json({
      configured: true,
      ...getSessionResponseBody(session),
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

    if (
      !isValidParentSession(session) &&
      !isValidCoachSession(session) &&
      !isValidAdminSession(session)
    ) {
      return NextResponse.json(
        {
          error:
            "This session endpoint requires parent, coach, or admin claims with an organization.",
        },
        { status: 403 },
      );
    }

    const response = NextResponse.json({
      ...getSessionResponseBody(session),
      status: "ok",
    });
    response.cookies.set(
      firebaseSessionCookieName,
      idToken,
      getCookieOptions(sessionMaxAgeSeconds),
    );

    return response;
  } catch (error) {
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
