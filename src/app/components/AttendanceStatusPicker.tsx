"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  attendanceOptions,
  type AttendanceStatus,
} from "../data/attendance";

type AttendanceStatusPickerProps = {
  athleteId: string;
  eventId: string;
  initialStatus: AttendanceStatus;
  compact?: boolean;
};

export default function AttendanceStatusPicker({
  athleteId,
  eventId,
  initialStatus,
  compact = false,
}: AttendanceStatusPickerProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateAttendance(status: AttendanceStatus) {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/events/${eventId}/attendance`, {
          body: JSON.stringify({ athleteId, status }),
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          method: "PATCH",
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            error?: unknown;
          } | null;
          setError(
            typeof body?.error === "string"
              ? body.error
              : "Could not update attendance.",
          );
          return;
        }

        router.refresh();
      } catch {
        setError("Could not update attendance. Please try again.");
      }
    });
  }

  return (
    <div
      className={
        compact
          ? "mt-4 border-t border-slate-700 pt-4"
          : "mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5"
      }
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className={compact ? "text-sm font-semibold" : "text-lg font-bold"}>
          Attendance
        </h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            initialStatus === "Attending"
              ? "bg-blue-500/20 text-blue-300"
              : initialStatus === "Not Attending"
                ? "bg-red-500/20 text-red-300"
                : "bg-slate-700 text-slate-300"
          }`}
        >
          {initialStatus}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs font-semibold">
        {attendanceOptions.map((option) => (
          <button
            key={option}
            type="button"
            disabled={isPending}
            onClick={() => updateAttendance(option)}
            className={`rounded-xl border px-2 py-3 ${
              option === initialStatus
                ? "border-blue-500 bg-blue-500/20 text-blue-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {option}
          </button>
        ))}
      </div>
      {error && (
        <p className="mt-3 text-sm font-semibold text-red-300">{error}</p>
      )}
    </div>
  );
}
