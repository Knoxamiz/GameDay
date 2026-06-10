import {
  readInfrastructureEnv,
  requireInfrastructureEnv,
} from "./env";

export type FirebaseClientConfig = {
  apiKey: string;
  appId: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
};

export type FirebaseAdminConfig = {
  clientEmail: string;
  privateKey: string;
  projectId: string;
  storageBucket: string;
};

export type FirebaseAdminEnvDiagnostics = {
  clientEmailExists: boolean;
  privateKeyContainsEscapedNewlines: boolean;
  privateKeyContainsRealNewlines: boolean;
  privateKeyExists: boolean;
  privateKeyHadMatchingOuterQuotes: boolean;
  privateKeyIncludesPemFooter: boolean;
  privateKeyStartsWithPemHeader: boolean;
  projectIdExists: boolean;
  storageBucketExists: boolean;
};

export class FirebaseIntegrationNotConfiguredError extends Error {
  constructor(readonly target: "admin" | "client") {
    super(`Firebase ${target} integration is not configured.`);
    this.name = "FirebaseIntegrationNotConfiguredError";
  }
}

export class FirebaseSdkNotInstalledError extends Error {
  constructor(readonly packageName: "firebase" | "firebase-admin") {
    super(
      `${packageName} is not installed. Run npm install firebase firebase-admin.`,
    );
    this.name = "FirebaseSdkNotInstalledError";
  }
}

function stripMatchingOuterQuotes(value: string) {
  const trimmedValue = value.trim();
  const firstCharacter = trimmedValue.at(0);
  const lastCharacter = trimmedValue.at(-1);

  if (
    trimmedValue.length >= 2 &&
    ((firstCharacter === '"' && lastCharacter === '"') ||
      (firstCharacter === "'" && lastCharacter === "'"))
  ) {
    return trimmedValue.slice(1, -1).trim();
  }

  return trimmedValue;
}

export function normalizePrivateKey(privateKey: string) {
  return stripMatchingOuterQuotes(privateKey).replace(/\\n/g, "\n").trim();
}

export function getFirebaseAdminEnvDiagnostics(): FirebaseAdminEnvDiagnostics {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  const storageBucket =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
  const unquotedPrivateKey = rawPrivateKey
    ? stripMatchingOuterQuotes(rawPrivateKey)
    : "";
  const normalizedPrivateKey = rawPrivateKey
    ? normalizePrivateKey(rawPrivateKey)
    : "";

  return {
    clientEmailExists: Boolean(clientEmail),
    privateKeyContainsEscapedNewlines: unquotedPrivateKey.includes("\\n"),
    privateKeyContainsRealNewlines: unquotedPrivateKey.includes("\n"),
    privateKeyExists: Boolean(rawPrivateKey),
    privateKeyHadMatchingOuterQuotes:
      Boolean(rawPrivateKey) && rawPrivateKey !== unquotedPrivateKey,
    privateKeyIncludesPemFooter: normalizedPrivateKey.includes(
      "-----END PRIVATE KEY-----",
    ),
    privateKeyStartsWithPemHeader: normalizedPrivateKey.startsWith(
      "-----BEGIN PRIVATE KEY-----",
    ),
    projectIdExists: Boolean(projectId),
    storageBucketExists: Boolean(storageBucket),
  };
}

export function getFirebaseClientConfig(): FirebaseClientConfig | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  const storageBucket =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim();

  if (!apiKey || !authDomain || !projectId || !storageBucket || !appId) {
    return null;
  }

  return {
    apiKey,
    appId,
    authDomain,
    projectId,
    storageBucket,
  };
}

export function requireFirebaseClientConfig(): FirebaseClientConfig {
  const config = getFirebaseClientConfig();

  if (!config) {
    throw new FirebaseIntegrationNotConfiguredError("client");
  }

  return config;
}

export function getFirebaseAdminConfig(): FirebaseAdminConfig | null {
  const projectId = readInfrastructureEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  const storageBucket = readInfrastructureEnv(
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  );
  const clientEmail = readInfrastructureEnv("FIREBASE_CLIENT_EMAIL");
  const privateKey = readInfrastructureEnv("FIREBASE_PRIVATE_KEY");

  if (!projectId || !storageBucket || !clientEmail || !privateKey) {
    return null;
  }

  return {
    clientEmail,
    privateKey: normalizePrivateKey(privateKey),
    projectId,
    storageBucket,
  };
}

export function requireFirebaseAdminConfig(): FirebaseAdminConfig {
  const values = requireInfrastructureEnv([
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "FIREBASE_CLIENT_EMAIL",
    "FIREBASE_PRIVATE_KEY",
  ]);

  return {
    clientEmail: values.FIREBASE_CLIENT_EMAIL,
    privateKey: normalizePrivateKey(values.FIREBASE_PRIVATE_KEY),
    projectId: values.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: values.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  };
}

export function isMissingModuleError(error: unknown) {
  return (
    error instanceof Error &&
    ("code" in error
      ? error.code === "MODULE_NOT_FOUND" || error.code === "ERR_MODULE_NOT_FOUND"
      : /Cannot find module|module not found/i.test(error.message))
  );
}
