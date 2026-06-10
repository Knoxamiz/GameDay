import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdminConfig } from "../../infrastructure/firebase";
import {
  firebaseSessionCookieName,
  FirebaseAdminAuthProvider,
} from "../../infrastructure/firebaseAuth";
import {
  getLandingRouteForClaims,
  type AuthSession,
} from "../../infrastructure/auth";

const sessionMaxAgeSeconds = 60 * 60;

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
  return Boolean(session?.claims.role === "parent" && session.claims.parentId);
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

export async function POST(request: NextRequest) {
  if (!getFirebaseAdminConfig()) {
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

  const authProvider = new FirebaseAdminAuthProvider();
  const session = await authProvider.verifySession({
    authorizationHeader: `Bearer ${idToken}`,
  });

  if (!isValidParentSession(session) && !isValidAdminSession(session)) {
    return NextResponse.json(
      {
        error:
          "This session endpoint requires parent claims or admin claims with an organization.",
      },
      { status: 403 },
    );
  }

  const response = NextResponse.json({
    adminId: session.claims.adminId,
    landingRoute: getLandingRouteForClaims(session.claims),
    parentId: session.claims.parentId,
    role: session.claims.role,
    status: "ok",
  });
  response.cookies.set(
    firebaseSessionCookieName,
    idToken,
    getCookieOptions(sessionMaxAgeSeconds),
  );

  return response;
}

export function DELETE() {
  const response = NextResponse.json({ status: "ok" });

  response.cookies.set(firebaseSessionCookieName, "", getCookieOptions(0));

  return response;
}
