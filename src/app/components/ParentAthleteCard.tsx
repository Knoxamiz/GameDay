"use client";

import Link from "next/link";
import { type ParentNextAction } from "../data/parentDashboard";

export type ParentPlayerStatusTone = "green" | "red" | "yellow" | "gray";

export type ParentPlayerScheduleItem = {
  dateLabel: string;
  href: string;
  id: string;
  isToday: boolean;
  locationLabel: string;
  timeLabel: string;
  title: string;
};

export type ParentPlayerStatus = {
  description: string;
  label: string;
  tone: ParentPlayerStatusTone;
};

type ParentAthleteCardProps = {
  athleteId: string;
  athleteName: string;
  nextAction: ParentNextAction;
  scheduleItems: ParentPlayerScheduleItem[];
  status: ParentPlayerStatus;
  teamLabel?: string;
};

function getStatusLightClass(tone: ParentPlayerStatusTone) {
  if (tone === "green") {
    return "border-emerald-300/40 bg-emerald-400/15 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.22)]";
  }

  if (tone === "red") {
    return "border-red-300/35 bg-red-500/15 text-red-100";
  }

  if (tone === "yellow") {
    return "border-orange-300/35 bg-orange-500/15 text-orange-100";
  }

  return "border-white/10 bg-white/[0.055] text-slate-300";
}

function getStatusDotClass(tone: ParentPlayerStatusTone) {
  if (tone === "green") {
    return "bg-emerald-300";
  }

  if (tone === "red") {
    return "bg-red-500";
  }

  if (tone === "yellow") {
    return "bg-orange-400";
  }

  return "bg-slate-400";
}

export default function ParentAthleteCard({
  athleteId,
  athleteName,
  nextAction,
  scheduleItems,
  status,
  teamLabel,
}: ParentAthleteCardProps) {
  const hasAccountAlert = status.tone === "red";
  const actionHref = nextAction.href ?? `/athletes/${athleteId}`;

  return (
    <details className="gd-card-dark gd-card-interactive group overflow-hidden rounded-lg">
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 px-2.5 py-2 transition hover:bg-white/[0.04] [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block truncate text-sm font-black text-white">
            {athleteName}
          </span>
          {teamLabel && (
            <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-400">
              {teamLabel}
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span
            className={`inline-flex max-w-28 items-center gap-1.5 truncate rounded-md border px-2 py-1 text-[10px] font-black ${getStatusLightClass(
              status.tone,
            )}`}
            title={status.description}
          >
            <span
              aria-hidden="true"
              className={`h-2 w-2 shrink-0 rounded-full ${getStatusDotClass(
                status.tone,
              )}`}
            />
            {status.label}
          </span>
          <span className="text-sm font-black text-blue-200 transition group-open:rotate-90">
            &gt;
          </span>
        </span>
      </summary>

      <div className="border-t border-white/10 px-2.5 pb-2.5 pt-2">
        {hasAccountAlert && (
          <div className="mb-2.5 rounded-md border border-red-300/30 bg-red-500/10 p-2.5">
            <p className="text-sm font-black text-red-100">
              {nextAction.label}
            </p>
            <p className="mt-1 text-xs font-semibold text-red-200">
              {nextAction.description}
            </p>
            <Link
              className="mt-2 inline-flex rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-black text-white hover:bg-red-500"
              href={actionHref}
            >
              Open alert
            </Link>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-black text-white">Schedule</h3>
          <Link className="text-xs font-black text-blue-200" href="/events">
            View all
          </Link>
        </div>

        <div className="mt-2 space-y-1.5">
          {scheduleItems.length === 0 ? (
            <p className="rounded-md border border-dashed border-white/15 bg-white/[0.03] p-2.5 text-xs font-semibold text-slate-400">
              No upcoming schedule for this player.
            </p>
          ) : (
            scheduleItems.map((event) => (
              <Link
                className={`flex items-center justify-between gap-2 rounded-md border px-2.5 py-2 transition hover:border-blue-300/40 hover:bg-blue-500/10 ${
                  event.isToday
                    ? "border-emerald-300/35 bg-emerald-500/10 ring-1 ring-emerald-300/20"
                    : "border-white/10 bg-white/[0.04]"
                }`}
                href={event.href}
                key={event.id}
              >
                <span className="min-w-0">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-xs font-black text-white">
                      {event.title}
                    </span>
                    {event.isToday && (
                      <span className="shrink-0 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-black text-white shadow-sm">
                        Today
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-400">
                    {event.locationLabel}
                  </span>
                </span>
                <span className="shrink-0 text-right text-[11px] font-black text-slate-200">
                  {event.dateLabel}
                  <span className="block font-semibold text-slate-400">
                    {event.timeLabel}
                  </span>
                </span>
              </Link>
            ))
          )}
        </div>

        <Link
          className="mt-2 flex min-h-8 items-center justify-center rounded-md border border-blue-300/20 bg-blue-500/10 px-2.5 py-1.5 text-[11px] font-black text-blue-100 hover:bg-blue-500/20"
          href={`/athletes/${athleteId}`}
        >
          Player options
        </Link>
      </div>
    </details>
  );
}
