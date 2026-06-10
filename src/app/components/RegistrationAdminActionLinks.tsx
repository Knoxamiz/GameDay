"use client";

import Link from "next/link";
import {
  summarizePaymentRequirements,
} from "../data/payments";
import {
  summarizeRegistrationRequirements,
  type Registration,
} from "../data/registrations";
import { usePaymentRequirements } from "./paymentRequirementState";
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
  const payments = usePaymentRequirements(
    registrations.flatMap((registration) => registration.paymentRequirements ?? []),
  );
  const documentSummary = summarizeRegistrationRequirements(
    registrations.flatMap((registration) => registration.requirements),
  );
  const paymentSummary = summarizePaymentRequirements(payments);

  return (
    <>
      <Link href={href} className="block rounded-xl bg-slate-800 p-4 text-slate-300">
        {summary.pendingRegistrations} Pending Registrations
      </Link>
      <Link
        href={href}
        className={`block rounded-xl bg-slate-800 p-4 ${
          summary.incompleteRegistrations > 0 || documentSummary.missing > 0
            ? "text-yellow-200"
            : "text-blue-300"
        }`}
      >
        {summary.incompleteRegistrations} Incomplete,{" "}
        {documentSummary.missing} Missing Docs
      </Link>
      <Link
        href={href}
        className={`block rounded-xl bg-slate-800 p-4 ${
          documentSummary.needsReview > 0
            ? "text-yellow-200"
            : "text-blue-300"
        }`}
      >
        {documentSummary.needsReview} Documents Need Review
      </Link>
      <Link
        href={href}
        className={`block rounded-xl bg-slate-800 p-4 ${
          paymentSummary.open > 0 ? "text-yellow-200" : "text-blue-300"
        }`}
      >
        {paymentSummary.open} Payments Open
      </Link>
    </>
  );
}
