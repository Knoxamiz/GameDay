export type InfrastructureArea =
  | "app"
  | "auth"
  | "firebaseAdmin"
  | "firebaseClient"
  | "firestore"
  | "payments"
  | "storage";

export type InfrastructureEnvKey = {
  area: InfrastructureArea[];
  description: string;
  key: string;
  public: boolean;
};

export type InfrastructureAreaStatus = {
  configured: boolean;
  configuredKeys: string[];
  missingKeys: string[];
};

export type InfrastructureEnvStatus = Record<
  InfrastructureArea,
  InfrastructureAreaStatus
> & {
  mode: "not-configured" | "partially-configured" | "configured";
};

export class MissingInfrastructureEnvError extends Error {
  constructor(readonly missingKeys: string[]) {
    super(`Missing infrastructure environment variables: ${missingKeys.join(", ")}`);
    this.name = "MissingInfrastructureEnvError";
  }
}

export const infrastructureEnvKeys: InfrastructureEnvKey[] = [
  {
    area: ["app"],
    description: "Canonical deployed app URL for metadata and redirects.",
    key: "NEXT_PUBLIC_APP_URL",
    public: true,
  },
  {
    area: ["auth", "firebaseClient", "firestore"],
    description: "Firebase web API key.",
    key: "NEXT_PUBLIC_FIREBASE_API_KEY",
    public: true,
  },
  {
    area: ["auth", "firebaseClient"],
    description: "Firebase Auth domain.",
    key: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    public: true,
  },
  {
    area: ["auth", "firebaseAdmin", "firebaseClient", "firestore", "storage"],
    description: "Firebase project ID.",
    key: "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    public: true,
  },
  {
    area: ["firebaseClient", "storage"],
    description: "Firebase Storage bucket.",
    key: "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    public: true,
  },
  {
    area: ["firebaseClient"],
    description: "Firebase app ID.",
    key: "NEXT_PUBLIC_FIREBASE_APP_ID",
    public: true,
  },
  {
    area: ["firebaseAdmin", "firestore", "storage"],
    description: "Firebase Admin service account email.",
    key: "FIREBASE_CLIENT_EMAIL",
    public: false,
  },
  {
    area: ["firebaseAdmin", "firestore", "storage"],
    description: "Firebase Admin service account private key.",
    key: "FIREBASE_PRIVATE_KEY",
    public: false,
  },
  {
    area: ["payments"],
    description: "Payment provider secret key.",
    key: "PAYMENT_PROVIDER_SECRET_KEY",
    public: false,
  },
  {
    area: ["payments"],
    description: "Payment provider webhook signing secret.",
    key: "PAYMENT_WEBHOOK_SECRET",
    public: false,
  },
];

const infrastructureAreas: InfrastructureArea[] = [
  "app",
  "auth",
  "firebaseAdmin",
  "firebaseClient",
  "firestore",
  "payments",
  "storage",
];

export function readInfrastructureEnv(key: string) {
  const value = process.env[key]?.trim();

  return value && value.length > 0 ? value : undefined;
}

export function isInfrastructureEnvConfigured(key: string) {
  return Boolean(readInfrastructureEnv(key));
}

function getAreaKeys(area: InfrastructureArea) {
  return infrastructureEnvKeys.filter((entry) => entry.area.includes(area));
}

export function getInfrastructureAreaStatus(
  area: InfrastructureArea,
): InfrastructureAreaStatus {
  const keys = getAreaKeys(area);
  const configuredKeys = keys
    .filter((entry) => isInfrastructureEnvConfigured(entry.key))
    .map((entry) => entry.key);
  const missingKeys = keys
    .filter((entry) => !isInfrastructureEnvConfigured(entry.key))
    .map((entry) => entry.key);

  return {
    configured: missingKeys.length === 0,
    configuredKeys,
    missingKeys,
  };
}

export function getInfrastructureEnvStatus(): InfrastructureEnvStatus {
  const status = infrastructureAreas.reduce(
    (summary, area) => ({
      ...summary,
      [area]: getInfrastructureAreaStatus(area),
    }),
    {} as Record<InfrastructureArea, InfrastructureAreaStatus>,
  );
  const requiredAreas = infrastructureAreas.filter((area) => area !== "app");
  const configuredAreaCount = requiredAreas.filter(
    (area) => status[area].configured,
  ).length;

  return {
    ...status,
    mode:
      configuredAreaCount === 0
        ? "not-configured"
        : configuredAreaCount === requiredAreas.length
          ? "configured"
          : "partially-configured",
  };
}

export function requireInfrastructureEnv(keys: string[]) {
  const missingKeys = keys.filter((key) => !isInfrastructureEnvConfigured(key));

  if (missingKeys.length > 0) {
    throw new MissingInfrastructureEnvError(missingKeys);
  }

  return keys.reduce<Record<string, string>>((values, key) => {
    values[key] = readInfrastructureEnv(key) ?? "";
    return values;
  }, {});
}
