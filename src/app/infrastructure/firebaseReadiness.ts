import { getFirebaseAdminConfig, getFirebaseClientConfig } from "./firebase";

export function getFirebaseWiringStatus() {
  return {
    adapters: {
      adminApp: "src/app/infrastructure/firebaseAdmin.ts",
      auth: "src/app/infrastructure/firebaseAuth.ts",
      clientApp: "src/app/infrastructure/firebaseClient.ts",
      firestoreRepositories:
        "src/app/infrastructure/firebaseRepositories.ts",
      storage: "src/app/infrastructure/firebaseStorage.ts",
    },
    adminConfigured: Boolean(getFirebaseAdminConfig()),
    clientConfigured: Boolean(getFirebaseClientConfig()),
    packagesRequired: ["firebase", "firebase-admin"],
  };
}
