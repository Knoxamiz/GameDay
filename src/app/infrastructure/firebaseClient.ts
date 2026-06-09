import {
  FirebaseSdkNotInstalledError,
  getFirebaseClientConfig,
  isMissingModuleError,
  requireFirebaseClientConfig,
  type FirebaseClientConfig,
} from "./firebase";

const firebaseAppModuleName = "firebase/app";

export type FirebaseClientApp = {
  name?: string;
  options?: unknown;
};

type FirebaseAppModule = {
  getApp: () => FirebaseClientApp;
  getApps: () => FirebaseClientApp[];
  initializeApp: (config: FirebaseClientConfig) => FirebaseClientApp;
};

async function loadFirebaseAppModule() {
  try {
    return (await import(firebaseAppModuleName)) as FirebaseAppModule;
  } catch (error) {
    if (isMissingModuleError(error)) {
      return null;
    }

    throw error;
  }
}

export async function getFirebaseClientApp() {
  const config = getFirebaseClientConfig();

  if (!config) {
    return null;
  }

  const firebaseApp = await loadFirebaseAppModule();

  if (!firebaseApp) {
    return null;
  }

  return firebaseApp.getApps().length > 0
    ? firebaseApp.getApp()
    : firebaseApp.initializeApp(config);
}

export async function requireFirebaseClientApp() {
  const config = requireFirebaseClientConfig();
  const firebaseApp = await loadFirebaseAppModule();

  if (!firebaseApp) {
    throw new FirebaseSdkNotInstalledError("firebase");
  }

  return firebaseApp.getApps().length > 0
    ? firebaseApp.getApp()
    : firebaseApp.initializeApp(config);
}
