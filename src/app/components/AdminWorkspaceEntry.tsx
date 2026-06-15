"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { withActiveOrganization } from "../data/activeOrganization";
import {
  getOrganizationWorkspaceTypeLabel,
  type Organization,
  type OrganizationWorkspaceType,
} from "../data/organizations";
import SessionControls from "./SessionControls";

type AdminWorkspaceEntryProps = {
  accountLabel?: string;
  blockedReturnHref?: string;
  canCreateWorkspace: boolean;
  organizations: Organization[];
};

type SetupResponse = {
  error?: string;
  id?: string;
  message?: string;
};

export default function AdminWorkspaceEntry({
  accountLabel,
  blockedReturnHref = "/login",
  canCreateWorkspace,
  organizations,
}: AdminWorkspaceEntryProps) {
  const [workspaceType, setWorkspaceType] =
    useState<OrganizationWorkspaceType | null>(null);
  const [name, setName] = useState("");
  const [division, setDivision] = useState("");
  const [season, setSeason] = useState(`${new Date().getFullYear()} Season`);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!workspaceType) {
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/setup", {
        body: JSON.stringify({
          actionType: "workspace-provisioning",
          division,
          name,
          season,
          workspaceType,
        }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as
        | SetupResponse
        | null;

      if (!response.ok || !body?.id) {
        throw new Error(body?.error ?? "Could not create workspace.");
      }

      window.location.assign(
        withActiveOrganization("/admin/setup", body.id),
      );
    } catch (creationError) {
      setError(
        creationError instanceof Error
          ? creationError.message
          : "Could not create workspace.",
      );
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <p className="text-xl font-bold">GameDay</p>
            <p className="mt-1 text-xs font-semibold uppercase text-blue-300">
              Admin / Owner
            </p>
            {accountLabel && (
              <p className="mt-1 text-sm text-slate-400">{accountLabel}</p>
            )}
          </div>
          <SessionControls compact role="admin" />
        </header>

        {organizations.length > 1 ? (
          <section className="py-8">
            <p className="text-xs font-semibold uppercase text-slate-400">
              Workspace selection
            </p>
            <h1 className="mt-2 text-3xl font-bold">Choose a workspace</h1>
            <p className="mt-2 text-sm text-slate-300">
              Select the organization or individual team you want to manage.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {organizations.map((organization) => (
                <Link
                  className="rounded-lg border border-slate-800 bg-slate-900 p-5 transition-colors hover:border-blue-500"
                  href={withActiveOrganization("/admin", organization.id)}
                  key={organization.id}
                >
                  <p className="text-xs font-semibold uppercase text-blue-300">
                    {getOrganizationWorkspaceTypeLabel(organization)}
                  </p>
                  <h2 className="mt-2 text-xl font-bold">
                    {organization.name}
                  </h2>
                  <p className="mt-4 text-sm font-semibold text-slate-300">
                    Open workspace
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ) : canCreateWorkspace ? (
          <section className="py-8">
            <p className="text-xs font-semibold uppercase text-slate-400">
              First workspace
            </p>
            <h1 className="mt-2 text-3xl font-bold">Create your workspace</h1>
            <p className="mt-2 text-sm text-slate-300">
              Choose the structure that matches what you manage today.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                aria-pressed={workspaceType === "organization"}
                className={`rounded-lg border p-5 text-left ${
                  workspaceType === "organization"
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-slate-800 bg-slate-900"
                }`}
                onClick={() => setWorkspaceType("organization")}
                type="button"
              >
                <p className="font-bold">Create Organization</p>
                <p className="mt-2 text-sm text-slate-300">
                  Create an organization for multiple teams.
                </p>
              </button>
              <button
                aria-pressed={workspaceType === "single_team"}
                className={`rounded-lg border p-5 text-left ${
                  workspaceType === "single_team"
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-slate-800 bg-slate-900"
                }`}
                onClick={() => setWorkspaceType("single_team")}
                type="button"
              >
                <p className="font-bold">Create Individual Team</p>
                <p className="mt-2 text-sm text-slate-300">
                  Create an individual team workspace for one team.
                </p>
              </button>
            </div>

            {workspaceType && (
              <form
                className="mt-5 rounded-lg border border-slate-800 bg-slate-900 p-5"
                onSubmit={createWorkspace}
              >
                <h2 className="font-bold">
                  {workspaceType === "single_team"
                    ? "Individual Team Details"
                    : "Organization Details"}
                </h2>
                <div className="mt-4 space-y-4">
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-300">
                      {workspaceType === "single_team"
                        ? "Team Name"
                        : "Organization Name"}
                    </span>
                    <input
                      className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
                      onChange={(event) => setName(event.target.value)}
                      required
                      value={name}
                    />
                  </label>

                  {workspaceType === "single_team" && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-sm font-semibold text-slate-300">
                          Division
                        </span>
                        <input
                          className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
                          onChange={(event) => setDivision(event.target.value)}
                          placeholder="10U, 12U, High School"
                          required
                          value={division}
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-semibold text-slate-300">
                          Season
                        </span>
                        <input
                          className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
                          onChange={(event) => setSeason(event.target.value)}
                          required
                          value={season}
                        />
                      </label>
                    </div>
                  )}

                  {error && (
                    <p className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm font-semibold text-red-300">
                      {error}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-md bg-blue-500 px-4 py-3 font-semibold text-white disabled:opacity-60"
                      disabled={isSaving}
                      type="submit"
                    >
                      {isSaving
                        ? "Creating..."
                        : workspaceType === "single_team"
                          ? "Create Individual Team"
                          : "Create Organization"}
                    </button>
                    <button
                      className="rounded-md border border-slate-700 px-4 py-3 font-semibold text-slate-300"
                      disabled={isSaving}
                      onClick={() => setWorkspaceType(null)}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            )}
          </section>
        ) : (
          <section className="py-8">
            <p className="text-xs font-semibold uppercase text-slate-400">
              Admin access
            </p>
            <h1 className="mt-2 text-3xl font-bold">No manageable workspace</h1>
            <p className="mt-3 max-w-xl text-sm text-slate-300">
              This account does not have an active owner or admin membership,
              and it is not allowed to create a workspace. Ask an organization
              owner to invite or reactivate this account.
            </p>
            <Link
              className="mt-5 inline-block rounded-md border border-slate-700 px-4 py-3 font-semibold text-slate-200"
              href={blockedReturnHref}
            >
              Return to your dashboard
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
