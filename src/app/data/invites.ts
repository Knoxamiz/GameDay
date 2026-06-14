import type { DocumentRequirementTemplate } from "./documents";
import { getOrganizationById } from "./organizations";
import type { PaymentRequirementTemplate } from "./payments";
import { getTeamById } from "./teams";

export type RegistrationInviteStatus =
  | "draft"
  | "open"
  | "closed"
  | "archived";

export type RegistrationInviteStoredStatus =
  | RegistrationInviteStatus
  | "Active"
  | "Paused";

export type RegistrationInvite = {
  archivedAt?: string;
  archivedByUid?: string;
  closesAt?: string;
  code?: string;
  createdAt?: string;
  createdByUid?: string;
  description?: string;
  documentRequirements: DocumentRequirementTemplate[];
  id: string;
  inviteCode: string;
  inviteUrl?: string;
  maxAthletes?: number;
  opensAt?: string;
  organizationId: string;
  paymentRequirements: PaymentRequirementTemplate[];
  qrLabel?: string;
  status: RegistrationInviteStoredStatus;
  teamId: string;
  title: string;
  updatedAt?: string;
  updatedByUid?: string;
};

export type NormalizedRegistrationInvite = Omit<
  RegistrationInvite,
  "status"
> & {
  status: RegistrationInviteStatus;
};

export type RegistrationInviteAvailabilityReason =
  | "available"
  | "archived"
  | "capacity-reached"
  | "closed"
  | "draft"
  | "expired"
  | "invalid-schedule"
  | "invalid-scope"
  | "missing"
  | "not-yet-open"
  | "service-unavailable";

export type RegistrationInviteAvailability = {
  available: boolean;
  reason: RegistrationInviteAvailabilityReason;
};

export const registrationInvites: RegistrationInvite[] = [];

export function getRegistrationInviteCode(
  invite: Pick<RegistrationInvite, "code" | "inviteCode">,
) {
  return invite.inviteCode?.trim() || invite.code?.trim() || "";
}

export function getRegistrationInviteStatus(
  invite: Pick<RegistrationInvite, "status">,
): RegistrationInviteStatus {
  if (invite.status === "Active") {
    return "open";
  }

  if (invite.status === "Paused") {
    return "closed";
  }

  return invite.status;
}

export function normalizeRegistrationInvite(
  invite: RegistrationInvite | null | undefined,
): NormalizedRegistrationInvite | undefined {
  if (!invite) {
    return undefined;
  }

  const inviteCode = getRegistrationInviteCode(invite);

  if (!inviteCode) {
    return undefined;
  }

  return {
    ...invite,
    documentRequirements: Array.isArray(invite.documentRequirements)
      ? invite.documentRequirements
      : [],
    id: invite.id || `registration-invite-${inviteCode}`,
    inviteCode,
    paymentRequirements: Array.isArray(invite.paymentRequirements)
      ? invite.paymentRequirements
      : [],
    status: getRegistrationInviteStatus(invite),
  };
}

function getOptionalTimestamp(value?: string) {
  if (!value) {
    return undefined;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function getRegistrationInviteAvailability(
  invite: RegistrationInvite | null | undefined,
  options: {
    now?: Date;
    registrationCount?: number;
    scopeIsValid?: boolean;
  } = {},
): RegistrationInviteAvailability {
  const normalizedInvite = normalizeRegistrationInvite(invite);

  if (!normalizedInvite) {
    return { available: false, reason: "missing" };
  }

  if (options.scopeIsValid === false) {
    return { available: false, reason: "invalid-scope" };
  }

  if (normalizedInvite.status !== "open") {
    return { available: false, reason: normalizedInvite.status };
  }

  const opensAt = getOptionalTimestamp(normalizedInvite.opensAt);
  const closesAt = getOptionalTimestamp(normalizedInvite.closesAt);

  if (opensAt === null || closesAt === null) {
    return { available: false, reason: "invalid-schedule" };
  }

  if (
    typeof opensAt === "number" &&
    typeof closesAt === "number" &&
    closesAt <= opensAt
  ) {
    return { available: false, reason: "invalid-schedule" };
  }

  const now = (options.now ?? new Date()).getTime();

  if (typeof opensAt === "number" && now < opensAt) {
    return { available: false, reason: "not-yet-open" };
  }

  if (typeof closesAt === "number" && now >= closesAt) {
    return { available: false, reason: "expired" };
  }

  if (
    normalizedInvite.maxAthletes &&
    (options.registrationCount ?? 0) >= normalizedInvite.maxAthletes
  ) {
    return { available: false, reason: "capacity-reached" };
  }

  return { available: true, reason: "available" };
}

export function getRegistrationInviteUnavailableMessage(
  reason: RegistrationInviteAvailabilityReason,
) {
  if (reason === "draft") {
    return "This registration invite has not opened yet.";
  }

  if (reason === "not-yet-open") {
    return "Registration is scheduled to open later.";
  }

  if (reason === "closed") {
    return "This registration invite is closed.";
  }

  if (reason === "expired") {
    return "This registration invite has expired.";
  }

  if (reason === "capacity-reached") {
    return "This registration invite has reached its athlete limit.";
  }

  if (reason === "archived") {
    return "This registration invite is no longer available.";
  }

  if (reason === "service-unavailable") {
    return "Registration is temporarily unavailable.";
  }

  if (reason === "invalid-schedule" || reason === "invalid-scope") {
    return "This registration invite is not configured correctly.";
  }

  return "This registration invite could not be found.";
}

export function getRegistrationInviteByCode(inviteCode: string) {
  return registrationInvites.find(
    (invite) => getRegistrationInviteCode(invite) === inviteCode,
  );
}

export function getOpenRegistrationInviteByCode(inviteCode: string) {
  const invite = getRegistrationInviteByCode(inviteCode);

  return getRegistrationInviteAvailability(invite).available
    ? normalizeRegistrationInvite(invite)
    : undefined;
}

export function getRegistrationInviteContext(invite: RegistrationInvite) {
  return {
    organization: getOrganizationById(invite.organizationId),
    team: getTeamById(invite.teamId),
  };
}
