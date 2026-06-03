"use client";

import {
  attendanceOptions,
  type AttendanceStatus,
} from "../data/attendance";
import {
  saveAttendanceStatus,
  useAttendanceStatus,
} from "./attendanceStatusState";

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
  const selectedStatus = useAttendanceStatus(
    athleteId,
    eventId,
    initialStatus,
  );

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
            selectedStatus === "Attending"
              ? "bg-blue-500/20 text-blue-300"
              : selectedStatus === "Not Attending"
                ? "bg-red-500/20 text-red-300"
                : "bg-slate-700 text-slate-300"
          }`}
        >
          {selectedStatus}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs font-semibold">
        {attendanceOptions.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              saveAttendanceStatus(athleteId, eventId, option);
            }}
            className={`rounded-xl border px-2 py-3 ${
              option === selectedStatus
                ? "border-blue-500 bg-blue-500/20 text-blue-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
