"use client";

import { useSyncExternalStore } from "react";
import {
  attendanceStatusValues,
  summarizeAttendanceEntries,
  type AttendanceEntry,
  type AttendanceStatus,
  type AttendanceSummary,
} from "../data/attendance";

export const attendanceStatusChangedEvent =
  "gameday:attendance-status-changed";

const storagePrefix = "gameday.attendanceStatus";

function getStorageKey(athleteId: string, eventId: string) {
  return `${storagePrefix}.${athleteId}.${eventId}`;
}

function isAttendanceStatus(value: string): value is AttendanceStatus {
  return attendanceStatusValues.includes(value as AttendanceStatus);
}

export function getSavedAttendanceStatus(athleteId: string, eventId: string) {
  if (typeof window === "undefined") {
    return undefined;
  }

  const savedStatus = window.localStorage.getItem(
    getStorageKey(athleteId, eventId),
  );

  return savedStatus && isAttendanceStatus(savedStatus)
    ? savedStatus
    : undefined;
}

export function saveAttendanceStatus(
  athleteId: string,
  eventId: string,
  status: AttendanceStatus,
) {
  window.localStorage.setItem(getStorageKey(athleteId, eventId), status);
  window.dispatchEvent(
    new CustomEvent(attendanceStatusChangedEvent, {
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

function subscribeAttendanceStatusChanges(
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

  window.addEventListener(attendanceStatusChangedEvent, handleStatusChange);
  window.addEventListener("storage", handleStorageChange);

  return () => {
    window.removeEventListener(attendanceStatusChangedEvent, handleStatusChange);
    window.removeEventListener("storage", handleStorageChange);
  };
}

function subscribeAttendanceStatus(
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

  window.addEventListener(attendanceStatusChangedEvent, handleStatusChange);
  window.addEventListener("storage", handleStorageChange);

  return () => {
    window.removeEventListener(attendanceStatusChangedEvent, handleStatusChange);
    window.removeEventListener("storage", handleStorageChange);
  };
}

function getAttendanceSnapshotKey(
  entries: AttendanceEntry[],
  includeSavedStatuses: boolean,
) {
  return entries
    .map((entry) => {
      const status =
        includeSavedStatuses && entry.athleteId
          ? getSavedAttendanceStatus(entry.athleteId, entry.eventId) ??
            entry.status
          : entry.status;

      return `${entry.id}:${status}:${entry.count ?? 1}`;
    })
    .join("|");
}

function applyAttendanceSnapshot(
  entries: AttendanceEntry[],
  snapshotKey: string,
) {
  const statusesByEntryId = new Map<string, AttendanceStatus | undefined>(
    snapshotKey.split("|").map((entrySnapshot) => {
      const [entryId = "", status = ""] = entrySnapshot.split(":");

      return [entryId, isAttendanceStatus(status) ? status : undefined];
    }),
  );

  return entries.map<AttendanceEntry>((entry) => ({
    ...entry,
    status: statusesByEntryId.get(entry.id) ?? entry.status,
  }));
}

export function useAttendanceStatus(
  athleteId: string,
  eventId: string,
  initialStatus: AttendanceStatus,
) {
  return useSyncExternalStore(
    (onStoreChange) =>
      subscribeAttendanceStatus(athleteId, eventId, onStoreChange),
    () => getSavedAttendanceStatus(athleteId, eventId) ?? initialStatus,
    () => initialStatus,
  );
}

export function useAttendanceEntries(
  eventId: string,
  entries: AttendanceEntry[],
) {
  const snapshotKey = useSyncExternalStore(
    (onStoreChange) =>
      subscribeAttendanceStatusChanges(onStoreChange, eventId),
    () => getAttendanceSnapshotKey(entries, true),
    () => getAttendanceSnapshotKey(entries, false),
  );

  return applyAttendanceSnapshot(entries, snapshotKey);
}

export function useAttendanceSummary(
  eventId: string,
  entries: AttendanceEntry[],
): AttendanceSummary {
  return summarizeAttendanceEntries(
    eventId,
    useAttendanceEntries(eventId, entries),
  );
}

export function useAttendanceConcernCount(entries: AttendanceEntry[]) {
  const snapshotKey = useSyncExternalStore(
    (onStoreChange) => subscribeAttendanceStatusChanges(onStoreChange),
    () => getAttendanceSnapshotKey(entries, true),
    () => getAttendanceSnapshotKey(entries, false),
  );

  return new Set(
    applyAttendanceSnapshot(entries, snapshotKey)
      .filter(
        (entry) =>
          entry.status === "Unknown" || entry.status === "Not Attending",
      )
      .map((entry) => entry.eventId),
  ).size;
}
