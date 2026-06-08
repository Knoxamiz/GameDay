"use client";

import { useSyncExternalStore } from "react";
import {
  paymentRequirementStatusValues,
  type PaymentRequirement,
  type PaymentRequirementStatus,
} from "../data/payments";

export const paymentRequirementChangedEvent =
  "gameday:payment-requirement-changed";

const storagePrefix = "gameday.paymentRequirement";
const statusSeparator = "|";

function getStorageKey(requirementId: string) {
  return `${storagePrefix}.${requirementId}`;
}

function isPaymentRequirementStatus(
  value: string,
): value is PaymentRequirementStatus {
  return paymentRequirementStatusValues.includes(
    value as PaymentRequirementStatus,
  );
}

export function getSavedPaymentRequirementStatus(requirementId: string) {
  if (typeof window === "undefined") {
    return undefined;
  }

  const savedStatus = window.localStorage.getItem(getStorageKey(requirementId));

  return savedStatus && isPaymentRequirementStatus(savedStatus)
    ? savedStatus
    : undefined;
}

export function savePaymentRequirementStatus(
  requirementId: string,
  status: PaymentRequirementStatus,
) {
  window.localStorage.setItem(getStorageKey(requirementId), status);
  window.dispatchEvent(
    new CustomEvent(paymentRequirementChangedEvent, {
      detail: {
        requirementId,
        status,
      },
    }),
  );
}

function getPaymentRequirementSnapshot(
  requirements: PaymentRequirement[],
  includeSavedStatuses: boolean,
) {
  return requirements
    .map((requirement) => {
      const status = includeSavedStatuses
        ? getSavedPaymentRequirementStatus(requirement.id) ?? requirement.status
        : requirement.status;

      return `${requirement.id}:${status}`;
    })
    .join(statusSeparator);
}

function subscribePaymentRequirements(onStoreChange: () => void) {
  function handleRequirementChange() {
    onStoreChange();
  }

  function handleStorageChange(event: StorageEvent) {
    if (event.key?.startsWith(`${storagePrefix}.`)) {
      onStoreChange();
    }
  }

  window.addEventListener(paymentRequirementChangedEvent, handleRequirementChange);
  window.addEventListener("storage", handleStorageChange);

  return () => {
    window.removeEventListener(
      paymentRequirementChangedEvent,
      handleRequirementChange,
    );
    window.removeEventListener("storage", handleStorageChange);
  };
}

export function usePaymentRequirements(requirements: PaymentRequirement[]) {
  const snapshot = useSyncExternalStore(
    subscribePaymentRequirements,
    () => getPaymentRequirementSnapshot(requirements, true),
    () => getPaymentRequirementSnapshot(requirements, false),
  );
  const statusesById = new Map(
    snapshot.split(statusSeparator).map((requirementSnapshot) => {
      const [requirementId = "", status = ""] = requirementSnapshot.split(":");

      return [
        requirementId,
        isPaymentRequirementStatus(status) ? status : undefined,
      ];
    }),
  );

  return requirements.map<PaymentRequirement>((requirement) => ({
    ...requirement,
    status: statusesById.get(requirement.id) ?? requirement.status,
  }));
}
