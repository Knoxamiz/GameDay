"use client";

import Link from "next/link";
import { FormEvent, ReactNode, SVGProps, useState } from "react";
import { withActiveOrganization } from "../data/activeOrganization";
import type { Organization } from "../data/organizations";
import { createFirebaseClientAuthAdapter } from "../infrastructure/firebaseClientAuth";

export type AdminTeamChoice = {
  division?: string;
  id: string;
  label: string;
  name: string;
  organizationId: string;
  organizationName: string;
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
  | "create-organization"
  | "create-team-builder"
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
  const toneClass = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    orange: "bg-orange-50 text-orange-500",
    purple: "bg-violet-50 text-violet-600",
  }[iconTone];
  const arrowClass = {
    blue: "text-blue-600",
    green: "text-emerald-600",
    orange: "text-orange-500",
    purple: "text-violet-600",
  }[iconTone];

  return (
    <button
      aria-expanded={isActive}
      className={`group flex min-h-48 w-full items-center gap-8 rounded-lg border bg-white px-10 py-9 text-left shadow-[0_16px_34px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_22px_44px_rgba(15,23,42,0.12)] ${
        isActive ? "border-blue-300 ring-4 ring-blue-100" : "border-slate-200"
      }`}
      onClick={onClick}
      type="button"
    >
      <span
        className={`flex size-36 shrink-0 items-center justify-center rounded-full ${toneClass}`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-3xl font-bold leading-tight text-[#071635]">
          {title}
        </span>
        <span className="mt-5 block max-w-md text-2xl leading-snug text-slate-600">
          {body}
        </span>
      </span>
      <ChevronRightIcon className={`size-10 shrink-0 ${arrowClass}`} />
    </button>
  );
}

function InlineDropdown({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
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

function ShieldPlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 64 64" {...props}>
      <path d="M32 8 15 15v14c0 13.5 8 22 17 27 9-5 17-13.5 17-27V15L32 8Z" strokeLinejoin="round" />
      <path d="M32 23v18M23 32h18" strokeLinecap="round" />
    </svg>
  );
}

function GroupIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 64 64" {...props}>
      <circle cx="32" cy="23" r="7" />
      <circle cx="17" cy="25" r="6" />
      <circle cx="47" cy="25" r="6" />
      <path d="M20 51c1.5-8 6-12 12-12s10.5 4 12 12" strokeLinecap="round" />
      <path d="M5 50c1.3-6.8 5.2-10.2 11.5-10.2M59 50c-1.3-6.8-5.2-10.2-11.5-10.2" strokeLinecap="round" />
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
  const [teamName, setTeamName] = useState("");
  const [teamDivision, setTeamDivision] = useState("");
  const [teamSeason, setTeamSeason] = useState(getCurrentSeasonLabel());
  const [isSavingOrganization, setIsSavingOrganization] = useState(false);
  const [isSavingTeamBuilder, setIsSavingTeamBuilder] = useState(false);
  const [isSavingTeam, setIsSavingTeam] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [organizationError, setOrganizationError] = useState<string | null>(null);
  const [teamBuilderError, setTeamBuilderError] = useState<string | null>(null);
  const [teamError, setTeamError] = useState<string | null>(null);
  const displayName = getDisplayName(accountLabel);
  const initials = getInitials(displayName);
  const activeOrganizationTeams = activeOrganizationId
    ? teams.filter((team) => team.organizationId === activeOrganizationId)
    : teams;

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

  async function createTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeOrganizationId) {
      setTeamError("Select an organization before creating a team.");
      return;
    }

    setTeamError(null);
    setIsSavingTeam(true);

    try {
      const response = await fetch("/api/admin/setup", {
        body: JSON.stringify({
          activeOrganizationId,
          actionType: "team",
          division: teamDivision,
          name: teamName,
          organizationId: activeOrganizationId,
          season: teamSeason,
          status: "active",
        }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as
        | SetupResponse
        | null;

      if (!response.ok || !body?.id) {
        throw new Error(body?.error ?? "Could not create team.");
      }

      window.location.assign(
        withActiveOrganization(`/admin/teams/${body.id}`, activeOrganizationId),
      );
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : "Could not create team.");
      setIsSavingTeam(false);
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
    <main className="min-h-screen bg-[#fafbfe] text-[#071635]">
      <header className="border-b border-slate-200 bg-white">
        <div className="flex min-h-28 items-center justify-between px-10">
          <div className="flex items-center gap-9">
            <Link className="flex items-center gap-4" href="/admin">
              <ShieldLogoIcon className="size-12" />
              <span className="text-3xl font-bold tracking-tight">GameDay</span>
            </Link>
            <span className="border-b-[3px] border-blue-600 px-2 py-10 text-2xl font-semibold text-blue-600">
              Admin
            </span>
          </div>

          <div className="relative">
            <button
              className="flex items-center gap-5 rounded-lg px-3 py-2 text-left hover:bg-slate-50"
              onClick={() => setIsProfileOpen((currentValue) => !currentValue)}
              type="button"
            >
              <span className="flex size-14 items-center justify-center rounded-full border-2 border-emerald-600 text-xl font-bold text-emerald-700">
                {initials}
              </span>
              <span>
                <span className="block text-xl font-bold leading-tight">
                  {displayName}
                </span>
                <span className="block text-lg leading-tight text-slate-500">
                  Admin
                </span>
              </span>
              <ChevronDownIcon className="size-7 text-slate-500" />
            </button>
            {isProfileOpen && (
              <div className="absolute right-0 top-full z-10 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
                {accountLabel && (
                  <p className="break-all px-3 py-2 text-sm text-slate-500">
                    {accountLabel}
                  </p>
                )}
                <button
                  className="w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
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

      <section className="mx-auto max-w-[1320px] px-8 pb-16 pt-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            Welcome to GameDay Admin
          </h1>
          <p className="mt-7 text-3xl text-slate-500">
            What would you like to manage today?
          </p>
        </div>

        <div className="mt-14 grid items-start gap-7 lg:grid-cols-2">
          <div className="space-y-3">
            <CardShell
              body="Manage an existing club, league, or multi-team organization."
              icon={<BuildingIcon className="size-20" />}
              iconTone="blue"
              isActive={activePanel === "select-organization"}
              onClick={() => togglePanel("select-organization")}
              title="Select Organization"
            />
            {activePanel === "select-organization" && (
              <InlineDropdown>
                {organizations.length > 0 ? (
                  <ul className="divide-y divide-slate-200" aria-label="Organizations">
                    {organizations.map((organization) => {
                      const isActive = organization.id === activeOrganizationId;

                      return (
                        <li key={organization.id}>
                          <Link
                            aria-current={isActive ? "page" : undefined}
                            className="flex items-center justify-between gap-4 rounded-md px-3 py-4 text-left transition hover:bg-blue-50 focus:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            href={withActiveOrganization(
                              "/admin",
                              organization.id,
                            )}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-lg font-bold text-[#071635]">
                                {organization.name}
                              </span>
                              {isActive && (
                                <span className="mt-1 block text-sm font-semibold text-blue-600">
                                  Current workspace
                                </span>
                              )}
                            </span>
                            <span className="flex shrink-0 items-center gap-3 text-sm font-semibold text-blue-600">
                              Open
                              <ChevronRightIcon className="size-5" />
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="rounded-md bg-slate-50 p-4 text-sm font-semibold text-slate-600">
                    No organizations on this account yet.
                  </p>
                )}
              </InlineDropdown>
            )}
          </div>

          <div className="space-y-3">
            <CardShell
              body="Start a club, league, or multi-team organization from scratch."
              icon={<ShieldPlusIcon className="size-20" />}
              iconTone="green"
              isActive={activePanel === "create-organization"}
              onClick={() => togglePanel("create-organization")}
              title="Create New Organization"
            />
            {activePanel === "create-organization" && (
              <InlineDropdown>
                <form onSubmit={createOrganization}>
                  <h2 className="text-2xl font-bold">Create New Organization</h2>
                  <label className="mt-4 block">
                    <span className="text-sm font-semibold text-slate-600">
                      Organization name
                    </span>
                    <input
                      className="mt-2 w-full rounded-md border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500"
                      disabled={!canCreateOrganization || isSavingOrganization}
                      onChange={(event) => setOrganizationName(event.target.value)}
                      required
                      value={organizationName}
                    />
                  </label>
                  <button
                    className="mt-4 rounded-md bg-blue-600 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!canCreateOrganization || isSavingOrganization}
                    type="submit"
                  >
                    {isSavingOrganization ? "Creating..." : "Create organization"}
                  </button>
                  {organizationError && (
                    <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                      {organizationError}
                    </p>
                  )}
                  {!canCreateOrganization && (
                    <p className="mt-3 text-sm text-slate-500">
                      This account cannot create organizations.
                    </p>
                  )}
                </form>
              </InlineDropdown>
            )}
          </div>

          <div className="space-y-3">
            <CardShell
              body="Manage an existing single team workspace."
              icon={<GroupIcon className="size-20" />}
              iconTone="purple"
              isActive={activePanel === "select-team"}
              onClick={() => togglePanel("select-team")}
              title="Select Team"
            />
            {activePanel === "select-team" && (
              <InlineDropdown>
                <h2 className="text-2xl font-bold">Select Team</h2>
                {activeOrganizationId && (
                  <p className="mt-1 text-sm text-slate-500">
                    Open an existing team or create a new one in the selected
                    organization.
                  </p>
                )}
                {activeOrganizationTeams.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {activeOrganizationTeams.map((team) => (
                      <Link
                        className="block rounded-lg border border-slate-200 p-4 transition hover:border-violet-300 hover:bg-violet-50"
                        href={withActiveOrganization(
                          `/admin/teams/${team.id}`,
                          team.organizationId,
                        )}
                        key={`${team.organizationId}-${team.id}`}
                      >
                        <p className="font-bold">{team.name}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {team.organizationName}
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          {[team.division ?? team.label, team.season]
                            .filter(Boolean)
                            .join(" / ")}
                        </p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-md bg-slate-50 p-4 text-slate-600">
                    <p>No teams found for this organization yet.</p>
                  </div>
                )}

                {activeOrganizationId ? (
                  <form
                    className="mt-5 border-t border-slate-200 pt-5"
                    onSubmit={createTeam}
                  >
                    <h3 className="text-xl font-bold">Create Team</h3>
                    <div className="mt-4 space-y-3">
                      <label className="block">
                        <span className="text-sm font-semibold text-slate-600">
                          Team name
                        </span>
                        <input
                          className="mt-2 w-full rounded-md border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-violet-500"
                          disabled={isSavingTeam}
                          onChange={(event) => setTeamName(event.target.value)}
                          required
                          value={teamName}
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-semibold text-slate-600">
                          Division
                        </span>
                        <input
                          className="mt-2 w-full rounded-md border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-violet-500"
                          disabled={isSavingTeam}
                          onChange={(event) =>
                            setTeamDivision(event.target.value)
                          }
                          placeholder="10U, Varsity, Rec"
                          required
                          value={teamDivision}
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-semibold text-slate-600">
                          Season
                        </span>
                        <input
                          className="mt-2 w-full rounded-md border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-violet-500"
                          disabled={isSavingTeam}
                          onChange={(event) => setTeamSeason(event.target.value)}
                          required
                          value={teamSeason}
                        />
                      </label>
                    </div>
                    <button
                      className="mt-4 rounded-md bg-violet-600 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isSavingTeam}
                      type="submit"
                    >
                      {isSavingTeam ? "Creating..." : "Create team"}
                    </button>
                    {teamError && (
                      <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                        {teamError}
                      </p>
                    )}
                  </form>
                ) : (
                  <p className="mt-4 rounded-md bg-slate-50 p-4 text-slate-600">
                    Select an organization first, then create or open a team.
                  </p>
                )}
              </InlineDropdown>
            )}
          </div>

          <div className="space-y-3">
            <CardShell
              body="Start one team, create a registration link, and get parents signed up."
              icon={<WhistleIcon className="size-20" />}
              iconTone="orange"
              isActive={activePanel === "create-team-builder"}
              onClick={() => togglePanel("create-team-builder")}
              title="Create Team Builder"
            />
            {activePanel === "create-team-builder" && (
              <InlineDropdown>
                <form onSubmit={createTeamBuilder}>
                  <h2 className="text-2xl font-bold">Create Team Builder</h2>
                  <div className="mt-4 space-y-3">
                    <label className="block">
                      <span className="text-sm font-semibold text-slate-600">
                        Team name
                      </span>
                      <input
                        className="mt-2 w-full rounded-md border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-orange-500"
                        disabled={!canCreateOrganization || isSavingTeamBuilder}
                        onChange={(event) => setTeamBuilderName(event.target.value)}
                        required
                        value={teamBuilderName}
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-slate-600">
                        Division
                      </span>
                      <input
                        className="mt-2 w-full rounded-md border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-orange-500"
                        disabled={!canCreateOrganization || isSavingTeamBuilder}
                        onChange={(event) =>
                          setTeamBuilderDivision(event.target.value)
                        }
                        placeholder="10U, Varsity, Rec"
                        required
                        value={teamBuilderDivision}
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-slate-600">
                        Season
                      </span>
                      <input
                        className="mt-2 w-full rounded-md border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-orange-500"
                        disabled={!canCreateOrganization || isSavingTeamBuilder}
                        onChange={(event) =>
                          setTeamBuilderSeason(event.target.value)
                        }
                        required
                        value={teamBuilderSeason}
                      />
                    </label>
                  </div>
                  <button
                    className="mt-4 rounded-md bg-orange-500 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!canCreateOrganization || isSavingTeamBuilder}
                    type="submit"
                  >
                    {isSavingTeamBuilder ? "Creating..." : "Create Team Builder"}
                  </button>
                  {teamBuilderError && (
                    <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                      {teamBuilderError}
                    </p>
                  )}
                </form>
              </InlineDropdown>
            )}
          </div>
        </div>

        <footer className="pt-20 text-center">
          <p className="flex items-center justify-center gap-5 text-xl text-slate-500">
            <LockIcon className="size-7" />
            <span>Your access is based on your verified role and memberships.</span>
          </p>
          <a
            className="mt-8 inline-flex items-center gap-3 text-xl font-semibold text-blue-600"
            href="mailto:support@gameday.app"
          >
            Need help? Contact support
            <ExternalLinkIcon className="size-6" />
          </a>
        </footer>
      </section>
    </main>
  );
}
