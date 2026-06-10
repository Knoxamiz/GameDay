import type { DocumentRequirement } from "./documents";
import type { PaymentRequirement } from "./payments";
import type { Registration, RegistrationRequirement } from "./registrations";

export function getDocumentRequirementsFromRegistrationRequirements(
  registration: Pick<
    Registration,
    "athleteId" | "id" | "organizationId" | "parentId" | "teamId"
  >,
  requirements: RegistrationRequirement[],
): DocumentRequirement[] {
  return requirements.map((requirement) => ({
    athleteId: registration.athleteId,
    description: requirement.description ?? "",
    id: `${registration.id}-${requirement.label.toLowerCase().replaceAll(" ", "-")}`,
    label: requirement.label,
    organizationId: registration.organizationId,
    parentId: registration.parentId,
    registrationId: registration.id,
    required: requirement.required ?? true,
    status: requirement.status,
    teamId: registration.teamId,
  }));
}

export function getDocumentRequirementsFromRegistrations(
  registrations: Registration[],
): DocumentRequirement[] {
  return registrations.flatMap((registration) =>
    getDocumentRequirementsFromRegistrationRequirements(
      registration,
      registration.requirements,
    ),
  );
}

export function getPaymentRequirementsFromRegistrations(
  registrations: Registration[],
): PaymentRequirement[] {
  return registrations.flatMap(
    (registration) => registration.paymentRequirements ?? [],
  );
}
