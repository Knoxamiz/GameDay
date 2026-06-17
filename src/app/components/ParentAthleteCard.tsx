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
};

function getStatusLightClass(tone: ParentPlayerStatusTone) {
  if (tone === "green") {
    return "bg-emerald-50 text-emerald-700";
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
    return "bg-emerald-500";
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
}: ParentAthleteCardProps) {
  const hasAccountAlert = status.tone === "red";
  const actionHref = nextAction.href ?? `/athletes/${athleteId}`;

  return (
    <details className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 transition hover:bg-blue-50 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block truncate text-lg font-black">
            {athleteName}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span
            className={`inline-flex max-w-36 items-center gap-1.5 truncate rounded-full px-2.5 py-1 text-xs font-black ${getStatusLightClass(
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
          <span className="text-lg font-black text-blue-700 transition group-open:rotate-90">
            &gt;
          </span>
        </span>
      </summary>

      <div className="border-t border-slate-200 px-4 pb-4 pt-3">
        {hasAccountAlert && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3">
            <p className="text-sm font-black text-red-800">
              {nextAction.label}
            </p>
            <p className="mt-1 text-xs font-semibold text-red-700">
              {nextAction.description}
            </p>
            <Link
              className="mt-3 inline-flex rounded-md bg-red-600 px-3 py-2 text-xs font-black text-white hover:bg-red-700"
              href={actionHref}
            >
              Open alert
            </Link>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-black">Schedule</h3>
          <Link className="text-sm font-black text-blue-700" href="/events">
            View all
          </Link>
        </div>

        <div className="mt-3 space-y-2">
          {scheduleItems.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-sm font-semibold text-slate-500">
              No upcoming schedule for this player.
            </p>
          ) : (
            scheduleItems.map((event) => (
              <Link
                className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 transition hover:border-blue-200 hover:bg-blue-50 ${
                  event.isToday
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-white"
                }`}
                href={event.href}
                key={event.id}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black">
                    {event.title}
                  </span>
                  <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">
                    {event.locationLabel}
                  </span>
                </span>
                <span className="shrink-0 text-right text-xs font-black text-slate-700">
                  {event.dateLabel}
                  <span className="block font-semibold">{event.timeLabel}</span>
                </span>
              </Link>
            ))
          )}
        </div>

        <Link
          className="mt-3 flex min-h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
          href={`/athletes/${athleteId}`}
        >
          Player options
        </Link>
      </div>
    </details>
  );
}
