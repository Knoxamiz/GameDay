"use client";

import Link from "next/link";
import {
  getDocumentRequirementsByRegistrationIds,
  summarizeDocumentRequirements,
} from "../data/documents";
import {
  getPaymentRequirementsByRegistrationIds,
  summarizePaymentRequirements,
} from "../data/payments";
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
  const registrationIds = registrations.map((registration) => registration.id);
  const documents = useDocumentRequirements(
    getDocumentRequirementsByRegistrationIds(registrationIds),
  );
  const payments = usePaymentRequirements(
    getPaymentRequirementsByRegistrationIds(registrationIds),
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
