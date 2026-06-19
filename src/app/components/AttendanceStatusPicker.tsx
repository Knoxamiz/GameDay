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
  surface?: "dark" | "light";
};

export default function AttendanceStatusPicker({
  athleteId,
  eventId,
  initialStatus,
  compact = false,
  surface = "dark",
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
          ? `mt-3 border-t pt-3 ${
              surface === "light" ? "border-slate-200" : "border-slate-700"
            }`
          : "mt-3 rounded-lg border border-blue-300/20 bg-slate-950/70 p-3"
      }
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className={compact ? "text-sm font-semibold" : "text-lg font-bold"}>
          Attendance
        </h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            initialStatus === "Attending"
              ? surface === "light"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-blue-500/20 text-blue-300"
              : initialStatus === "Not Attending"
                ? "bg-red-50 text-red-700"
                : surface === "light"
                  ? "bg-slate-100 text-slate-600"
                  : "bg-slate-700 text-slate-300"
          }`}
        >
          {initialStatus}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5 text-xs font-black">
        {attendanceOptions.map((option) => (
          <button
            key={option}
            type="button"
            disabled={isPending}
            onClick={() => updateAttendance(option)}
            className={`rounded-md border px-2 py-2 ${
              option === initialStatus
                ? surface === "light"
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-blue-500 bg-blue-500/20 text-blue-200"
                : surface === "light"
                  ? "border-slate-200 bg-white text-slate-700"
                  : "border-slate-700 bg-slate-900 text-slate-300"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {option}
          </button>
        ))}
      </div>
      {error && (
        <p className="mt-2 text-sm font-semibold text-red-700">{error}</p>
      )}
    </div>
  );
}
