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
    return "bg-emerald-600 text-white shadow-sm shadow-emerald-200 ring-1 ring-emerald-700/10";
  }

  if (tone === "red") {
    return "bg-red-50 text-red-700";
  }

  if (tone === "yellow") {
    return "bg-orange-50 text-orange-700";
  }

  return "bg-slate-100 text-slate-600";
}

function getStatusDotClass(tone: ParentPlayerStatusTone) {
  if (tone === "green") {
    return "bg-white";
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
    <details className="gd-card-light gd-card-interactive group overflow-hidden rounded-lg">
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 px-2.5 py-2 transition hover:bg-blue-50 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block truncate text-sm font-black">
            {athleteName}
          </span>
          {teamLabel && (
            <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-500">
              {teamLabel}
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span
            className={`inline-flex max-w-28 items-center gap-1.5 truncate rounded-md px-2 py-1 text-[10px] font-black ${getStatusLightClass(
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
          <span className="text-sm font-black text-blue-700 transition group-open:rotate-90">
            &gt;
          </span>
        </span>
      </summary>

      <div className="border-t border-slate-200 px-2.5 pb-2.5 pt-2">
        {hasAccountAlert && (
          <div className="mb-2.5 rounded-md border border-red-200 bg-red-50 p-2.5">
            <p className="text-sm font-black text-red-800">
              {nextAction.label}
            </p>
            <p className="mt-1 text-xs font-semibold text-red-700">
              {nextAction.description}
            </p>
            <Link
              className="mt-2 inline-flex rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-black text-white hover:bg-red-700"
              href={actionHref}
            >
              Open alert
            </Link>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-black">Schedule</h3>
          <Link className="text-xs font-black text-blue-700" href="/events">
            View all
          </Link>
        </div>

        <div className="mt-2 space-y-1.5">
          {scheduleItems.length === 0 ? (
            <p className="rounded-md border border-dashed border-blue-200/70 bg-white/70 p-2.5 text-xs font-semibold text-slate-500">
              No upcoming schedule for this player.
            </p>
          ) : (
            scheduleItems.map((event) => (
              <Link
                className={`flex items-center justify-between gap-2 rounded-md border px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] transition hover:border-blue-300 hover:bg-blue-50 ${
                  event.isToday
                    ? "border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200"
                    : "border-slate-200 bg-white"
                }`}
                href={event.href}
                key={event.id}
              >
                <span className="min-w-0">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-xs font-black">
                      {event.title}
                    </span>
                    {event.isToday && (
                      <span className="shrink-0 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-black text-white shadow-sm">
                        Today
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-500">
                    {event.locationLabel}
                  </span>
                </span>
                <span className="shrink-0 text-right text-[11px] font-black text-slate-700">
                  {event.dateLabel}
                  <span className="block font-semibold">{event.timeLabel}</span>
                </span>
              </Link>
            ))
          )}
        </div>

        <Link
          className="mt-2 flex min-h-8 items-center justify-center rounded-md border border-blue-100 bg-white/80 px-2.5 py-1.5 text-[11px] font-black text-slate-700 hover:bg-blue-50"
          href={`/athletes/${athleteId}`}
        >
          Player options
        </Link>
      </div>
    </details>
  );
}
