"use client";

import {
  summarizeTransportationEntries,
  type TransportationEntry,
  type TransportationStatus,
  type TransportationSummary,
} from "../data/transportation";

export function useTransportationStatus(
  _athleteId: string,
  _eventId: string,
  initialStatus: TransportationStatus,
) {
  return initialStatus;
}

export function useTransportationEntries(
  _eventId: string,
  entries: TransportationEntry[],
) {
  return entries;
}

export function useAllTransportationEntries(entries: TransportationEntry[]) {
  return entries;
}

export function useTransportationSummary(
  eventId: string,
  entries: TransportationEntry[],
): TransportationSummary {
  return summarizeTransportationEntries(eventId, entries);
}

export function useTransportationIssueCount(entries: TransportationEntry[]) {
  return new Set(
    entries
      .filter((entry) => entry.status === "Needs Ride")
      .map((entry) => entry.eventId),
  ).size;
}
