export type BackendCollection =
  | "organizations"
  | "parents"
  | "athletes"
  | "coaches"
  | "teams"
  | "events"
  | "registrations"
  | "documentRequirements"
  | "paymentRequirements"
  | "attendance"
  | "transportation"
  | "rideShareMatches"
  | "messages"
  | "gameAlerts"
  | "registrationInvites";

export type BackendRelationship = {
  from: BackendCollection;
  keys: string[];
  to: BackendCollection;
};

export type BackendCollectionSpec = {
  collection: BackendCollection;
  indexes: string[][];
  primaryKey: string;
  serverWritesRequired: boolean;
  scopeKeys: string[];
};

export const backendCollections: BackendCollection[] = [
  "organizations",
  "parents",
  "athletes",
  "coaches",
  "teams",
  "events",
  "registrations",
  "documentRequirements",
  "paymentRequirements",
  "attendance",
  "transportation",
  "rideShareMatches",
  "messages",
  "gameAlerts",
  "registrationInvites",
];

export const backendRelationships: BackendRelationship[] = [
  {
    from: "parents",
    keys: ["parentUid", "ownerUid", "organizationIds", "athleteIds"],
    to: "organizations",
  },
  {
    from: "athletes",
    keys: ["parentId", "parentUid", "ownerUid", "teamId", "registrationId"],
    to: "registrations",
  },
  {
    from: "teams",
    keys: ["organizationId", "coachIds", "athleteIds", "eventIds"],
    to: "events",
  },
  {
    from: "events",
    keys: ["organizationId", "teamId"],
    to: "teams",
  },
  {
    from: "registrations",
    keys: [
      "organizationId",
      "teamId",
      "athleteId",
      "parentId",
      "parentUid",
      "ownerUid",
    ],
    to: "athletes",
  },
  {
    from: "documentRequirements",
    keys: ["organizationId", "teamId", "athleteId", "parentId", "registrationId"],
    to: "registrations",
  },
  {
    from: "paymentRequirements",
    keys: ["organizationId", "teamId", "athleteId", "parentId", "registrationId"],
    to: "registrations",
  },
  {
    from: "attendance",
    keys: ["eventId", "athleteId"],
    to: "events",
  },
  {
    from: "transportation",
    keys: ["eventId", "athleteId", "parentId"],
    to: "events",
  },
  {
    from: "registrationInvites",
    keys: ["organizationId", "teamId"],
    to: "teams",
  },
];

export const backendCollectionSpecs: Record<
  BackendCollection,
  BackendCollectionSpec
> = {
  organizations: {
    collection: "organizations",
    indexes: [["id"]],
    primaryKey: "id",
    scopeKeys: ["id"],
    serverWritesRequired: true,
  },
  parents: {
    collection: "parents",
    indexes: [["parentUid"], ["ownerUid"], ["organizationIds"], ["athleteIds"]],
    primaryKey: "id",
    scopeKeys: ["parentUid", "ownerUid", "organizationIds", "athleteIds"],
    serverWritesRequired: true,
  },
  athletes: {
    collection: "athletes",
    indexes: [["parentId"], ["parentUid"], ["ownerUid"], ["teamId"], ["registrationId"]],
    primaryKey: "id",
    scopeKeys: ["parentId", "parentUid", "ownerUid", "teamId"],
    serverWritesRequired: true,
  },
  coaches: {
    collection: "coaches",
    indexes: [["organizationId"], ["teamIds"]],
    primaryKey: "id",
    scopeKeys: ["organizationId", "teamIds"],
    serverWritesRequired: true,
  },
  teams: {
    collection: "teams",
    indexes: [["organizationId"], ["coachIds"]],
    primaryKey: "id",
    scopeKeys: ["organizationId", "coachIds", "athleteIds"],
    serverWritesRequired: true,
  },
  events: {
    collection: "events",
    indexes: [["organizationId"], ["teamId"], ["startDateTime"]],
    primaryKey: "id",
    scopeKeys: ["organizationId", "teamId"],
    serverWritesRequired: true,
  },
  registrations: {
    collection: "registrations",
    indexes: [
      ["organizationId"],
      ["teamId"],
      ["athleteId"],
      ["parentId"],
      ["parentUid"],
      ["ownerUid"],
    ],
    primaryKey: "id",
    scopeKeys: [
      "organizationId",
      "teamId",
      "athleteId",
      "parentId",
      "parentUid",
      "ownerUid",
    ],
    serverWritesRequired: true,
  },
  documentRequirements: {
    collection: "documentRequirements",
    indexes: [["registrationId"], ["teamId"], ["parentId"], ["status"]],
    primaryKey: "id",
    scopeKeys: ["organizationId", "teamId", "athleteId", "parentId"],
    serverWritesRequired: true,
  },
  paymentRequirements: {
    collection: "paymentRequirements",
    indexes: [["registrationId"], ["teamId"], ["parentId"], ["status"]],
    primaryKey: "id",
    scopeKeys: ["organizationId", "teamId", "athleteId", "parentId"],
    serverWritesRequired: true,
  },
  attendance: {
    collection: "attendance",
    indexes: [["eventId"], ["athleteId"], ["status"]],
    primaryKey: "id",
    scopeKeys: ["eventId", "athleteId"],
    serverWritesRequired: false,
  },
  transportation: {
    collection: "transportation",
    indexes: [["eventId"], ["athleteId"], ["parentId"], ["status"]],
    primaryKey: "id",
    scopeKeys: ["eventId", "athleteId", "parentId"],
    serverWritesRequired: false,
  },
  rideShareMatches: {
    collection: "rideShareMatches",
    indexes: [["eventId"], ["initialStatus"]],
    primaryKey: "id",
    scopeKeys: ["eventId"],
    serverWritesRequired: false,
  },
  messages: {
    collection: "messages",
    indexes: [["organizationId"], ["teamId"], ["eventId"], ["recipientParentId"]],
    primaryKey: "id",
    scopeKeys: ["organizationId", "teamId", "recipientParentId"],
    serverWritesRequired: true,
  },
  gameAlerts: {
    collection: "gameAlerts",
    indexes: [["eventId"], ["status"]],
    primaryKey: "eventId",
    scopeKeys: ["eventId"],
    serverWritesRequired: false,
  },
  registrationInvites: {
    collection: "registrationInvites",
    indexes: [["code"], ["organizationId"], ["teamId"], ["status"]],
    primaryKey: "id",
    scopeKeys: ["organizationId", "teamId"],
    serverWritesRequired: true,
  },
};

export const backendStorageTargets = {
  documentUploads:
    "organizations/{organizationId}/registrations/{registrationId}/requirements/{documentRequirementId}/{fileName}",
};

export const backendPaymentMetadataKeys = [
  "organizationId",
  "teamId",
  "athleteId",
  "parentId",
  "parentUid",
  "ownerUid",
  "registrationId",
  "paymentRequirementId",
];

export const betaPersistenceReadiness = {
  backendMode: "mock-local-state",
  blockers: [
    "Firebase project and environment variables are not configured.",
    "Authentication and role claims are not implemented.",
    "Document upload storage is not implemented.",
    "Payment provider integration is intentionally not connected.",
  ],
  migrationPath: [
    "Keep current IDs as Firebase document IDs where possible.",
    "Move local state helpers behind repository functions.",
    "Persist role-scoped reads by organizationId, teamId, parentId, and athleteId.",
    "Add server-side validation before real document or payment workflows.",
  ],
};
