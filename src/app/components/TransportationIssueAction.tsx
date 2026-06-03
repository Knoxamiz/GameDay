"use client";

import Link from "next/link";
import type { TransportationEntry } from "../data/transportation";
import { useTransportationIssueCount } from "./transportationStatusState";

type TransportationIssueActionProps = {
  entries: TransportationEntry[];
  href: string;
};

export default function TransportationIssueAction({
  entries,
  href,
}: TransportationIssueActionProps) {
  const issueCount = useTransportationIssueCount(entries);
  const label =
    issueCount === 1
      ? "1 Transportation Issue"
      : `${issueCount} Transportation Issues`;

  return (
    <Link
      href={href}
      className={`block rounded-xl bg-slate-800 p-4 ${
        issueCount > 0 ? "text-red-300" : "text-blue-300"
      }`}
    >
      {label}
    </Link>
  );
}
