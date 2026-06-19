"use client";

import { useState } from "react";
import { withActiveOrganization } from "../data/activeOrganization";

type AdminTeamCreateFormProps = {
  activeOrganizationId: string;
  defaultOpen?: boolean;
  disabledReason?: string;
};

type SetupResponse = {
  error?: string;
  id?: string;
  message?: string;
};

function getCurrentSeasonLabel() {
  return `${new Date().getFullYear()} Season`;
}

export default function AdminTeamCreateForm({
  activeOrganizationId,
  defaultOpen = false,
  disabledReason,
}: AdminTeamCreateFormProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [name, setName] = useState("");
  const [division, setDivision] = useState("");
  const [season, setSeason] = useState(getCurrentSeasonLabel());
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createTeam() {
    setError(null);
    setMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/setup", {
        body: JSON.stringify({
          activeOrganizationId,
          actionType: "team",
          division,
          name,
          organizationId: activeOrganizationId,
          season,
          status: "active",
        }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as
        | SetupResponse
        | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Could not create team.");
      }

      setMessage(body?.message ?? "Team created.");
      window.setTimeout(() => {
        window.location.assign(
          withActiveOrganization(
            body?.id ? `/admin/teams/${body.id}` : "/admin/teams",
            activeOrganizationId,
          ),
        );
      }, 450);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not create team.",
      );
      setIsSaving(false);
    }
  }

  return (
    <section
      className="gd-card-dark scroll-mt-4 rounded-lg p-3 backdrop-blur"
      id="create-team"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-black text-white">Create New Team</h2>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Add one team workspace inside this organization.
          </p>
        </div>
        <button
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-black text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={Boolean(disabledReason)}
          onClick={() => setIsOpen((currentValue) => !currentValue)}
          type="button"
        >
          {isOpen ? "Close" : "+ Create new team"}
        </button>
      </div>

      {disabledReason && (
        <p className="mt-3 rounded-md border border-orange-300/30 bg-orange-500/10 p-2.5 text-xs font-bold text-orange-100">
          {disabledReason}
        </p>
      )}

      {isOpen && !disabledReason && (
        <div className="mt-3 border-t border-white/10 pt-3">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_14rem]">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-xs font-black uppercase text-slate-400">
                  Team Name
                </span>
                <input
                  className="mt-1.5 w-full rounded-md border border-white/15 bg-slate-950/75 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Pineboys 10U"
                  value={name}
                />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase text-slate-400">
                  Age Group / Division
                </span>
                <input
                  className="mt-1.5 w-full rounded-md border border-white/15 bg-slate-950/75 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
                  onChange={(event) => setDivision(event.target.value)}
                  placeholder="10U, 12U, High School"
                  value={division}
                />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase text-slate-400">
                  Season
                </span>
                <input
                  className="mt-1.5 w-full rounded-md border border-white/15 bg-slate-950/75 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
                  onChange={(event) => setSeason(event.target.value)}
                  value={season}
                />
              </label>
            </div>

            <div className="rounded-md bg-white/[0.06] p-3 text-xs">
              <p className="font-black text-white">What happens next</p>
              <p className="mt-1 font-semibold text-slate-400">
                The team is created as active so you can add registration,
                coaches, events, and rostered players right away.
              </p>
            </div>
          </div>

          {message && (
            <p className="mt-3 rounded-md border border-emerald-300/30 bg-emerald-500/10 p-2.5 text-xs font-bold text-emerald-100">
              {message}
            </p>
          )}
          {error && (
            <p className="mt-3 rounded-md border border-red-300/30 bg-red-500/10 p-2.5 text-xs font-bold text-red-100">
              {error}
            </p>
          )}

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-black text-slate-200 hover:bg-white/10"
              disabled={isSaving}
              onClick={() => setIsOpen(false)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-black text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              onClick={() => void createTeam()}
              type="button"
            >
              {isSaving ? "Creating..." : "Create active team"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
