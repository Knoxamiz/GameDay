"use client";

import Link from "next/link";
import type { GameDayEventStatus } from "../data/events";
import {
  getParentRegistrationStatusLabel,
  getParentRosterStatusLabel,
  type ParentNextAction,
  type ParentNextActionTone,
} from "../data/parentDashboard";
import type {
  RegistrationStatus,
  RosterStatus,
} from "../data/registrations";

type ParentAthleteCardProps = {
  athleteId: string;
  athleteName: string;
  nextAction: ParentNextAction;
  nextEvent?: {
    date: string;
    id: string;
    location: string;
    status: GameDayEventStatus;
    time: string;
    title: string;
  };
  organizationName?: string;
  registrationStatus: RegistrationStatus;
  rosterStatus: RosterStatus;
  teamDetail?: string;
  teamName?: string;
};

function getActionToneClass(tone: ParentNextActionTone) {
  if (tone === "ready") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (tone === "blocked") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (tone === "attention") {
    return "border-orange-200 bg-orange-50 text-orange-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

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

function getScheduleLine(nextEvent?: ParentAthleteCardProps["nextEvent"]) {
  if (!nextEvent) {
    return "No upcoming schedule yet.";
  }

  return [nextEvent.title, nextEvent.date, nextEvent.time]
    .filter(Boolean)
    .join(" - ");
}

export default function ParentAthleteCard({
  athleteId,
  athleteName,
  nextAction,
  nextEvent,
  organizationName,
  registrationStatus,
  rosterStatus,
  teamDetail,
  teamName,
}: ParentAthleteCardProps) {
  const athleteHref = `/athletes/${athleteId}`;
  const teamLine =
    [organizationName, teamName].filter(Boolean).join(" / ") || "Team pending";

  return (
    <Link
      className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
      href={athleteHref}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-2xl font-black">{athleteName}</h3>
          <p className="mt-1 truncate text-sm font-semibold text-slate-500">
            {teamLine}
          </p>
          {teamDetail && (
            <p className="mt-1 text-xs font-bold uppercase text-slate-400">
              {teamDetail}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${getActionPillClass(
            nextAction.tone,
          )}`}
        >
          {nextAction.label}
        </span>
      </div>

      <div
        className={`mt-4 rounded-lg border p-3 ${getActionToneClass(
          nextAction.tone,
        )}`}
      >
        <p className="text-xs font-black uppercase opacity-80">Player alert</p>
        <p className="mt-1 text-base font-black">
          {athleteName} - {nextEvent ? getScheduleLine(nextEvent) : nextAction.label}
        </p>
        <p className="mt-1 text-sm opacity-90">{nextAction.description}</p>
      </div>

      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase text-slate-500">
            Registration
          </p>
          <p className="mt-1 font-black text-slate-950">
            {getParentRegistrationStatusLabel(registrationStatus)}
          </p>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase text-slate-500">Roster</p>
          <p className="mt-1 font-black text-slate-950">
            {getParentRosterStatusLabel(rosterStatus)}
          </p>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase text-slate-500">
            Next scheduled
          </p>
          <p className="mt-1 line-clamp-2 font-black text-slate-950">
            {getScheduleLine(nextEvent)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
        <p className="text-sm font-semibold text-slate-500">
          Open player for details and options.
        </p>
        <span className="shrink-0 text-sm font-black text-blue-700">
          Open player
        </span>
      </div>
    </Link>
  );
}
