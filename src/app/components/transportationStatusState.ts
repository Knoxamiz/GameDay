"use client";

import { useSyncExternalStore } from "react";
import {
  summarizeTransportationEntries,
  type TransportationEntry,
  type TransportationSummary,
  transportationStatusValues,
  type TransportationStatus,
} from "../data/transportation";

export const transportationStatusChangedEvent =
  "gameday:transportation-status-changed";

const storagePrefix = "gameday.transportationStatus";

function getStorageKey(athleteId: string, eventId: string) {
  return `${storagePrefix}.${athleteId}.${eventId}`;
}

function isTransportationStatus(value: string): value is TransportationStatus {
  return transportationStatusValues.includes(value as TransportationStatus);
}

export function getSavedTransportationStatus(
  athleteId: string,
  eventId: string,
) {
  if (typeof window === "undefined") {
    return undefined;
  }

  const savedStatus = window.localStorage.getItem(
    getStorageKey(athleteId, eventId),
  );

  return savedStatus && isTransportationStatus(savedStatus)
    ? savedStatus
    : undefined;
}

export function saveTransportationStatus(
  athleteId: string,
  eventId: string,
  status: TransportationStatus,
) {
  window.localStorage.setItem(getStorageKey(athleteId, eventId), status);
  window.dispatchEvent(
    new CustomEvent(transportationStatusChangedEvent, {
      detail: {
        athleteId,
        eventId,
        status,
      },
    }),
  );
}

function isStorageKeyForEvent(storageKey: string | null, eventId?: string) {
  if (!storageKey?.startsWith(`${storagePrefix}.`)) {
    return false;
  }

  return eventId ? storageKey.endsWith(`.${eventId}`) : true;
}

function subscribeTransportationStatusChanges(
  onStoreChange: () => void,
  eventId?: string,
) {
  function handleStatusChange(event: Event) {
    const statusEvent = event as CustomEvent<{
      eventId: string;
    }>;

    if (!eventId || statusEvent.detail?.eventId === eventId) {
      onStoreChange();
    }
  }

  function handleStorageChange(event: StorageEvent) {
    if (isStorageKeyForEvent(event.key, eventId)) {
      onStoreChange();
    }
  }

  window.addEventListener(transportationStatusChangedEvent, handleStatusChange);
  window.addEventListener("storage", handleStorageChange);

  return () => {
    window.removeEventListener(
      transportationStatusChangedEvent,
      handleStatusChange,
    );
    window.removeEventListener("storage", handleStorageChange);
  };
}

function subscribeTransportationStatus(
  athleteId: string,
  eventId: string,
  onStoreChange: () => void,
) {
  function handleStatusChange(event: Event) {
    const statusEvent = event as CustomEvent<{
      athleteId: string;
      eventId: string;
    }>;

    if (
      statusEvent.detail?.athleteId === athleteId &&
      statusEvent.detail.eventId === eventId
    ) {
      onStoreChange();
    }
  }

  function handleStorageChange(event: StorageEvent) {
    if (event.key === getStorageKey(athleteId, eventId)) {
      onStoreChange();
    }
  }

  window.addEventListener(transportationStatusChangedEvent, handleStatusChange);
  window.addEventListener("storage", handleStorageChange);

  return () => {
    window.removeEventListener(
      transportationStatusChangedEvent,
      handleStatusChange,
    );
    window.removeEventListener("storage", handleStorageChange);
  };
}

function getTransportationSnapshotKey(
  entries: TransportationEntry[],
  includeSavedStatuses: boolean,
) {
  return entries
    .map((entry) => {
      const status =
        includeSavedStatuses && entry.athleteId
          ? getSavedTransportationStatus(entry.athleteId, entry.eventId) ??
            entry.status
          : entry.status;

      return `${entry.id}:${status}:${entry.seatsAvailable ?? 0}`;
    })
    .join("|");
}

function applyTransportationSnapshot(
  entries: TransportationEntry[],
  snapshotKey: string,
) {
  const statusesByEntryId = new Map<string, TransportationStatus | undefined>(
    snapshotKey.split("|").map((entrySnapshot) => {
      const [entryId = "", status = ""] = entrySnapshot.split(":");

      return [entryId, isTransportationStatus(status) ? status : undefined];
    }),
  );

  return entries.map<TransportationEntry>((entry) => ({
    ...entry,
    status: statusesByEntryId.get(entry.id) ?? entry.status,
  }));
}

export function useTransportationStatus(
  athleteId: string,
  eventId: string,
  initialStatus: TransportationStatus,
) {
  return useSyncExternalStore(
    (onStoreChange) =>
      subscribeTransportationStatus(athleteId, eventId, onStoreChange),
    () => getSavedTransportationStatus(athleteId, eventId) ?? initialStatus,
    () => initialStatus,
  );
}

export function useTransportationEntries(
  eventId: string,
  entries: TransportationEntry[],
) {
  const snapshotKey = useSyncExternalStore(
    (onStoreChange) =>
      subscribeTransportationStatusChanges(onStoreChange, eventId),
    () => getTransportationSnapshotKey(entries, true),
    () => getTransportationSnapshotKey(entries, false),
  );

  return applyTransportationSnapshot(entries, snapshotKey);
}

export function useAllTransportationEntries(entries: TransportationEntry[]) {
  const snapshotKey = useSyncExternalStore(
    (onStoreChange) => subscribeTransportationStatusChanges(onStoreChange),
    () => getTransportationSnapshotKey(entries, true),
    () => getTransportationSnapshotKey(entries, false),
  );

  return applyTransportationSnapshot(entries, snapshotKey);
}

export function useTransportationSummary(
  eventId: string,
  entries: TransportationEntry[],
): TransportationSummary {
  return summarizeTransportationEntries(
    eventId,
    useTransportationEntries(eventId, entries),
  );
}

export function useTransportationIssueCount(entries: TransportationEntry[]) {
  const snapshotKey = useSyncExternalStore(
    (onStoreChange) => subscribeTransportationStatusChanges(onStoreChange),
    () => getTransportationSnapshotKey(entries, true),
    () => getTransportationSnapshotKey(entries, false),
  );

  return new Set(
    applyTransportationSnapshot(entries, snapshotKey)
      .filter((entry) => entry.status === "Needs Ride")
      .map((entry) => entry.eventId),
  ).size;
}
