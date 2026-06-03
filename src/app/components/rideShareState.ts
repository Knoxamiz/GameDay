"use client";

import { useSyncExternalStore } from "react";
import {
  rideShareMatchStatusValues,
  type RideShareMatchStatus,
} from "../data/rideShare";

export const rideShareStatusChangedEvent =
  "gameday:ride-share-status-changed";

const storagePrefix = "gameday.rideShareStatus";

function getStorageKey(matchId: string) {
  return `${storagePrefix}.${matchId}`;
}

function isRideShareMatchStatus(
  value: string,
): value is RideShareMatchStatus {
  return rideShareMatchStatusValues.includes(value as RideShareMatchStatus);
}

export function getSavedRideShareStatus(matchId: string) {
  if (typeof window === "undefined") {
    return undefined;
  }

  const savedStatus = window.localStorage.getItem(getStorageKey(matchId));

  return savedStatus && isRideShareMatchStatus(savedStatus)
    ? savedStatus
    : undefined;
}

export function saveRideShareStatus(
  eventId: string,
  matchId: string,
  status: RideShareMatchStatus,
) {
  window.localStorage.setItem(getStorageKey(matchId), status);
  window.dispatchEvent(
    new CustomEvent(rideShareStatusChangedEvent, {
      detail: {
        eventId,
        matchId,
        status,
      },
    }),
  );
}

function subscribeRideShareStatus(
  eventId: string,
  matchId: string,
  onStoreChange: () => void,
) {
  function handleStatusChange(event: Event) {
    const statusEvent = event as CustomEvent<{
      eventId: string;
      matchId: string;
    }>;

    if (
      statusEvent.detail?.eventId === eventId &&
      statusEvent.detail.matchId === matchId
    ) {
      onStoreChange();
    }
  }

  function handleStorageChange(event: StorageEvent) {
    if (event.key === getStorageKey(matchId)) {
      onStoreChange();
    }
  }

  window.addEventListener(rideShareStatusChangedEvent, handleStatusChange);
  window.addEventListener("storage", handleStorageChange);

  return () => {
    window.removeEventListener(rideShareStatusChangedEvent, handleStatusChange);
    window.removeEventListener("storage", handleStorageChange);
  };
}

export function useRideShareStatus(
  eventId: string,
  matchId: string,
  initialStatus: RideShareMatchStatus,
) {
  return useSyncExternalStore(
    (onStoreChange) =>
      subscribeRideShareStatus(eventId, matchId, onStoreChange),
    () => getSavedRideShareStatus(matchId) ?? initialStatus,
    () => initialStatus,
  );
}
