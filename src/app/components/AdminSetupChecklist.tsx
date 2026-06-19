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
  const isSingleTeamWorkspace = checklist.workspaceType === "single_team";
  const isRequiredSetupComplete =
    checklist.completedRequiredSteps === checklist.requiredStepCount;
  const nextRequiredStep = checklist.nextRequiredStep;

  return (
    <section className="gd-card-dark mt-4 rounded-lg p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {isSingleTeamWorkspace ? "Team Builder Setup" : "First-Run Setup"}
          </p>
          <h2 className="mt-1 text-base font-black">
            {checklist.activeOrganizationName
              ? `Setup for ${checklist.activeOrganizationName}`
              : "Create your workspace"}
          </h2>
        </div>
        <span className="shrink-0 rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">
          {checklist.completedRequiredSteps}/{checklist.requiredStepCount}
        </span>
      </div>
      <div
        className={`mt-3 rounded-lg border p-3 ${
          nextRequiredStep
            ? "border-yellow-500/30 bg-yellow-500/10"
            : "border-blue-500/30 bg-blue-500/10"
        }`}
      >
        <p className="text-xs font-semibold uppercase text-slate-400">
          {nextRequiredStep ? "Next required action" : "Required setup"}
        </p>
        <div className="mt-1.5 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-white">
              {nextRequiredStep?.label ?? "Registration setup is ready"}
            </p>
            <p className="mt-1 text-sm text-slate-300">
              {nextRequiredStep?.description ??
                (isSingleTeamWorkspace
                  ? "Registration, roster, and schedule can continue as your team develops."
                  : "Operational steps can continue as your season develops.")}
            </p>
          </div>
          {nextRequiredStep?.actionHref && nextRequiredStep.actionLabel && (
            <Link
              className="shrink-0 rounded-md bg-blue-500 px-3 py-2 text-sm font-black text-white"
              href={withActiveOrganization(
                nextRequiredStep.actionHref,
                checklist.activeOrganizationId,
              )}
            >
              {nextRequiredStep.actionLabel}
            </Link>
          )}
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {checklist.steps.map((step) => (
          <div className="rounded-md border border-white/10 bg-slate-950/75 p-2.5" key={step.id}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{step.label}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {step.count} real record{step.count === 1 ? "" : "s"}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(step.status)}`}
              >
                {getStatusLabel(step.status)}
              </span>
            </div>

            {step.joinPath && (
              <div className="mt-2 flex flex-wrap gap-2 border-t border-white/10 pt-2">
                  <button
                    className="rounded-md bg-blue-500 px-3 py-2 text-xs font-semibold text-white"
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
                    className="rounded-md border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200"
                    href={step.joinPath}
                    target="_blank"
                  >
                    View Join Page
                  </Link>
                  <p className="w-full text-xs text-slate-500">
                    Use this real join link for a QR code or printed handout.
                    It only opens parent registration.
                  </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {copyMessage && (
        <p className="mt-3 text-sm font-semibold text-slate-300">
          {copyMessage}
        </p>
      )}
      {!isRequiredSetupComplete && !nextRequiredStep && (
        <p className="mt-3 text-sm text-yellow-200">
          Required setup is waiting on an earlier dependency.
        </p>
      )}
    </section>
  );
}
