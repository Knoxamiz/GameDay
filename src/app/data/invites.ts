import type { DocumentRequirementTemplate } from "./documents";
import { getOrganizationById } from "./organizations";
import type { PaymentRequirementTemplate } from "./payments";
import { getTeamById } from "./teams";

export type RegistrationInviteStatus = "Active" | "Paused";

export type RegistrationInvite = {
  code: string;
  description: string;
  documentRequirements: DocumentRequirementTemplate[];
  id: string;
  inviteUrl: string;
  organizationId: string;
  paymentRequirements: PaymentRequirementTemplate[];
  qrLabel: string;
  status: RegistrationInviteStatus;
  teamId: string;
  title: string;
};

export const registrationInvites: RegistrationInvite[] = [];

export function getRegistrationInviteByCode(inviteCode: string) {
  return registrationInvites.find((invite) => invite.code === inviteCode);
}

export function getActiveRegistrationInviteByCode(inviteCode: string) {
  const invite = getRegistrationInviteByCode(inviteCode);

  return invite?.status === "Active" ? invite : undefined;
}

export function getRegistrationInviteContext(invite: RegistrationInvite) {
  return {
    organization: getOrganizationById(invite.organizationId),
    team: getTeamById(invite.teamId),
  };
}
