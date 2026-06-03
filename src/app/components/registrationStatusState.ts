"use client";

import { useSyncExternalStore } from "react";
import {
  registrationStatusValues,
  summarizeRegistrations,
  type Registration,
  type RegistrationStatus,
  type RegistrationSummary,
} from "../data/registrations";

export const registrationStatusChangedEvent =
  "gameday:registration-status-changed";

const storagePrefix = "gameday.registrationStatus";

function getStorageKey(registrationId: string) {
  return `${storagePrefix}.${registrationId}`;
}

function isRegistrationStatus(value: string): value is RegistrationStatus {
  return registrationStatusValues.includes(value as RegistrationStatus);
}

export function getSavedRegistrationStatus(registrationId: string) {
  if (typeof window === "undefined") {
    return undefined;
  }

  const savedStatus = window.localStorage.getItem(getStorageKey(registrationId));

  return savedStatus && isRegistrationStatus(savedStatus)
    ? savedStatus
    : undefined;
}

export function saveRegistrationStatus(
  registrationId: string,
  status: RegistrationStatus,
) {
  window.localStorage.setItem(getStorageKey(registrationId), status);
  window.dispatchEvent(
    new CustomEvent(registrationStatusChangedEvent, {
      detail: {
        registrationId,
        status,
      },
    }),
  );
}

function subscribeRegistrationStatusChanges(onStoreChange: () => void) {
  function handleStatusChange() {
    onStoreChange();
  }

  function handleStorageChange(event: StorageEvent) {
    if (event.key?.startsWith(`${storagePrefix}.`)) {
      onStoreChange();
    }
  }

  window.addEventListener(registrationStatusChangedEvent, handleStatusChange);
  window.addEventListener("storage", handleStorageChange);

  return () => {
    window.removeEventListener(
      registrationStatusChangedEvent,
      handleStatusChange,
    );
    window.removeEventListener("storage", handleStorageChange);
  };
}

function subscribeRegistrationStatus(
  registrationId: string,
  onStoreChange: () => void,
) {
  function handleStatusChange(event: Event) {
    const statusEvent = event as CustomEvent<{
      registrationId: string;
    }>;

    if (statusEvent.detail?.registrationId === registrationId) {
      onStoreChange();
    }
  }

  function handleStorageChange(event: StorageEvent) {
    if (event.key === getStorageKey(registrationId)) {
      onStoreChange();
    }
  }

  window.addEventListener(registrationStatusChangedEvent, handleStatusChange);
  window.addEventListener("storage", handleStorageChange);

  return () => {
    window.removeEventListener(
      registrationStatusChangedEvent,
      handleStatusChange,
    );
    window.removeEventListener("storage", handleStorageChange);
  };
}

function getRegistrationSnapshotKey(
  registrations: Registration[],
  includeSavedStatuses: boolean,
) {
  return registrations
    .map((registration) => {
      const status = includeSavedStatuses
        ? getSavedRegistrationStatus(registration.id) ?? registration.status
        : registration.status;

      return `${registration.id}:${status}`;
    })
    .join("|");
}

function applyRegistrationSnapshot(
  registrations: Registration[],
  snapshotKey: string,
) {
  const statusesByRegistrationId = new Map<
    string,
    RegistrationStatus | undefined
  >(
    snapshotKey.split("|").map((registrationSnapshot) => {
      const [registrationId = "", status = ""] =
        registrationSnapshot.split(":");

      return [
        registrationId,
        isRegistrationStatus(status) ? status : undefined,
      ];
    }),
  );

  return registrations.map<Registration>((registration) => ({
    ...registration,
    status:
      statusesByRegistrationId.get(registration.id) ?? registration.status,
  }));
}

export function useRegistrationStatus(
  registrationId: string,
  initialStatus: RegistrationStatus,
) {
  return useSyncExternalStore(
    (onStoreChange) =>
      subscribeRegistrationStatus(registrationId, onStoreChange),
    () => getSavedRegistrationStatus(registrationId) ?? initialStatus,
    () => initialStatus,
  );
}

export function useRegistrations(registrations: Registration[]) {
  const snapshotKey = useSyncExternalStore(
    subscribeRegistrationStatusChanges,
    () => getRegistrationSnapshotKey(registrations, true),
    () => getRegistrationSnapshotKey(registrations, false),
  );

  return applyRegistrationSnapshot(registrations, snapshotKey);
}

export function useRegistrationSummary(
  registrations: Registration[],
): RegistrationSummary {
  return summarizeRegistrations(useRegistrations(registrations));
}

export function useRegistrationConcernCount(registrations: Registration[]) {
  return useRegistrationSummary(registrations).concernCount;
}
