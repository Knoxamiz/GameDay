"use client";

import Link from "next/link";
import type { AttendanceEntry } from "../data/attendance";
import { useAttendanceConcernCount } from "./attendanceStatusState";

type AttendanceConcernActionProps = {
  entries: AttendanceEntry[];
  href: string;
};

export default function AttendanceConcernAction({
  entries,
  href,
}: AttendanceConcernActionProps) {
  const concernCount = useAttendanceConcernCount(entries);
  const label =
    concernCount === 1
      ? "1 Attendance Concern"
      : `${concernCount} Attendance Concerns`;

  return (
    <Link
      href={href}
      className={`block rounded-xl bg-slate-800 p-4 ${
        concernCount > 0 ? "text-red-300" : "text-blue-300"
      }`}
    >
      {label}
    </Link>
  );
}
