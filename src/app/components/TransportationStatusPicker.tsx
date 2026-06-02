"use client";

import { useState } from "react";
import type { TransportationStatus } from "../data/transportation";
import {
  getSavedTransportationStatus,
  saveTransportationStatus,
} from "./transportationStatusState";

type TransportationStatusPickerProps = {
  athleteId: string;
  eventId: string;
  initialStatus: TransportationStatus;
  missingRequirementLabels: string[];
  options: TransportationStatus[];
};

export default function TransportationStatusPicker({
  athleteId,
  eventId,
  initialStatus,
  missingRequirementLabels,
  options,
}: TransportationStatusPickerProps) {
  const [selectedStatus, setSelectedStatus] = useState<TransportationStatus>(
    () => getSavedTransportationStatus(athleteId, eventId) ?? initialStatus,
  );
  const hasTransportationReady = selectedStatus !== "Unknown";
  const isReady =
    hasTransportationReady && missingRequirementLabels.length === 0;

  return (
    <>
      <div
        className={`mt-4 rounded-2xl border p-4 text-sm ${
          isReady
            ? "border-blue-500/40 bg-blue-500/10 text-blue-200"
            : "border-red-500/40 bg-red-500/10 text-red-200"
        }`}
      >
        <p className="font-semibold">
          {isReady ? "Ready for next event" : "Action needed before event"}
        </p>
        {!hasTransportationReady && (
          <p className="mt-2">Choose a transportation status.</p>
        )}
        {missingRequirementLabels.length > 0 && (
          <p className="mt-2">Missing: {missingRequirementLabels.join(", ")}</p>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-lg font-bold">Transportation</h2>
        <p
          className={`mt-3 text-sm font-semibold ${
            hasTransportationReady ? "text-blue-300" : "text-red-300"
          }`}
        >
          Current: {selectedStatus}
        </p>
        <div className="mt-4 grid gap-3">
          {options.map((option) => {
            const isSelected = option === selectedStatus;

            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setSelectedStatus(option);
                  saveTransportationStatus(athleteId, eventId, option);
                }}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold ${
                  isSelected
                    ? "border-blue-300 bg-blue-500/20 text-blue-100"
                    : "border-slate-700 bg-slate-900 text-slate-300"
                }`}
              >
                <span
                  className={`h-4 w-4 rounded-full border ${
                    isSelected
                      ? "border-blue-300 bg-blue-300"
                      : "border-slate-500"
                  }`}
                />
                {option}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
