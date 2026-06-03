"use client";

import Link from "next/link";
import type { Registration } from "../data/registrations";
import { useRegistrationSummary } from "./registrationStatusState";

type RegistrationAdminActionLinksProps = {
  href: string;
  registrations: Registration[];
};

export default function RegistrationAdminActionLinks({
  href,
  registrations,
}: RegistrationAdminActionLinksProps) {
  const summary = useRegistrationSummary(registrations);

  return (
    <>
      <Link href={href} className="block rounded-xl bg-slate-800 p-4 text-slate-300">
        {summary.pendingRegistrations} Pending Registrations
      </Link>
      <Link
        href={href}
        className={`block rounded-xl bg-slate-800 p-4 ${
          summary.incompleteRegistrations > 0
            ? "text-yellow-200"
            : "text-blue-300"
        }`}
      >
        {summary.incompleteRegistrations} Incomplete Registrations
      </Link>
    </>
  );
}
