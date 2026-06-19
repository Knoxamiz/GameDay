"use client";

import Link from "next/link";
import {
  summarizeAttendanceEntries,
  type AttendanceEntry,
} from "../data/attendance";
import { useAttendanceEntries } from "./attendanceStatusState";

type AttendanceSummaryCardProps = {
  eventId: string;
  entries: AttendanceEntry[];
  actionHref?: string;
  actionLabel?: string;
  showDetails?: boolean;
  title?: string;
};

export default function AttendanceSummaryCard({
  eventId,
  entries,
  actionHref,
  actionLabel = "View Players",
  showDetails = true,
  title = "Attendance",
}: AttendanceSummaryCardProps) {
  const currentEntries = useAttendanceEntries(eventId, entries);
  const summary = summarizeAttendanceEntries(eventId, currentEntries);
  const hasConcern = summary.unknown > 0 || summary.notAttending > 0;

  return (
    <div className="gd-card-dark mt-3 rounded-lg p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black">{title}</h2>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Event Readiness
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            hasConcern
              ? "bg-red-500/20 text-red-300"
              : "bg-blue-500/20 text-blue-300"
          }`}
        >
          {hasConcern ? "Needs Review" : "Ready"}
        </span>
      </div>

      <p className="mt-2 text-xs text-slate-300">
        {summary.totalPlayers} Players
      </p>

      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-md bg-white/[0.06] p-2.5">
          <p className="text-slate-400">Attending</p>
          <p className="mt-1 text-lg font-black text-blue-300">
            {summary.attending}
          </p>
        </div>
        <div className="rounded-md bg-white/[0.06] p-2.5">
          <p className="text-slate-400">Unknown</p>
          <p className="mt-1 text-lg font-black text-slate-300">
            {summary.unknown}
          </p>
        </div>
        <div className="rounded-md bg-white/[0.06] p-2.5">
          <p className="text-slate-400">Out</p>
          <p className="mt-1 text-lg font-black text-red-300">
            {summary.notAttending}
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
                  {entry.count && entry.count > 1 ? ` (${entry.count})` : ""}
                </p>
              ))
            ) : (
              <p>No attendance responses yet.</p>
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
