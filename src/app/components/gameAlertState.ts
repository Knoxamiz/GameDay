"use client";

import { useSyncExternalStore } from "react";
import type { GameAlertStatus } from "../data/gameAlerts";

export type GameAlertSnapshot = {
  status: GameAlertStatus;
  homeScore: number;
  awayScore: number;
};

export const gameAlertChangedEvent = "gameday:game-alert-changed";

const storagePrefix = "gameday.gameAlert";
const gameAlertStatuses: GameAlertStatus[] = ["Scheduled", "Live", "Final"];

function getStorageKey(eventId: string) {
  return `${storagePrefix}.${eventId}`;
}

function isGameAlertStatus(value: unknown): value is GameAlertStatus {
  return (
    typeof value === "string" &&
    gameAlertStatuses.includes(value as GameAlertStatus)
  );
}

function isGameAlertSnapshot(value: unknown): value is GameAlertSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }

  const snapshot = value as Partial<GameAlertSnapshot>;

  return (
    isGameAlertStatus(snapshot.status) &&
    typeof snapshot.homeScore === "number" &&
    typeof snapshot.awayScore === "number"
  );
}

function getSavedGameAlertSnapshot(eventId: string) {
  if (typeof window === "undefined") {
    return undefined;
  }

  const savedSnapshot = window.localStorage.getItem(getStorageKey(eventId));

  if (!savedSnapshot) {
    return undefined;
  }

  try {
    const parsedSnapshot = JSON.parse(savedSnapshot);

    return isGameAlertSnapshot(parsedSnapshot) ? parsedSnapshot : undefined;
  } catch {
    return undefined;
  }
}

export function saveGameAlertSnapshot(
  eventId: string,
  snapshot: GameAlertSnapshot,
) {
  window.localStorage.setItem(
    getStorageKey(eventId),
    JSON.stringify(snapshot),
  );
  window.dispatchEvent(
    new CustomEvent(gameAlertChangedEvent, {
      detail: {
        eventId,
      },
    }),
  );
}

function subscribeGameAlert(eventId: string, onStoreChange: () => void) {
  function handleGameAlertChange(event: Event) {
    const gameAlertEvent = event as CustomEvent<{
      eventId: string;
    }>;

    if (gameAlertEvent.detail?.eventId === eventId) {
      onStoreChange();
    }
  }

  function handleStorageChange(event: StorageEvent) {
    if (event.key === getStorageKey(eventId)) {
      onStoreChange();
    }
  }

  window.addEventListener(gameAlertChangedEvent, handleGameAlertChange);
  window.addEventListener("storage", handleStorageChange);

  return () => {
    window.removeEventListener(gameAlertChangedEvent, handleGameAlertChange);
    window.removeEventListener("storage", handleStorageChange);
  };
}

export function useGameAlertSnapshot(
  eventId: string,
  initialSnapshot: GameAlertSnapshot,
) {
  return useSyncExternalStore(
    (onStoreChange) => subscribeGameAlert(eventId, onStoreChange),
    () => getSavedGameAlertSnapshot(eventId) ?? initialSnapshot,
    () => initialSnapshot,
  );
}
