"use client";

import Link from "next/link";
import { FormEvent, ReactNode, SVGProps, useState } from "react";
import { withActiveOrganization } from "../data/activeOrganization";
import type {
  Organization,
  OrganizationWorkspaceType,
} from "../data/organizations";
import { createFirebaseClientAuthAdapter } from "../infrastructure/firebaseClientAuth";
import AdminArchiveButton from "./AdminArchiveButton";

export type AdminTeamChoice = {
  division?: string;
  id: string;
  label: string;
  name: string;
  organizationId: string;
  organizationName: string;
  organizationWorkspaceType: OrganizationWorkspaceType;
  season?: string;
};

type AdminContextHomeProps = {
  accountLabel?: string;
  activeOrganizationId?: string;
  canCreateOrganization: boolean;
  organizations: Organization[];
  teams: AdminTeamChoice[];
};

type PanelMode =
  | "select-organization"
  | "select-team"
  | null;

type SetupResponse = {
  error?: string;
  id?: string;
  message?: string;
  teamId?: string;
};

function getCurrentSeasonLabel() {
  return `${new Date().getFullYear()} Season`;
}

function toTitleCase(value: string) {
  return value
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function getDisplayName(accountLabel?: string) {
  if (!accountLabel) {
    return "Coach Taylor";
  }

  return toTitleCase(accountLabel.split("@")[0]) || "Coach Taylor";
}

function getInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "CT";
}

function CardShell({
  body,
  icon,
  iconTone,
  isActive,
  onClick,
  title,
}: {
  body: string;
  icon: ReactNode;
  iconTone: "blue" | "green" | "orange" | "purple";
  isActive: boolean;
  onClick: () => void;
  title: string;
}) {
  const iconClass = {
    blue: "bg-blue-500/10 text-blue-300 ring-blue-400/20",
    green: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20",
    orange: "bg-orange-500/10 text-orange-300 ring-orange-400/20",
    purple: "bg-violet-500/10 text-violet-300 ring-violet-400/20",
  }[iconTone];
  const cardClass = {
    blue: "border-blue-400/20 bg-[linear-gradient(135deg,rgba(15,23,42,0.94)_0%,rgba(15,40,82,0.88)_100%)] hover:border-blue-300/60",
    green:
      "border-emerald-400/20 bg-[linear-gradient(135deg,rgba(15,23,42,0.94)_0%,rgba(12,64,52,0.82)_100%)] hover:border-emerald-300/60",
    orange:
      "border-orange-400/20 bg-[linear-gradient(135deg,rgba(15,23,42,0.94)_0%,rgba(82,45,14,0.78)_100%)] hover:border-orange-300/60",
    purple:
      "border-violet-400/20 bg-[linear-gradient(135deg,rgba(15,23,42,0.94)_0%,rgba(55,36,105,0.82)_100%)] hover:border-violet-300/60",
  }[iconTone];
  const arrowClass = {
    blue: "text-blue-300",
    green: "text-emerald-300",
    orange: "text-orange-300",
    purple: "text-violet-300",
  }[iconTone];
  const railClass = {
    blue: "bg-blue-600",
    green: "bg-emerald-600",
    orange: "bg-orange-500",
    purple: "bg-violet-600",
  }[iconTone];

  return (
    <button
      aria-expanded={isActive}
      className={`group relative flex min-h-20 w-full overflow-hidden rounded-lg border px-3 py-3 text-left shadow-[0_18px_42px_rgba(0,0,0,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_54px_rgba(37,99,235,0.18)] ${cardClass} ${
        isActive ? "ring-2 ring-blue-400/35" : ""
      }`}
      onClick={onClick}
      type="button"
    >
      <span className={`absolute inset-x-0 top-0 h-1 ${railClass}`} />
      <span className={`absolute inset-0 ${cardClass}`} />
      <span className="relative flex w-full items-center gap-4">
      <span
        className={`flex size-12 shrink-0 items-center justify-center rounded-lg ring-1 sm:size-14 ${iconClass}`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-black leading-tight text-white">
          {title}
        </span>
        <span className="mt-1 block max-w-md text-sm leading-snug text-slate-300">
          {body}
        </span>
      </span>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 shadow-sm ring-1 ring-white/15 transition group-hover:translate-x-0.5">
        <ChevronRightIcon className={`size-5 ${arrowClass}`} />
      </span>
      </span>
    </button>
  );
}

function InlineDropdown({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-lg border border-white/10 bg-slate-950/80 p-3 text-white shadow-[0_18px_42px_rgba(0,0,0,0.24)]">
      {children}
    </section>
  );
}

function ShieldLogoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 48 56" {...props}>
      <path
        d="M24 3 7.5 8.8v15.7C7.5 38.4 15.8 48.7 24 53c8.2-4.3 16.5-14.6 16.5-28.5V8.8L24 3Z"
        fill="#0f766e"
        stroke="#061431"
        strokeWidth="3"
      />
      <path
        d="m24 16.5 2.2 5 5.5.5-4.2 3.6 1.3 5.4-4.8-2.8-4.8 2.8 1.3-5.4-4.2-3.6 5.5-.5 2.2-5Z"
        fill="#fff"
        stroke="#061431"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function BuildingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 64 64" {...props}>
      <path d="M10 56h44" strokeLinecap="round" />
      <path d="M17 56V17h25v39" strokeLinejoin="round" />
      <path d="M42 31h9v25" strokeLinejoin="round" />
      <path d="M25 27h5M25 39h5" strokeLinecap="round" />
    </svg>
  );
}

function WhistleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 64 64" {...props}>
      <path d="M18 42c0-11 9-20 20-20h15v9c0 7-6 13-13 13h-8" strokeLinejoin="round" />
      <path d="M21 48c-7 0-12-5-12-11 0-4 3-7 7-7 5 0 9 4 9 9v9h-4Z" strokeLinejoin="round" />
      <circle cx="34" cy="32" r="3" />
      <path d="M34 14v-6M45 17l5-5M23 17l-5-5" strokeLinecap="round" />
    </svg>
  );
}

function ChevronRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" {...props}>
      <path d="m9 5 7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" {...props}>
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" {...props}>
      <path d="M7 10V8a5 5 0 0 1 10 0v2" strokeLinecap="round" />
      <rect height="10" rx="2" width="14" x="5" y="10" />
    </svg>
  );
}

function ExternalLinkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24" {...props}>
      <path d="M14 4h6v6M20 4 10 14" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" strokeLinecap="round" />
    </svg>
  );
}

export default function AdminContextHome({
  accountLabel,
  activeOrganizationId,
  canCreateOrganization,
  organizations,
  teams,
}: AdminContextHomeProps) {
  const [activePanel, setActivePanel] = useState<PanelMode>(null);
  const [organizationName, setOrganizationName] = useState("");
  const [teamBuilderName, setTeamBuilderName] = useState("");
  const [teamBuilderDivision, setTeamBuilderDivision] = useState("");
  const [teamBuilderSeason, setTeamBuilderSeason] = useState(
    getCurrentSeasonLabel(),
  );
  const [isSavingOrganization, setIsSavingOrganization] = useState(false);
  const [isSavingTeamBuilder, setIsSavingTeamBuilder] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [organizationError, setOrganizationError] = useState<string | null>(null);
  const [teamBuilderError, setTeamBuilderError] = useState<string | null>(null);
  const displayName = getDisplayName(accountLabel);
  const initials = getInitials(displayName);
  const singleTeamWorkspaceTeams = teams.filter(
    (team) => team.organizationWorkspaceType === "single_team",
  );
  const organizationOwnedTeamCount = teams.filter(
    (team) => team.organizationWorkspaceType !== "single_team",
  ).length;

  function togglePanel(panel: Exclude<PanelMode, null>) {
    setActivePanel((currentPanel) => (currentPanel === panel ? null : panel));
  }

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOrganizationError(null);
    setIsSavingOrganization(true);

    try {
      const response = await fetch("/api/admin/setup", {
        body: JSON.stringify({
          actionType: "workspace-provisioning",
          name: organizationName,
          workspaceType: "organization",
        }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as
        | SetupResponse
        | null;

      if (!response.ok || !body?.id) {
        throw new Error(body?.error ?? "Could not create organization.");
      }

      window.location.assign(withActiveOrganization("/admin", body.id));
    } catch (error) {
      setOrganizationError(
        error instanceof Error
          ? error.message
          : "Could not create organization.",
      );
      setIsSavingOrganization(false);
    }
  }

  async function createTeamBuilder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTeamBuilderError(null);
    setIsSavingTeamBuilder(true);

    try {
      const response = await fetch("/api/admin/setup", {
        body: JSON.stringify({
          actionType: "workspace-provisioning",
          division: teamBuilderDivision,
          name: teamBuilderName,
          season: teamBuilderSeason,
          workspaceType: "single_team",
        }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as
        | SetupResponse
        | null;

      if (!response.ok || !body?.id) {
        throw new Error(body?.error ?? "Could not create Team Builder.");
      }

      window.location.assign(
        body.teamId
          ? withActiveOrganization(`/admin/teams/${body.teamId}`, body.id)
          : withActiveOrganization("/admin", body.id),
      );
    } catch (error) {
      setTeamBuilderError(
        error instanceof Error ? error.message : "Could not create Team Builder.",
      );
      setIsSavingTeamBuilder(false);
    }
  }

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      const response = await fetch("/api/session", {
        credentials: "same-origin",
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Could not clear GameDay session.");
      }

      const adapter = await createFirebaseClientAuthAdapter();
      await adapter?.logout();
      window.location.assign("/login");
    } catch {
      setIsSigningOut(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020817] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(37,99,235,0.34),transparent_34%),linear-gradient(115deg,#020817_0%,#061431_56%,#0b2447_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-16 h-px bg-white/10" />

      <header className="relative z-[500] border-b border-white/10 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-[1120px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link className="flex items-center gap-3" href="/admin">
              <span className="flex size-9 items-center justify-center rounded-lg bg-blue-600 shadow-[0_0_30px_rgba(37,99,235,0.42)]">
                <ShieldLogoIcon className="size-7" />
              </span>
              <span className="text-xl font-black uppercase tracking-wide">
                GameDay
              </span>
            </Link>
            <span className="rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-200">
              Admin
            </span>
          </div>

          <div className="relative z-[520]">
            <button
              className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-white/10"
              onClick={() => setIsProfileOpen((currentValue) => !currentValue)}
              type="button"
            >
              <span className="flex size-9 items-center justify-center rounded-full border border-emerald-300/70 bg-emerald-400/10 text-sm font-bold text-emerald-100">
                {initials}
              </span>
              <span className="hidden sm:block">
                <span className="block text-sm font-bold leading-tight">
                  {displayName}
                </span>
                <span className="block text-xs leading-tight text-slate-400">
                  Admin
                </span>
              </span>
              <ChevronDownIcon className="size-5 text-slate-300" />
            </button>
            {isProfileOpen && (
              <div className="absolute right-0 top-full z-[540] mt-2 w-64 rounded-lg border border-blue-300/20 bg-slate-950 p-2 shadow-[0_18px_48px_rgba(0,0,0,0.5)]">
                {accountLabel && (
                  <p className="break-all px-3 py-2 text-sm text-slate-400">
                    {accountLabel}
                  </p>
                )}
                <p className="border-y border-white/10 px-3 py-2 text-xs font-semibold text-slate-400">
                  GameDay only shows workspaces connected to this signed-in
                  email.
                </p>
                <button
                  className="w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-slate-100 hover:bg-white/10 disabled:opacity-60"
                  disabled={isSigningOut}
                  onClick={handleSignOut}
                  type="button"
                >
                  {isSigningOut ? "Signing out..." : "Sign out"}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-[1120px] px-4 pb-8 pt-6 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-blue-300">
              Admin workspace
            </p>
            <h1 className="mt-3 max-w-md text-3xl font-black leading-none tracking-tight sm:text-4xl">
              Pick the lane,
              <span className="block text-blue-500">then run the day.</span>
            </h1>
            <p className="mt-4 max-w-md text-sm font-semibold leading-6 text-slate-300">
              Open an organization or a standalone team first. Creation lives
              inside the same lane so the screen stays clean.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-300">
              <span className="rounded-full border border-blue-400/30 px-3 py-1">
                Secure access
              </span>
              <span className="rounded-full border border-blue-400/30 px-3 py-1">
                Separate workspaces
              </span>
              <span className="rounded-full border border-blue-400/30 px-3 py-1">
                Real teams only
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-blue-300/20 bg-slate-950/56 p-3 shadow-[0_0_80px_rgba(37,99,235,0.2)] backdrop-blur">
            <div className="grid items-start gap-3">
              <div className="space-y-3">
                <CardShell
                  body="Open or create a club, league, or multi-team workspace."
                  icon={<BuildingIcon className="size-9 sm:size-10" />}
                  iconTone="blue"
                  isActive={activePanel === "select-organization"}
                  onClick={() => togglePanel("select-organization")}
                  title="Organizations"
                />
                {activePanel === "select-organization" && (
                  <InlineDropdown>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-base font-black">Organizations</h2>
                        <p className="mt-1 text-sm text-slate-400">
                          Each organization is a separate workspace.
                        </p>
                      </div>
                      <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-bold text-blue-200">
                        {organizations.length} active
                      </span>
                    </div>

                    <div className="mt-3 space-y-2">
                      {accountLabel && (
                        <p className="rounded-md border border-white/10 bg-white/[0.035] p-2.5 text-xs font-semibold text-slate-300">
                          Showing workspaces connected to{" "}
                          <span className="font-black text-white">
                            {accountLabel}
                          </span>
                          . To see an org created with another email, sign out
                          and use that email, or invite this email from that
                          org&apos;s Org Members page.
                        </p>
                      )}
                      {organizations.length > 0 ? (
                        organizations.map((organization) => {
                          const isActive =
                            organization.id === activeOrganizationId;

                          return (
                            <div
                              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-3"
                              key={organization.id}
                            >
                              <Link
                                aria-current={isActive ? "page" : undefined}
                                className="min-w-0 flex-1 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                                href={withActiveOrganization(
                                  "/admin",
                                  organization.id,
                                )}
                              >
                                <span className="block truncate text-sm font-bold text-white">
                                  {organization.name}
                                </span>
                                <span className="mt-1 block text-xs font-semibold text-blue-200">
                                  {isActive ? "Current workspace" : "Open workspace"}
                                </span>
                              </Link>
                              <Link
                                className="rounded-md bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-500"
                                href={withActiveOrganization(
                                  "/admin",
                                  organization.id,
                                )}
                              >
                                Open
                              </Link>
                              <AdminArchiveButton
                                buttonLabel="Remove"
                                confirmMessage={`Remove ${organization.name}? Teams, events, invites, and coach assignments will be archived. Historical registrations and documents will be preserved.`}
                                payload={{
                                  activeOrganizationId: organization.id,
                                  actionType: "organization-archive",
                                  organizationId: organization.id,
                                }}
                                redirectHref="/admin"
                              />
                            </div>
                          );
                        })
                      ) : (
                        <div className="rounded-md border border-dashed border-white/15 p-3">
                          <p className="text-sm font-black text-slate-200">
                            No organizations on this account yet.
                          </p>
                          <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
                            If you created an organization with another email,
                            sign out and use that email. To use this account
                            instead, invite{" "}
                            <span className="font-black text-slate-200">
                              {accountLabel ?? "this email"}
                            </span>{" "}
                            from that organization&apos;s Org Members page.
                          </p>
                        </div>
                      )}
                    </div>

                    <details className="mt-3 rounded-lg border border-blue-400/20 bg-blue-500/10 p-3">
                      <summary className="cursor-pointer text-sm font-bold text-blue-100">
                        Create new organization +
                      </summary>
                      <form className="mt-3" onSubmit={createOrganization}>
                        <label className="block">
                          <span className="text-xs font-bold uppercase tracking-wide text-slate-300">
                            Organization name
                          </span>
                          <input
                            className="mt-2 w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-400"
                            disabled={
                              !canCreateOrganization || isSavingOrganization
                            }
                            onChange={(event) =>
                              setOrganizationName(event.target.value)
                            }
                            required
                            value={organizationName}
                          />
                        </label>
                        <button
                          className="mt-3 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={
                            !canCreateOrganization || isSavingOrganization
                          }
                          type="submit"
                        >
                          {isSavingOrganization
                            ? "Creating..."
                            : "Create organization"}
                        </button>
                        {organizationError && (
                          <p className="mt-3 rounded-md border border-red-400/30 bg-red-500/10 p-2.5 text-sm font-semibold text-red-100">
                            {organizationError}
                          </p>
                        )}
                        {!canCreateOrganization && (
                          <p className="mt-3 text-sm text-slate-400">
                            This account cannot create organizations.
                          </p>
                        )}
                      </form>
                    </details>
                  </InlineDropdown>
                )}
              </div>

              <div className="space-y-3">
                <CardShell
                  body="Open or create a single-team workspace outside an organization."
                  icon={<WhistleIcon className="size-9 sm:size-10" />}
                  iconTone="orange"
                  isActive={activePanel === "select-team"}
                  onClick={() => togglePanel("select-team")}
                  title="Single Teams"
                />
                {activePanel === "select-team" && (
                  <InlineDropdown>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-base font-black">Single Teams</h2>
                        <p className="mt-1 text-sm text-slate-400">
                          Standalone teams stay separate from organizations.
                        </p>
                      </div>
                      <span className="rounded-full bg-orange-500/15 px-3 py-1 text-xs font-bold text-orange-200">
                        {singleTeamWorkspaceTeams.length} active
                      </span>
                    </div>

                    <div className="mt-3 space-y-2">
                      {singleTeamWorkspaceTeams.length > 0 ? (
                        singleTeamWorkspaceTeams.map((team) => (
                          <Link
                            className="block rounded-lg border border-white/10 bg-white/[0.04] p-3 transition hover:border-orange-300/50 hover:bg-orange-500/10"
                            href={withActiveOrganization(
                              `/admin/teams/${team.id}`,
                              team.organizationId,
                            )}
                            key={`${team.organizationId}-${team.id}`}
                          >
                            <span className="block text-sm font-bold text-white">
                              {team.name}
                            </span>
                            <span className="mt-1 block text-xs font-semibold text-orange-100">
                              {[team.division ?? team.label, team.season]
                                .filter(Boolean)
                                .join(" / ")}
                            </span>
                          </Link>
                        ))
                      ) : (
                        <p className="rounded-md border border-dashed border-white/15 p-3 text-sm font-semibold text-slate-400">
                          No standalone team workspaces on this account yet.
                        </p>
                      )}
                    </div>

                    {organizationOwnedTeamCount > 0 && (
                      <p className="mt-3 rounded-md border border-violet-400/20 bg-violet-500/10 p-2.5 text-sm font-semibold text-violet-100">
                        {organizationOwnedTeamCount} organization team
                        {organizationOwnedTeamCount === 1 ? "" : "s"} live
                        inside their organization workspace.
                      </p>
                    )}

                    <details className="mt-3 rounded-lg border border-orange-400/20 bg-orange-500/10 p-3">
                      <summary className="cursor-pointer text-sm font-bold text-orange-100">
                        Create single team +
                      </summary>
                      <form className="mt-3" onSubmit={createTeamBuilder}>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block sm:col-span-2">
                            <span className="text-xs font-bold uppercase tracking-wide text-slate-300">
                              Team name
                            </span>
                            <input
                              className="mt-2 w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
                              disabled={
                                !canCreateOrganization || isSavingTeamBuilder
                              }
                              onChange={(event) =>
                                setTeamBuilderName(event.target.value)
                              }
                              required
                              value={teamBuilderName}
                            />
                          </label>
                          <label className="block">
                            <span className="text-xs font-bold uppercase tracking-wide text-slate-300">
                              Division
                            </span>
                            <input
                              className="mt-2 w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
                              disabled={
                                !canCreateOrganization || isSavingTeamBuilder
                              }
                              onChange={(event) =>
                                setTeamBuilderDivision(event.target.value)
                              }
                              placeholder="10U"
                              required
                              value={teamBuilderDivision}
                            />
                          </label>
                          <label className="block">
                            <span className="text-xs font-bold uppercase tracking-wide text-slate-300">
                              Season
                            </span>
                            <input
                              className="mt-2 w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
                              disabled={
                                !canCreateOrganization || isSavingTeamBuilder
                              }
                              onChange={(event) =>
                                setTeamBuilderSeason(event.target.value)
                              }
                              required
                              value={teamBuilderSeason}
                            />
                          </label>
                        </div>
                        <button
                          className="mt-3 rounded-md bg-orange-500 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={
                            !canCreateOrganization || isSavingTeamBuilder
                          }
                          type="submit"
                        >
                          {isSavingTeamBuilder
                            ? "Creating..."
                            : "Create single team"}
                        </button>
                        {teamBuilderError && (
                          <p className="mt-3 rounded-md border border-red-400/30 bg-red-500/10 p-2.5 text-sm font-semibold text-red-100">
                            {teamBuilderError}
                          </p>
                        )}
                      </form>
                    </details>
                  </InlineDropdown>
                )}
              </div>
            </div>
          </div>
        </div>

        <footer className="pt-6 text-center">
          <p className="flex items-center justify-center gap-3 text-sm text-slate-400">
            <LockIcon className="size-5" />
            <span>Your access is based on your verified role and memberships.</span>
          </p>
          <a
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-300"
            href="mailto:support@gameday.app"
          >
            Need help? Contact support
            <ExternalLinkIcon className="size-4" />
          </a>
        </footer>
      </section>
    </main>
  );
}
