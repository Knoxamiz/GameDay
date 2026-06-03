"use client";

import Link from "next/link";
import {
  summarizeTransportationEntries,
  type TransportationEntry,
} from "../data/transportation";
import { useTransportationEntries } from "./transportationStatusState";

type TransportationSummaryCardProps = {
  eventId: string;
  entries: TransportationEntry[];
  actionHref?: string;
  actionLabel?: string;
  showDetails?: boolean;
  title?: string;
};

export default function TransportationSummaryCard({
  eventId,
  entries,
  actionHref,
  actionLabel = "View Transportation",
  showDetails = true,
  title = "Transportation",
}: TransportationSummaryCardProps) {
  const currentEntries = useTransportationEntries(eventId, entries);
  const summary = summarizeTransportationEntries(eventId, currentEntries);
  const hasRideNeed = summary.needsRide > 0;

  return (
    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Ride Share
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            hasRideNeed
              ? "bg-red-500/20 text-red-300"
              : "bg-blue-500/20 text-blue-300"
          }`}
        >
          {hasRideNeed ? "Needs Help" : "On Track"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-slate-800 p-3">
          <p className="text-slate-400">Need Ride</p>
          <p className="mt-1 text-xl font-bold text-red-300">
            {summary.needsRide}
          </p>
        </div>
        <div className="rounded-xl bg-slate-800 p-3">
          <p className="text-slate-400">Can Offer</p>
          <p className="mt-1 text-xl font-bold text-blue-300">
            {summary.canOfferRide}
          </p>
        </div>
        <div className="rounded-xl bg-slate-800 p-3">
          <p className="text-slate-400">Seats Open</p>
          <p className="mt-1 text-xl font-bold text-blue-300">
            {summary.seatsAvailable}
          </p>
        </div>
        <div className="rounded-xl bg-slate-800 p-3">
          <p className="text-slate-400">Unknown</p>
          <p className="mt-1 text-xl font-bold text-slate-300">
            {summary.unknown}
          </p>
        </div>
      </div>

      {showDetails && (
        <details className="mt-4 rounded-xl border border-slate-700 bg-slate-900 text-sm text-slate-300">
          <summary className="cursor-pointer px-4 py-3 text-center font-semibold text-white">
            {actionLabel}
          </summary>
          <div className="space-y-2 border-t border-slate-800 px-4 py-3">
            {currentEntries.length > 0 ? (
              currentEntries.map((entry) => (
                <p key={entry.id}>
                  {entry.name}: {entry.status}
                  {entry.seatsAvailable
                    ? `, ${entry.seatsAvailable} seats available`
                    : ""}
                </p>
              ))
            ) : (
              <p>No transportation updates yet.</p>
            )}
          </div>
        </details>
      )}

      {actionHref && (
        <Link
          href={actionHref}
          className="mt-4 block w-full rounded-xl border border-slate-700 bg-slate-900 py-3 text-center font-semibold text-white"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
