import {
  FirebaseSdkNotInstalledError,
  getFirebaseAdminConfig,
  isMissingModuleError,
  type FirebaseAdminConfig,
} from "./firebase";

const firebaseAdminAppModuleName = "firebase-admin/app";

export type FirebaseAdminApp = {
  name?: string;
  options?: unknown;
};

type FirebaseAdminAppModule = {
  cert: (config: {
    clientEmail: string;
    privateKey: string;
    projectId: string;
  }) => unknown;
  getApp: () => FirebaseAdminApp;
  getApps: () => FirebaseAdminApp[];
  initializeApp: (options: {
    credential: unknown;
    projectId: string;
    storageBucket: string;
  }) => FirebaseAdminApp;
};

async function loadFirebaseAdminAppModule() {
  try {
    return (await import(firebaseAdminAppModuleName)) as FirebaseAdminAppModule;
  } catch (error) {
    if (isMissingModuleError(error)) {
      return null;
    }

    throw error;
  }
}

function buildAdminOptions(
  firebaseAdmin: FirebaseAdminAppModule,
  config: FirebaseAdminConfig,
) {
  return {
    credential: firebaseAdmin.cert({
      clientEmail: config.clientEmail,
      privateKey: config.privateKey,
      projectId: config.projectId,
    }),
    projectId: config.projectId,
    storageBucket: config.storageBucket,
  };
}

export async function getFirebaseAdminApp() {
  const config = getFirebaseAdminConfig();

  if (!config) {
    return null;
  }

  const firebaseAdmin = await loadFirebaseAdminAppModule();

  if (!firebaseAdmin) {
    return null;
  }

  return firebaseAdmin.getApps().length > 0
    ? firebaseAdmin.getApp()
    : firebaseAdmin.initializeApp(buildAdminOptions(firebaseAdmin, config));
}

export async function requireFirebaseAdminApp() {
  const config = getFirebaseAdminConfig();

  if (!config) {
    throw new Error("Firebase Admin credentials are not configured.");
  }

  const firebaseAdmin = await loadFirebaseAdminAppModule();

  if (!firebaseAdmin) {
    throw new FirebaseSdkNotInstalledError("firebase-admin");
  }

  return firebaseAdmin.getApps().length > 0
    ? firebaseAdmin.getApp()
    : firebaseAdmin.initializeApp(buildAdminOptions(firebaseAdmin, config));
}
