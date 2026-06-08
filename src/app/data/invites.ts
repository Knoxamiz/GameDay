import {
  documentRequirementTemplates,
  type DocumentRequirementTemplate,
} from "./documents";
import { getOrganizationById } from "./organizations";
import {
  paymentRequirementTemplates,
  type PaymentRequirementTemplate,
} from "./payments";
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

export const registrationInvites: RegistrationInvite[] = [
  {
    code: "black-diamonds-12u",
    description:
      "Use this invite for parents joining the Black Diamonds 12U registration path.",
    documentRequirements: documentRequirementTemplates,
    id: "invite-black-diamonds-12u",
    inviteUrl: "/join/black-diamonds-12u",
    organizationId: "black-diamonds",
    paymentRequirements: paymentRequirementTemplates,
    qrLabel: "Black Diamonds 12U QR Invite",
    status: "Active",
    teamId: "black-diamonds-12u",
    title: "Join Black Diamonds 12U",
  },
  {
    code: "black-diamonds-10u",
    description:
      "Use this invite for parents joining the Black Diamonds 10U registration path.",
    documentRequirements: documentRequirementTemplates,
    id: "invite-black-diamonds-10u",
    inviteUrl: "/join/black-diamonds-10u",
    organizationId: "black-diamonds",
    paymentRequirements: paymentRequirementTemplates,
    qrLabel: "Black Diamonds 10U QR Invite",
    status: "Active",
    teamId: "black-diamonds-10u",
    title: "Join Black Diamonds 10U",
  },
];

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
