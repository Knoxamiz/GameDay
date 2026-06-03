"use client";

import Link from "next/link";
import type { Registration } from "../data/registrations";
import { useRegistrationConcernCount } from "./registrationStatusState";

type RegistrationConcernActionProps = {
  href: string;
  registrations: Registration[];
};

export default function RegistrationConcernAction({
  href,
  registrations,
}: RegistrationConcernActionProps) {
  const concernCount = useRegistrationConcernCount(registrations);
  const label =
    concernCount === 1
      ? "1 Registration Concern"
      : `${concernCount} Registration Concerns`;

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
