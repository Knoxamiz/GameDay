"use client";

import Link from "next/link";
import { summarizeDocumentRequirements } from "../data/documents";
import { summarizePaymentRequirements } from "../data/payments";
import {
  getDocumentRequirementsFromRegistrations,
  getPaymentRequirementsFromRegistrations,
} from "../data/registrationDerivedRequirements";
import type { Registration } from "../data/registrations";
import { useDocumentRequirements } from "./documentRequirementState";
import { usePaymentRequirements } from "./paymentRequirementState";
import { useRegistrationConcernCount } from "./registrationStatusState";

type RegistrationConcernActionProps = {
  href: string;
  registrations: Registration[];
};

export default function RegistrationConcernAction({
  href,
  registrations,
}: RegistrationConcernActionProps) {
  const registrationConcernCount = useRegistrationConcernCount(registrations);
  const documents = useDocumentRequirements(
    getDocumentRequirementsFromRegistrations(registrations),
  );
  const payments = usePaymentRequirements(
    getPaymentRequirementsFromRegistrations(registrations),
  );
  const documentSummary = summarizeDocumentRequirements(documents);
  const paymentSummary = summarizePaymentRequirements(payments);
  const concernCount =
    registrationConcernCount + documentSummary.open + paymentSummary.open;
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
