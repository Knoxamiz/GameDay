"use client";

import Link from "next/link";
import { useState } from "react";
import { withActiveOrganization } from "../data/activeOrganization";
import type {
  AdminSetupChecklistModel,
  AdminSetupChecklistStepStatus,
} from "../data/adminSetupChecklist";

type AdminSetupChecklistProps = {
  checklist: AdminSetupChecklistModel;
};

function getStatusLabel(status: AdminSetupChecklistStepStatus) {
  if (status === "complete") {
    return "Complete";
  }

  if (status === "next") {
    return "Next";
  }

  if (status === "optional") {
    return "Optional";
  }

  return "Waiting";
}

function getStatusClass(status: AdminSetupChecklistStepStatus) {
  if (status === "complete") {
    return "bg-blue-500/20 text-blue-200";
  }

  if (status === "next") {
    return "bg-yellow-500/20 text-yellow-100";
  }

  return "bg-slate-800 text-slate-300";
}

export default function AdminSetupChecklist({
  checklist,
}: AdminSetupChecklistProps) {
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const isRequiredSetupComplete =
    checklist.completedRequiredSteps === checklist.requiredStepCount;

  return (
    <section className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            First-Run Setup
          </p>
          <h2 className="mt-2 text-xl font-bold">
            {checklist.activeOrganizationName
              ? `Setup for ${checklist.activeOrganizationName}`
              : "Create your organization"}
          </h2>
        </div>
        <span className="shrink-0 rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">
          {checklist.completedRequiredSteps}/{checklist.requiredStepCount}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-300">
        {isRequiredSetupComplete
          ? "Registration setup is ready. Operational steps can continue as your season develops."
          : "Complete the required steps in order. Status changes only when real organization records exist."}
      </p>

      <div className="mt-4 divide-y divide-slate-800 border-y border-slate-800">
        {checklist.steps.map((step) => (
          <div className="py-4" key={step.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-white">{step.label}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {step.description}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(step.status)}`}
              >
                {getStatusLabel(step.status)}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {step.actionHref && step.actionLabel && (
                <Link
                  className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200"
                  href={withActiveOrganization(
                    step.actionHref,
                    checklist.activeOrganizationId,
                  )}
                >
                  {step.actionLabel}
                </Link>
              )}
              {step.joinPath && (
                <>
                  <button
                    className="rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-white"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          `${window.location.origin}${step.joinPath}`,
                        );
                        setCopyMessage("Join link copied.");
                      } catch {
                        setCopyMessage("Could not copy the join link.");
                      }
                    }}
                    type="button"
                  >
                    Copy Join Link
                  </button>
                  <Link
                    className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200"
                    href={step.joinPath}
                    target="_blank"
                  >
                    View Join Page
                  </Link>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {copyMessage && (
        <p className="mt-3 text-sm font-semibold text-slate-300">
          {copyMessage}
        </p>
      )}
    </section>
  );
}
