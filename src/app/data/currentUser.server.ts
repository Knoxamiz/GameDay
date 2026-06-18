import { cookies, headers } from "next/headers";
import type { AuthSession, AuthSessionSource } from "../infrastructure/auth";
import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import { FirebaseAdminAuthProvider } from "../infrastructure/firebaseAuth";
import { getLiveParentId, getLiveParentUid } from "./liveIdentity";

export type CurrentParentUserSource =
  | "firebase-session"
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

function getSignedOutParentUser(): CurrentParentUser {
  return {
    athleteIds: [],
    organizationIds: [],
    parentId: "",
    source: "signed-out",
    teamIds: [],
  };
}

export async function getCurrentAuthSession(): Promise<AuthSession | null> {
  if (!getFirebaseAdminConfig()) {
    return null;
  }

  try {
    const authProvider = new FirebaseAdminAuthProvider();

    return await authProvider.verifySession(await getAuthSessionSource());
  } catch (error) {
    console.warn("Could not resolve current authenticated user.", {
      message: error instanceof Error ? error.message : "Unknown error",
      name: error instanceof Error ? error.name : typeof error,
    });

    return null;
  }
}

export async function getCurrentParentUser(): Promise<CurrentParentUser> {
  const session = await getCurrentAuthSession();
  const parentId = getLiveParentId(session);
  const parentUid = getLiveParentUid(session);

  if (session && parentId && parentUid) {
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

  return getSignedOutParentUser();
}
