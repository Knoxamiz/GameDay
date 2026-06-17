"use client";

import Link from "next/link";
import {
  type ParentNextAction,
  type ParentNextActionTone,
} from "../data/parentDashboard";

type ParentAthleteCardProps = {
  athleteId: string;
  athleteName: string;
  nextAction: ParentNextAction;
};

function getActionPillClass(tone: ParentNextActionTone) {
  if (tone === "ready") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (tone === "blocked") {
    return "bg-red-50 text-red-700";
  }

  if (tone === "attention") {
    return "bg-orange-50 text-orange-700";
  }

  return "bg-slate-100 text-slate-600";
}

function getActionLabel(action: ParentNextAction) {
  if (action.tone === "ready") {
    return "Ready";
  }

  if (action.tone === "waiting") {
    return "Waiting";
  }

  return action.label;
}

export default function ParentAthleteCard({
  athleteId,
  athleteName,
  nextAction,
}: ParentAthleteCardProps) {
  return (
    <Link
      className="flex min-h-14 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
      href={`/athletes/${athleteId}`}
    >
      <span className="min-w-0">
        <span className="block truncate text-lg font-black">{athleteName}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <span
          className={`max-w-32 truncate rounded-full px-2.5 py-1 text-xs font-black ${getActionPillClass(
            nextAction.tone,
          )}`}
          title={nextAction.label}
        >
          {getActionLabel(nextAction)}
        </span>
        <span className="text-lg font-black text-blue-700">›</span>
      </span>
    </Link>
  );
}
