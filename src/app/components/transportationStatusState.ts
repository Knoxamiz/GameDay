"use client";

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
