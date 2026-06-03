"use client";

import type { Athlete } from "../data/athletes";
import type { AttendanceEntry } from "../data/attendance";
import { useAttendanceEntries } from "./attendanceStatusState";

type AttendanceRosterCardProps = {
  eventId: string;
  roster: Athlete[];
  rosterPreview: Athlete[];
  entries: AttendanceEntry[];
};

function getStatusClass(status: string) {
  if (status === "Attending") {
    return "bg-blue-500/20 text-blue-300";
  }

  if (status === "Not Attending") {
    return "bg-red-500/20 text-red-300";
  }

  return "bg-slate-700 text-slate-300";
}

export default function AttendanceRosterCard({
  eventId,
  roster,
  rosterPreview,
  entries,
}: AttendanceRosterCardProps) {
  const currentEntries = useAttendanceEntries(eventId, entries);
  const statusByAthleteId = new Map(
    currentEntries
      .filter((entry) => entry.athleteId)
      .map((entry) => [entry.athleteId, entry.status]),
  );

  function renderPlayer(player: Athlete) {
    const status = statusByAthleteId.get(player.id) ?? "Unknown";

    return (
      <p key={player.id} className="flex items-center justify-between gap-3">
        <span>{player.name}</span>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
            status,
          )}`}
        >
          {status}
        </span>
      </p>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-lg font-bold">Roster</h2>
      <p className="mt-3 text-sm text-slate-300">{roster.length} Listed</p>
      <div className="mt-4 space-y-3 text-sm text-slate-300">
        {rosterPreview.map(renderPlayer)}
        {roster.length > rosterPreview.length && <p>...</p>}
      </div>
      <details className="mt-4 rounded-xl border border-slate-700 bg-slate-900 text-sm text-slate-300">
        <summary className="cursor-pointer px-4 py-3 text-center font-semibold text-white">
          View Full Roster
        </summary>
        <div className="space-y-3 border-t border-slate-800 px-4 py-3">
          {roster.length > 0 ? roster.map(renderPlayer) : <p>No roster listed.</p>}
        </div>
      </details>
    </div>
  );
}
