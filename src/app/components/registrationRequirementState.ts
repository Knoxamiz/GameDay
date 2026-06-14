"use client";

import type { RegistrationRequirement } from "../data/registrations";

export function useRegistrationRequirements(
  _registrationId: string,
  requirements: RegistrationRequirement[],
) {
  return requirements;
}
