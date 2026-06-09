import {
  type AuthCredentials,
  type AuthProvider,
  type AuthSession,
  type AuthSessionSource,
  type AuthenticatedUser,
  type ClientAuthAdapter,
  parseAuthRoleClaims,
} from "./auth";
import { getFirebaseAdminApp } from "./firebaseAdmin";
import { getFirebaseClientApp } from "./firebaseClient";
import { FirebaseSdkNotInstalledError, isMissingModuleError } from "./firebase";

const firebaseAuthModuleName = "firebase/auth";
const firebaseAdminAuthModuleName = "firebase-admin/auth";
const sessionCookieName = "__session";

type FirebaseClientAuth = unknown;

type FirebaseIdTokenResult = {
  claims: Record<string, unknown>;
  expirationTime?: string;
  issuedAtTime?: string;
};

type FirebaseClientUser = {
  displayName?: string | null;
  email?: string | null;
  getIdTokenResult: () => Promise<FirebaseIdTokenResult>;
  phoneNumber?: string | null;
  uid: string;
};

type FirebaseAuthCredential = {
  user: FirebaseClientUser;
};

type FirebaseClientAuthModule = {
  getAuth: (app: unknown) => FirebaseClientAuth;
  onAuthStateChanged: (
    auth: FirebaseClientAuth,
    callback: (user: FirebaseClientUser | null) => void,
  ) => () => void;
  signInWithEmailAndPassword: (
    auth: FirebaseClientAuth,
    email: string,
    password: string,
  ) => Promise<FirebaseAuthCredential>;
  signOut: (auth: FirebaseClientAuth) => Promise<void>;
};

type FirebaseDecodedToken = Record<string, unknown> & {
  exp?: number;
  iat?: number;
  uid: string;
};

type FirebaseAdminAuth = {
  verifyIdToken: (token: string) => Promise<FirebaseDecodedToken>;
};

type FirebaseAdminAuthModule = {
  getAuth: (app: unknown) => FirebaseAdminAuth;
};

async function loadFirebaseClientAuthModule() {
  try {
    return (await import(firebaseAuthModuleName)) as FirebaseClientAuthModule;
  } catch (error) {
    if (isMissingModuleError(error)) {
      return null;
    }

    throw error;
  }
}

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

function mapFirebaseUser(user: FirebaseClientUser): AuthenticatedUser {
  return {
    displayName: user.displayName ?? undefined,
    email: user.email ?? undefined,
    id: user.uid,
    phoneNumber: user.phoneNumber ?? undefined,
    providerId: "firebase",
  };
}

async function buildSessionFromClientUser(
  user: FirebaseClientUser,
): Promise<AuthSession | null> {
  const tokenResult = await user.getIdTokenResult();
  const claims = parseAuthRoleClaims(tokenResult.claims);

  if (!claims) {
    return null;
  }

  return {
    claims,
    expiresAt: tokenResult.expirationTime,
    issuedAt: tokenResult.issuedAtTime,
    user: mapFirebaseUser(user),
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
    .find((cookie) => cookie.startsWith(`${sessionCookieName}=`))
    ?.slice(sessionCookieName.length + 1);
}

export async function createFirebaseClientAuthAdapter(): Promise<ClientAuthAdapter | null> {
  const app = await getFirebaseClientApp();
  const firebaseAuth = await loadFirebaseClientAuthModule();

  if (!app || !firebaseAuth) {
    return null;
  }

  const auth = firebaseAuth.getAuth(app);

  return {
    async getCurrentSession() {
      const currentUser = "currentUser" in Object(auth)
        ? (auth as { currentUser?: FirebaseClientUser | null }).currentUser
        : null;

      return currentUser ? buildSessionFromClientUser(currentUser) : null;
    },
    async getCurrentUser() {
      const currentUser = "currentUser" in Object(auth)
        ? (auth as { currentUser?: FirebaseClientUser | null }).currentUser
        : null;

      return currentUser ? mapFirebaseUser(currentUser) : null;
    },
    async login(credentials: AuthCredentials) {
      const credential = await firebaseAuth.signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password,
      );
      const session = await buildSessionFromClientUser(credential.user);

      if (!session) {
        throw new Error("Firebase user is missing required GameDay role claims.");
      }

      return session;
    },
    logout() {
      return firebaseAuth.signOut(auth);
    },
    onSessionChanged(callback) {
      return firebaseAuth.onAuthStateChanged(auth, async (user) => {
        callback(user ? await buildSessionFromClientUser(user) : null);
      });
    },
  };
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

    if (!claims) {
      return null;
    }

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

export async function requireFirebaseClientAuthAdapter() {
  const adapter = await createFirebaseClientAuthAdapter();

  if (!adapter) {
    throw new FirebaseSdkNotInstalledError("firebase");
  }

  return adapter;
}
