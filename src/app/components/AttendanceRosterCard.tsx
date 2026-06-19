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
    <details className="gd-card-dark mt-3 rounded-lg">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        <div>
          <h2 className="text-sm font-black text-white">Roster</h2>
          <p className="text-xs font-semibold text-slate-400">
            {roster.length} listed
          </p>
        </div>
        <span className="rounded-full bg-blue-500/20 px-2.5 py-1 text-xs font-black text-blue-200">
          Open
        </span>
      </summary>
      <div className="space-y-2 border-t border-white/10 px-3 pb-3 pt-2 text-sm text-slate-300">
        {roster.length > 0 ? roster.map(renderPlayer) : <p>No roster listed.</p>}
      </div>
    </details>
  );
}
