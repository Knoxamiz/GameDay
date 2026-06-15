import {
  type AuthCredentials,
  type AuthSession,
  type AuthenticatedUser,
  type ClientAuthAdapter,
  parseAuthRoleClaims,
} from "./auth";
import { FirebaseSdkNotInstalledError, isMissingModuleError } from "./firebase";
import { getFirebaseClientApp } from "./firebaseClient";

const firebaseAuthModuleName = "firebase/auth";

type FirebaseClientAuth = unknown;

type FirebaseIdTokenResult = {
  claims: Record<string, unknown>;
  expirationTime?: string;
  issuedAtTime?: string;
};

type FirebaseClientUser = {
  displayName?: string | null;
  email?: string | null;
  getIdToken: () => Promise<string>;
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
): Promise<AuthSession> {
  const tokenResult = await user.getIdTokenResult();
  const claims = parseAuthRoleClaims(tokenResult.claims);

  return {
    claims,
    expiresAt: tokenResult.expirationTime,
    issuedAt: tokenResult.issuedAtTime,
    user: mapFirebaseUser(user),
  };
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

export async function signInFirebaseUserWithEmailPassword(
  credentials: AuthCredentials,
) {
  const app = await getFirebaseClientApp();
  const firebaseAuth = await loadFirebaseClientAuthModule();

  if (!app || !firebaseAuth) {
    return null;
  }

  const auth = firebaseAuth.getAuth(app);
  const credential = await firebaseAuth.signInWithEmailAndPassword(
    auth,
    credentials.email,
    credentials.password,
  );
  const [idToken, session] = await Promise.all([
    credential.user.getIdToken(),
    buildSessionFromClientUser(credential.user),
  ]);

  return {
    idToken,
    session,
  };
}

export async function requireFirebaseClientAuthAdapter() {
  const adapter = await createFirebaseClientAuthAdapter();

  if (!adapter) {
    throw new FirebaseSdkNotInstalledError("firebase");
  }

  return adapter;
}
