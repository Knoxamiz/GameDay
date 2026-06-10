import { getFirebaseAdminConfig, getFirebaseClientConfig } from "./firebase";
import { getFirebaseAdminAppInitializationStatus } from "./firebaseAdmin";

export async function getFirebaseWiringStatus() {
  const adminApp = await getFirebaseAdminAppInitializationStatus();

  return {
    adapters: {
      adminApp: "src/app/infrastructure/firebaseAdmin.ts",
      auth: "src/app/infrastructure/firebaseAuth.ts",
      clientApp: "src/app/infrastructure/firebaseClient.ts",
      firestoreRepositories:
        "src/app/infrastructure/firebaseRepositories.ts",
      storage: "src/app/infrastructure/firebaseStorage.ts",
    },
    adminDiagnostics: {
      ...adminApp.diagnostics,
      adminAppInitialized: adminApp.initialized,
    },
    adminConfigured: Boolean(getFirebaseAdminConfig()),
    adminInitializable: adminApp.initialized,
    clientConfigured: Boolean(getFirebaseClientConfig()),
    packagesRequired: ["firebase", "firebase-admin"],
  };
}
