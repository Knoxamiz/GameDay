"use client";

import { useSyncExternalStore } from "react";
import {
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
