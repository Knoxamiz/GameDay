export type BackendCollection =
  | "organizations"
  | "organizationMemberships"
  | "parents"
  | "athletes"
  | "coaches"
  | "coachAssignments"
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
  | "accountDeletionRequests"
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
  "organizationMemberships",
  "parents",
  "athletes",
  "coaches",
  "coachAssignments",
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
  "accountDeletionRequests",
  "registrationInvites",
];

export const backendRelationships: BackendRelationship[] = [
  {
    from: "organizationMemberships",
    keys: ["organizationId", "uid", "email", "role", "status"],
    to: "organizations",
  },
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
    from: "coaches",
    keys: ["coachId", "uid", "email"],
    to: "coachAssignments",
  },
  {
    from: "coachAssignments",
    keys: ["coachId", "uid", "email", "organizationId", "teamIds", "status"],
    to: "teams",
  },
  {
    from: "teams",
    keys: [
      "teamId",
      "organizationId",
      "status",
      "coachIds",
      "athleteIds",
      "eventIds",
    ],
    to: "events",
  },
  {
    from: "events",
    keys: ["organizationId", "teamIds"],
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
      "inviteCode",
      "registrationInviteId",
      "rosterStatus",
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
    keys: [
      "eventId",
      "athleteId",
      "parentId",
      "parentUid",
      "ownerUid",
      "organizationId",
      "teamId",
    ],
    to: "events",
  },
  {
    from: "transportation",
    keys: [
      "eventId",
      "athleteId",
      "parentId",
      "parentUid",
      "ownerUid",
      "organizationId",
      "teamId",
    ],
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
    indexes: [
      ["id"],
      ["organizationId"],
      ["slug"],
      ["ownerUid"],
      ["ownerUids"],
      ["billingOwnerUid"],
      ["planTier"],
      ["billingStatus"],
      ["adminUids"],
    ],
    primaryKey: "id",
    scopeKeys: [
      "id",
      "organizationId",
      "slug",
      "ownerUid",
      "ownerUids",
      "billingOwnerUid",
      "planTier",
      "billingStatus",
      "adminUids",
    ],
    serverWritesRequired: true,
  },
  organizationMemberships: {
    collection: "organizationMemberships",
    indexes: [
      ["organizationId"],
      ["uid"],
      ["email"],
      ["role"],
      ["status"],
      ["uid", "status"],
      ["organizationId", "status"],
    ],
    primaryKey: "id",
    scopeKeys: ["organizationId", "uid", "email", "role", "status"],
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
    indexes: [["coachId"], ["uid"], ["email"]],
    primaryKey: "id",
    scopeKeys: ["coachId", "uid", "email"],
    serverWritesRequired: true,
  },
  coachAssignments: {
    collection: "coachAssignments",
    indexes: [
      ["coachId"],
      ["uid"],
      ["email"],
      ["organizationId"],
      ["teamIds"],
      ["status"],
    ],
    primaryKey: "id",
    scopeKeys: [
      "coachId",
      "uid",
      "email",
      "organizationId",
      "teamIds",
      "status",
    ],
    serverWritesRequired: true,
  },
  teams: {
    collection: "teams",
    indexes: [["organizationId"], ["coachIds"]],
    primaryKey: "id",
    scopeKeys: [
      "teamId",
      "organizationId",
      "status",
      "coachIds",
      "athleteIds",
    ],
    serverWritesRequired: true,
  },
  events: {
    collection: "events",
    indexes: [["organizationId"], ["teamIds"], ["startsAt"], ["status"]],
    primaryKey: "id",
    scopeKeys: ["organizationId", "teamIds", "status"],
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
      ["inviteCode"],
      ["registrationInviteId"],
      ["teamId", "rosterStatus"],
    ],
    primaryKey: "id",
    scopeKeys: [
      "organizationId",
      "teamId",
      "athleteId",
      "parentId",
      "parentUid",
      "ownerUid",
      "inviteCode",
      "registrationInviteId",
      "rosterStatus",
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
    indexes: [
      ["eventId"],
      ["athleteId"],
      ["parentId"],
      ["organizationId"],
      ["teamId"],
      ["status"],
    ],
    primaryKey: "id",
    scopeKeys: [
      "eventId",
      "athleteId",
      "parentId",
      "parentUid",
      "ownerUid",
      "organizationId",
      "teamId",
    ],
    serverWritesRequired: true,
  },
  transportation: {
    collection: "transportation",
    indexes: [["eventId"], ["athleteId"], ["parentId"], ["status"]],
    primaryKey: "id",
    scopeKeys: [
      "eventId",
      "athleteId",
      "parentId",
      "parentUid",
      "ownerUid",
      "organizationId",
      "teamId",
    ],
    serverWritesRequired: true,
  },
  rideShareMatches: {
    collection: "rideShareMatches",
    indexes: [["eventId"], ["initialStatus"]],
    primaryKey: "id",
    scopeKeys: ["eventId"],
    serverWritesRequired: true,
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
    serverWritesRequired: true,
  },
  accountDeletionRequests: {
    collection: "accountDeletionRequests",
    indexes: [["uid"], ["email"], ["status"], ["requestedAt"]],
    primaryKey: "id",
    scopeKeys: ["uid", "email", "status"],
    serverWritesRequired: true,
  },
  registrationInvites: {
    collection: "registrationInvites",
    indexes: [
      ["inviteCode"],
      ["organizationId"],
      ["teamId"],
      ["status"],
      ["organizationId", "status"],
    ],
    primaryKey: "id",
    scopeKeys: ["inviteCode", "organizationId", "teamId", "status"],
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
  backendMode: "firestore-live-state",
  blockers: [
    "Payment provider integration is intentionally not connected.",
  ],
  migrationPath: [
    "Keep production reads on Firestore-backed repository functions.",
    "Persist role-scoped reads by organizationId, teamId, parentId, and athleteId.",
    "Add payment provider integration before collecting real payments.",
  ],
};
