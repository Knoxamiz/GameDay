"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TransportationStatus } from "../data/transportation";
import {
  getSavedTransportationStatus,
  transportationStatusChangedEvent,
} from "./transportationStatusState";

type ParentAthleteCardProps = {
  athleteId: string;
  athleteName: string;
  teamName?: string;
  nextEvent?: {
    id: string;
    title: string;
    date: string;
    time: string;
    location: string;
    directionsUrl: string;
  };
  initialTransportationStatus: TransportationStatus;
  missingRegistrationCount: number;
};

export default function ParentAthleteCard({
  athleteId,
  athleteName,
  teamName,
  nextEvent,
  initialTransportationStatus,
  missingRegistrationCount,
}: ParentAthleteCardProps) {
  const nextEventId = nextEvent?.id;
  const [transportationStatus, setTransportationStatus] =
    useState<TransportationStatus>(() =>
      nextEventId
        ? getSavedTransportationStatus(athleteId, nextEventId) ??
          initialTransportationStatus
        : initialTransportationStatus,
    );
  const hasTransportationReady = transportationStatus !== "Unknown";
  const isReady =
    Boolean(nextEvent) &&
    hasTransportationReady &&
    missingRegistrationCount === 0;

  useEffect(() => {
    if (!nextEventId) {
      return;
    }

    function handleStatusChange(event: Event) {
      const statusEvent = event as CustomEvent<{
        athleteId: string;
        eventId: string;
        status: TransportationStatus;
      }>;

      if (
        statusEvent.detail?.athleteId === athleteId &&
        statusEvent.detail.eventId === nextEventId
      ) {
        setTransportationStatus(statusEvent.detail.status);
      }
    }

    window.addEventListener(
      transportationStatusChangedEvent,
      handleStatusChange,
    );

    return () => {
      window.removeEventListener(
        transportationStatusChangedEvent,
        handleStatusChange,
      );
    };
  }, [athleteId, nextEventId]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xl font-bold">{athleteName}</h3>
        {nextEvent && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              isReady
                ? "bg-blue-500/20 text-blue-300"
                : "bg-red-500/20 text-red-300"
            }`}
          >
            {isReady ? "Ready" : "Action Needed"}
          </span>
        )}
      </div>

      {nextEvent ? (
        <p className="mt-1 text-sm text-slate-400">{teamName}</p>
      ) : (
        <p className="mt-1 text-sm text-slate-400">No Upcoming Events</p>
      )}

      {nextEvent && (
        <div className="mt-4 rounded-xl bg-slate-800 p-4">
          <p className="font-semibold">{nextEvent.title}</p>
          {nextEvent.date && (
            <p className="mt-2 text-sm text-slate-300">{nextEvent.date}</p>
          )}
          {nextEvent.time && (
            <p className="mt-2 text-sm text-slate-300">{nextEvent.time}</p>
          )}
          {nextEvent.location && (
            <p className="mt-1 text-sm text-slate-300">{nextEvent.location}</p>
          )}
          <div className="mt-4 space-y-2 border-t border-slate-700 pt-4 text-sm">
            <p className="flex justify-between gap-3 text-slate-300">
              <span className="text-slate-400">Transportation</span>
              <span
                className={
                  hasTransportationReady
                    ? "font-semibold text-blue-300"
                    : "font-semibold text-red-300"
                }
              >
                {transportationStatus}
              </span>
            </p>
            <p className="flex justify-between gap-3 text-slate-300">
              <span className="text-slate-400">Registration</span>
              <span
                className={
                  missingRegistrationCount === 0
                    ? "font-semibold text-blue-300"
                    : "font-semibold text-red-300"
                }
              >
                {missingRegistrationCount === 0
                  ? "Ready"
                  : `${missingRegistrationCount} Missing`}
              </span>
            </p>
          </div>
        </div>
      )}

      <div
        className={`mt-4 grid gap-3 ${
          nextEvent?.directionsUrl ? "grid-cols-2" : "grid-cols-1"
        }`}
      >
        {nextEvent?.directionsUrl && (
          <a
            href={nextEvent.directionsUrl}
            target="_blank"
            rel="noreferrer"
            className="block rounded-xl border border-slate-700 bg-slate-900 py-3 text-center font-semibold text-white"
          >
            Directions
          </a>
        )}
        <Link
          href={`/athletes/${athleteId}`}
          className="block rounded-xl bg-blue-500 py-3 text-center font-semibold text-white"
        >
          View Details
        </Link>
      </div>
    </div>
  );
}
