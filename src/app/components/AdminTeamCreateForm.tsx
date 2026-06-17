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
      className="scroll-mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
      id="create-team"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-black">Create New Team</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Add one team workspace inside this organization.
          </p>
        </div>
        <button
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={Boolean(disabledReason)}
          onClick={() => setIsOpen((currentValue) => !currentValue)}
          type="button"
        >
          {isOpen ? "Close" : "+ Create new team"}
        </button>
      </div>

      {disabledReason && (
        <p className="mt-4 rounded-md border border-orange-200 bg-orange-50 p-3 text-sm font-bold text-orange-700">
          {disabledReason}
        </p>
      )}

      {isOpen && !disabledReason && (
        <div className="mt-4 border-t border-slate-200 pt-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-sm font-black text-slate-700">
                  Team Name
                </span>
                <input
                  className="mt-2 w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Pineboys 10U"
                  value={name}
                />
              </label>
              <label className="block">
                <span className="text-sm font-black text-slate-700">
                  Age Group / Division
                </span>
                <input
                  className="mt-2 w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) => setDivision(event.target.value)}
                  placeholder="10U, 12U, High School"
                  value={division}
                />
              </label>
              <label className="block">
                <span className="text-sm font-black text-slate-700">
                  Season
                </span>
                <input
                  className="mt-2 w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) => setSeason(event.target.value)}
                  value={season}
                />
              </label>
            </div>

            <div className="rounded-md bg-slate-50 p-4 text-sm">
              <p className="font-black text-slate-950">What happens next</p>
              <p className="mt-2 font-semibold text-slate-600">
                The team is created as active so you can add registration,
                coaches, events, and rostered players right away.
              </p>
            </div>
          </div>

          {message && (
            <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
              {message}
            </p>
          )}
          {error && (
            <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
              {error}
            </p>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
              disabled={isSaving}
              onClick={() => setIsOpen(false)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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
