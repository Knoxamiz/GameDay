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
    <div className="gd-card-dark mt-3 rounded-lg p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black">{title}</h2>
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

      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md bg-white/[0.06] p-2.5">
          <p className="text-slate-400">Need Ride</p>
          <p className="mt-1 text-lg font-black text-red-300">
            {summary.needsRide}
          </p>
        </div>
        <div className="rounded-md bg-white/[0.06] p-2.5">
          <p className="text-slate-400">Can Offer</p>
          <p className="mt-1 text-lg font-black text-blue-300">
            {summary.canOfferRide}
          </p>
        </div>
        <div className="rounded-md bg-white/[0.06] p-2.5">
          <p className="text-slate-400">Seats Open</p>
          <p className="mt-1 text-lg font-black text-blue-300">
            {summary.seatsAvailable}
          </p>
        </div>
        <div className="rounded-md bg-white/[0.06] p-2.5">
          <p className="text-slate-400">Unknown</p>
          <p className="mt-1 text-lg font-black text-slate-300">
            {summary.unknown}
          </p>
        </div>
      </div>

      {showDetails && (
        <details className="mt-2 rounded-md border border-white/10 bg-white/[0.04] text-xs text-slate-300">
          <summary className="cursor-pointer px-3 py-2 text-center font-black text-white">
            {actionLabel}
          </summary>
          <div className="space-y-2 border-t border-white/10 px-3 py-2">
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
          className="mt-2 block w-full rounded-md border border-white/15 bg-white/5 py-2 text-center text-xs font-black text-white"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
