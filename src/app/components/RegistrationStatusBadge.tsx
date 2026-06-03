import type { RegistrationStatus } from "../data/registrations";

type RegistrationStatusBadgeProps = {
  status: RegistrationStatus;
};

export function getRegistrationStatusTone(status: RegistrationStatus) {
  if (status === "Approved") {
    return "bg-blue-500/20 text-blue-300";
  }

  if (status === "Rejected" || status === "Incomplete") {
    return "bg-red-500/20 text-red-300";
  }

  return "bg-yellow-500/20 text-yellow-200";
}

export default function RegistrationStatusBadge({
  status,
}: RegistrationStatusBadgeProps) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${getRegistrationStatusTone(
        status,
      )}`}
    >
      {status}
    </span>
  );
}
