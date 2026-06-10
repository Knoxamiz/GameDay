import { cookies, headers } from "next/headers";
import type { AuthSession, AuthSessionSource } from "../infrastructure/auth";
import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import { FirebaseAdminAuthProvider } from "../infrastructure/firebaseAuth";
import { getLiveParentId, getLiveParentUid } from "./liveIdentity";
import { currentParentId } from "./parents";

export type CurrentParentUserSource =
  | "firebase-session"
  | "mock"
  | "signed-out";

export type CurrentParentUser = {
  athleteIds: string[];
  organizationIds: string[];
  parentId: string;
  parentUid?: string;
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

function getSignedOutParentUser(): CurrentParentUser {
  return {
    athleteIds: [],
    organizationIds: [],
    parentId: "",
    source: "signed-out",
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
    const parentId = getLiveParentId(session);
    const parentUid = getLiveParentUid(session);

    if (session?.claims.role === "parent" && parentId && parentUid) {
      return {
        athleteIds: session.claims.athleteIds,
        organizationIds: session.claims.organizationIds,
        parentId,
        parentUid,
        session,
        source: "firebase-session",
        teamIds: session.claims.teamIds,
      };
    }
  } catch (error) {
    console.warn("Could not resolve live parent user.", {
      message: error instanceof Error ? error.message : "Unknown error",
      name: error instanceof Error ? error.name : typeof error,
    });
  }

  return getSignedOutParentUser();
}
