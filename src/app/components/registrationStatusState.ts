"use client";

import {
  summarizeRegistrations,
  type Registration,
  type RegistrationStatus,
} from "../data/registrations";

export function useRegistrationStatus(
  _registrationId: string,
  initialStatus: RegistrationStatus,
) {
  return initialStatus;
}

export function useRegistrations(registrations: Registration[]) {
  return registrations;
}

export function useRegistrationSummary(registrations: Registration[]) {
  return summarizeRegistrations(registrations);
}

export function useRegistrationConcernCount(registrations: Registration[]) {
  return useRegistrationSummary(registrations).concernCount;
}
