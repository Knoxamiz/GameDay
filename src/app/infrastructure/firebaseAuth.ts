import {
  type AuthProvider,
  type AuthSession,
  type AuthSessionSource,
  parseAuthRoleClaims,
} from "./auth";
import { getFirebaseAdminApp } from "./firebaseAdmin";
import { isMissingModuleError } from "./firebase";

const firebaseAdminAuthModuleName = "firebase-admin/auth";
export const firebaseSessionCookieName = "__session";

type FirebaseDecodedToken = Record<string, unknown> & {
  exp?: number;
  iat?: number;
  uid: string;
};

type FirebaseAdminAuth = {
  getUser: (uid: string) => Promise<FirebaseUserRecord>;
  verifyIdToken: (token: string) => Promise<FirebaseDecodedToken>;
};

type FirebaseUserRecord = {
  email?: string;
  emailVerified: boolean;
  uid: string;
};

type FirebaseAdminAuthModule = {
  getAuth: (app: unknown) => FirebaseAdminAuth;
};

async function loadFirebaseAdminAuthModule() {
  try {
    return (await import(firebaseAdminAuthModuleName)) as FirebaseAdminAuthModule;
  } catch (error) {
    if (isMissingModuleError(error)) {
      return null;
    }

    throw error;
  }
}

export async function getFirebaseAdminUser(uid: string) {
  const app = await getFirebaseAdminApp();
  const firebaseAdminAuth = await loadFirebaseAdminAuthModule();

  if (!app || !firebaseAdminAuth) {
    return null;
  }

  const user = await firebaseAdminAuth.getAuth(app).getUser(uid);

  return {
    email: user.email,
    emailVerified: user.emailVerified,
    uid: user.uid,
  };
}

function getBearerToken(source: AuthSessionSource) {
  const authorizationHeader = source.authorizationHeader;

  if (!authorizationHeader?.startsWith("Bearer ")) {
    return undefined;
  }

  return authorizationHeader.slice("Bearer ".length).trim();
}

function getSessionCookieToken(source: AuthSessionSource) {
  return source.cookieHeader
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${firebaseSessionCookieName}=`))
    ?.slice(firebaseSessionCookieName.length + 1);
}

export class FirebaseAdminAuthProvider implements AuthProvider {
  async requireSession(source: AuthSessionSource) {
    const session = await this.verifySession(source);

    if (!session) {
      throw new Error("A valid Firebase session is required.");
    }

    return session;
  }

  async verifySession(source: AuthSessionSource): Promise<AuthSession | null> {
    const token = getBearerToken(source) ?? getSessionCookieToken(source);

    if (!token) {
      return null;
    }

    const app = await getFirebaseAdminApp();
    const firebaseAdminAuth = await loadFirebaseAdminAuthModule();

    if (!app || !firebaseAdminAuth) {
      return null;
    }

    const decodedToken = await firebaseAdminAuth.getAuth(app).verifyIdToken(token);
    const claims = parseAuthRoleClaims(decodedToken);

    return {
      claims,
      expiresAt: decodedToken.exp
        ? new Date(decodedToken.exp * 1000).toISOString()
        : undefined,
      issuedAt: decodedToken.iat
        ? new Date(decodedToken.iat * 1000).toISOString()
        : undefined,
      user: {
        displayName:
          typeof decodedToken.name === "string" ? decodedToken.name : undefined,
        email:
          typeof decodedToken.email === "string" ? decodedToken.email : undefined,
        id: decodedToken.uid,
        providerId: "firebase",
      },
    };
  }
}
