import { cookies, headers } from "next/headers";
import type { AuthSession, AuthSessionSource } from "../infrastructure/auth";
import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import { FirebaseAdminAuthProvider } from "../infrastructure/firebaseAuth";
import { currentParentId } from "./parents";

export type CurrentParentUserSource = "firebase-session" | "mock";

export type CurrentParentUser = {
  athleteIds: string[];
  organizationIds: string[];
  parentId: string;
  session?: AuthSession;
  source: CurrentParentUserSource;
  teamIds: string[];
};

async function getAuthSessionSource(): Promise<AuthSessionSource> {
  const [requestHeaders, requestCookies] = await Promise.all([
    headers(),
    cookies(),
  ]);
  const cookieHeader = requestCookies
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  return {
    authorizationHeader: requestHeaders.get("authorization") ?? undefined,
    cookieHeader: cookieHeader.length > 0 ? cookieHeader : undefined,
  };
}

function getMockParentUser(): CurrentParentUser {
  // Mock fallback keeps the current MVP usable without Firebase Auth/session env.
  return {
    athleteIds: [],
    organizationIds: [],
    parentId: currentParentId,
    source: "mock",
    teamIds: [],
  };
}

export async function getCurrentParentUser(): Promise<CurrentParentUser> {
  if (!getFirebaseAdminConfig()) {
    return getMockParentUser();
  }

  try {
    // Real auth attempt: resolve the current parent from Firebase token claims.
    const authProvider = new FirebaseAdminAuthProvider();
    const session = await authProvider.verifySession(await getAuthSessionSource());

    if (session?.claims.role === "parent" && session.claims.parentId) {
      return {
        athleteIds: session.claims.athleteIds,
        organizationIds: session.claims.organizationIds,
        parentId: session.claims.parentId,
        session,
        source: "firebase-session",
        teamIds: session.claims.teamIds,
      };
    }
  } catch (error) {
    console.warn("Falling back to mock parent user.", error);
  }

  return getMockParentUser();
}
