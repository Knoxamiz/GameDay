export type AccessRole = "parent" | "coach" | "admin";

export type AccessCapability =
  | "view-own-athletes"
  | "view-team-readiness"
  | "manage-attendance"
  | "manage-transportation"
  | "review-registrations"
  | "review-documents"
  | "review-payments"
  | "manage-organization";

export type AccessRoleDefinition = {
  capabilities: AccessCapability[];
  description: string;
  landingRoute: string;
  role: AccessRole;
};

export const accessRoles: AccessRoleDefinition[] = [
  {
    capabilities: [
      "view-own-athletes",
      "manage-attendance",
      "manage-transportation",
    ],
    description: "Parents can self-serve athlete readiness and logistics.",
    landingRoute: "/parent",
    role: "parent",
  },
  {
    capabilities: [
      "view-team-readiness",
      "manage-attendance",
      "manage-transportation",
    ],
    description: "Coaches can see team readiness and event pressure.",
    landingRoute: "/coach",
    role: "coach",
  },
  {
    capabilities: [
      "review-registrations",
      "review-documents",
      "review-payments",
      "manage-organization",
    ],
    description: "Admins can review organization status and clear blockers.",
    landingRoute: "/admin",
    role: "admin",
  },
];

export const authReadiness = {
  backendProvider: "Firebase Auth",
  currentMode: "firebase-session",
  requiredClaims: [
    "role when using legacy parent, coach, or admin bootstrap access",
    "adminId for legacy admin compatibility",
    "organizationIds for bootstrap admin and coach scope",
    "teamIds for bootstrap coach scope",
    "parentId for legacy parent compatibility",
    "coachId for legacy coach compatibility",
  ],
  sessionSource:
    "Verified Firebase session, role claims, Firestore organization memberships, and assignment records",
};
