import Link from "next/link";
import {
  getEventShortDateLabel,
  getEventTimeLabel,
  isPublishedEvent,
  isUpcomingEvent,
  sortEventsByStartDate,
} from "../data/events";
import { withActiveOrganization } from "../data/activeOrganization";
import type { AdminHomeReadModel } from "../data/adminHomeRead.server";
import type { AdminOperatingModel } from "../data/adminOperatingModel";
import type { AdminSetupChecklistModel } from "../data/adminSetupChecklist";
import { isActiveCoachAssignment } from "../data/coachAssignmentRecords";
import {
  getOrganizationWorkspaceTypeLabel,
  type Organization,
} from "../data/organizations";
import { getRegistrationRosterStatus } from "../data/registrations";
import type { Team } from "../data/teams";
import AdminJoinLinkButton from "./AdminJoinLinkButton";
import SessionControls from "./SessionControls";

type AdminOrganizationWorkspaceHomeProps = {
  accountLabel?: string;
  activeOrganizationId: string;
  operatingModel: AdminOperatingModel;
  organizations: Organization[];
  readModel: AdminHomeReadModel;
  setupChecklist: AdminSetupChecklistModel;
};

type WorkspaceIconName =
  | "alert"
  | "calendar"
  | "clipboard"
  | "home"
  | "people"
  | "settings"
  | "team";

const sidebarItems: {
  href: string;
  icon: WorkspaceIconName;
  label: string;
}[] = [
  { href: "/admin", icon: "home", label: "Overview" },
  { href: "/admin/teams", icon: "team", label: "Teams" },
  { href: "/admin/setup#members", icon: "people", label: "People" },
  {
    href: "/admin/registrations",
    icon: "clipboard",
    label: "Registrations",
  },
  { href: "/admin/schedule", icon: "calendar", label: "Schedule" },
  { href: "/admin/setup", icon: "settings", label: "Settings" },
];

function getDisplayName(accountLabel?: string) {
  if (!accountLabel) {
    return "Admin";
  }

  return accountLabel.split("@")[0] || "Admin";
}

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "A";
}

function getTeamLabel(team: Team) {
  return [team.division, team.season].filter(Boolean).join(" / ");
}

function WorkspaceIcon({
  className = "size-5",
  name,
}: {
  className?: string;
  name: WorkspaceIconName;
}) {
  const commonProps = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
    viewBox: "0 0 24 24",
  };

  if (name === "calendar") {
    return (
      <svg {...commonProps}>
        <path d="M8 2v4M16 2v4M3 10h18" />
        <rect height="18" rx="2" width="18" x="3" y="4" />
      </svg>
    );
  }

  if (name === "clipboard") {
    return (
      <svg {...commonProps}>
        <path d="M9 4h6" />
        <path d="M9 2h6v4H9z" />
        <path d="M7 4H5a2 2 0 0 0-2 2v14h18V6a2 2 0 0 0-2-2h-2" />
        <path d="M8 12h8M8 16h5" />
      </svg>
    );
  }

  if (name === "people") {
    return (
      <svg {...commonProps}>
        <path d="M16 21v-2a4 4 0 0 0-8 0v2" />
        <circle cx="12" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M2 21v-2a4 4 0 0 1 3-3.87" />
      </svg>
    );
  }

  if (name === "settings") {
    return (
      <svg {...commonProps}>
        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
        <path d="m19 12 2-1-2-3-2 1a7 7 0 0 0-2-1V5h-6v3a7 7 0 0 0-2 1L5 8l-2 3 2 1a7 7 0 0 0 0 2l-2 1 2 3 2-1a7 7 0 0 0 2 1v3h6v-3a7 7 0 0 0 2-1l2 1 2-3-2-1a7 7 0 0 0 0-2Z" />
      </svg>
    );
  }

  if (name === "team") {
    return (
      <svg {...commonProps}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M21 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }

  if (name === "alert") {
    return (
      <svg {...commonProps}>
        <path d="m12 3 10 18H2L12 3Z" />
        <path d="M12 9v5M12 18h.01" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

function ShellLink({
  active = false,
  href,
  icon,
  label,
  organizationId,
}: {
  active?: boolean;
  href: string;
  icon: WorkspaceIconName;
  label: string;
  organizationId: string;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold ${
        active
          ? "bg-blue-50 text-blue-700"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
      href={withActiveOrganization(href, organizationId)}
    >
      <WorkspaceIcon className="size-4" name={icon} />
      {label}
    </Link>
  );
}

function SettingsLink({
  description,
  href,
  icon,
  label,
  organizationId,
}: {
  description: string;
  href: string;
  icon: WorkspaceIconName;
  label: string;
  organizationId: string;
}) {
  return (
    <Link
      className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50"
      href={withActiveOrganization(href, organizationId)}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600">
          <WorkspaceIcon className="size-4" name={icon} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold text-slate-900">
            {label}
          </span>
          <span className="mt-0.5 block truncate text-xs text-slate-500">
            {description}
          </span>
        </span>
      </span>
      <span className="text-blue-500">›</span>
    </Link>
  );
}

function StatusPill({
  children,
  tone = "green",
}: {
  children: string;
  tone?: "green" | "orange" | "red" | "slate";
}) {
  const toneClass = {
    green: "bg-emerald-50 text-emerald-700",
    orange: "bg-orange-50 text-orange-700",
    red: "bg-red-50 text-red-700",
    slate: "bg-slate-100 text-slate-600",
  }[tone];

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${toneClass}`}>
      {children}
    </span>
  );
}

function EmptyState({ children }: { children: string }) {
  return (
    <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
      {children}
    </p>
  );
}

export default function AdminOrganizationWorkspaceHome({
  accountLabel,
  activeOrganizationId,
  operatingModel,
  organizations,
  readModel,
  setupChecklist,
}: AdminOrganizationWorkspaceHomeProps) {
  const organization = readModel.organization;
  const displayName = getDisplayName(accountLabel);
  const workspaceTypeLabel = getOrganizationWorkspaceTypeLabel(organization);
  const activeTeams = operatingModel.activeTeams;
  const activeAssignments = readModel.coachAssignments.filter(
    isActiveCoachAssignment,
  );
  const upcomingPublishedEvents = readModel.events
    .filter(isPublishedEvent)
    .filter((event) => isUpcomingEvent(event))
    .sort(sortEventsByStartDate)
    .slice(0, 3);
  const activeTeamIdSet = new Set(activeTeams.map((team) => team.id));
  const currentInvites = operatingModel.currentInvites.filter((invite) =>
    activeTeamIdSet.has(invite.teamId),
  );
  const recentAnnouncements = readModel.communications.slice(0, 3);
  const alertItems = [
    activeTeams.length === 0
      ? {
          href: "/admin/setup#team",
          label: "Create the first active team.",
          tone: "red" as const,
        }
      : null,
    currentInvites.length === 0 && activeTeams.length > 0
      ? {
          href: "/admin/setup#registration-invites",
          label: "Create a registration invite or link.",
          tone: "orange" as const,
        }
      : null,
    operatingModel.pendingRegistrations.length > 0
      ? {
          href: "/admin/registrations#review",
          label: `${operatingModel.pendingRegistrations.length} registration needs review.`,
          tone: "red" as const,
        }
      : null,
    operatingModel.teamsNeedingCoaches.length > 0
      ? {
          href: "/admin/setup#coach-assignments",
          label: `${operatingModel.teamsNeedingCoaches.length} team needs a coach assignment.`,
          tone: "orange" as const,
        }
      : null,
    operatingModel.rosteredTeamsWithoutEvents.length > 0
      ? {
          href: "/admin/schedule?action=create-event#create-event",
          label: `${operatingModel.rosteredTeamsWithoutEvents.length} rostered team needs a published event.`,
          tone: "slate" as const,
        }
      : null,
    operatingModel.readinessIssueCount > 0
      ? {
          href: "/admin/registrations#readiness",
          label: `${operatingModel.readinessIssueCount} registration item needs attention.`,
          tone: "orange" as const,
        }
      : null,
  ].filter(
    (
      item,
    ): item is {
      href: string;
      label: string;
      tone: "orange" | "red" | "slate";
    } => Boolean(item),
  );
  const nextRequiredStep = setupChecklist.nextRequiredStep;

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <div className="flex min-h-screen">
        <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white lg:block">
          <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5">
            <span className="flex size-8 items-center justify-center rounded-md bg-blue-600 text-sm font-black text-white">
              G
            </span>
            <span className="font-black text-slate-950">GameDay</span>
          </div>
          <nav className="space-y-1 px-3 py-5">
            {sidebarItems.map((item) => (
              <ShellLink
                active={item.href === "/admin"}
                href={item.href}
                icon={item.icon}
                key={item.label}
                label={item.label}
                organizationId={activeOrganizationId}
              />
            ))}
          </nav>
          <div className="absolute bottom-4 hidden px-3 lg:block">
            <Link
              className="rounded-md px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100"
              href="/admin"
            >
              Switch workspace
            </Link>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-500">
                Organizations / {organization.name}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {organizations.length > 1 && (
                <Link
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  href="/admin"
                >
                  Switch
                </Link>
              )}
              <SessionControls compact role="admin" />
              <div className="hidden items-center gap-3 sm:flex">
                <span className="flex size-9 items-center justify-center rounded-full bg-blue-100 text-sm font-black text-blue-700">
                  {getInitial(displayName)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">
                    {displayName}
                  </span>
                  <span className="block text-xs text-slate-500">Admin</span>
                </span>
              </div>
            </div>
          </header>

          <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
            <div>
              <h1 className="text-3xl font-black tracking-tight">
                {organization.name}
              </h1>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {workspaceTypeLabel} Workspace
              </p>
            </div>

            <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <span className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <WorkspaceIcon className="size-8" name="home" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase text-slate-500">
                      Current Workspace
                    </p>
                    <h2 className="truncate text-2xl font-black">
                      {organization.name}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Manage teams, people, registration, and schedule for this
                      workspace.
                    </p>
                  </div>
                </div>
                <Link
                  className="rounded-md border border-slate-200 px-4 py-2.5 text-center text-sm font-bold text-blue-600 hover:bg-blue-50"
                  href={withActiveOrganization(
                    "/admin/setup#organization",
                    activeOrganizationId,
                  )}
                >
                  View organization profile
                </Link>
              </div>
            </section>

            <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black">Organization Settings</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Manage setup and configuration.
                    </p>
                  </div>
                  {nextRequiredStep?.actionHref && (
                    <Link
                      className="rounded-md bg-blue-600 px-3 py-2 text-sm font-bold text-white"
                      href={withActiveOrganization(
                        nextRequiredStep.actionHref,
                        activeOrganizationId,
                      )}
                    >
                      {nextRequiredStep.actionLabel ?? "Continue setup"}
                    </Link>
                  )}
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <SettingsLink
                    description="Name and workspace profile"
                    href="/admin/setup#organization"
                    icon="settings"
                    label="Edit Organization"
                    organizationId={activeOrganizationId}
                  />
                  <SettingsLink
                    description={`${currentInvites.length} current invite${currentInvites.length === 1 ? "" : "s"}`}
                    href="/admin/setup#registration-invites"
                    icon="clipboard"
                    label="Registration Settings"
                    organizationId={activeOrganizationId}
                  />
                  <SettingsLink
                    description={`${activeAssignments.length} active assignment${activeAssignments.length === 1 ? "" : "s"}`}
                    href="/admin/setup#members"
                    icon="people"
                    label="Staff & Roles"
                    organizationId={activeOrganizationId}
                  />
                  <SettingsLink
                    description={`${upcomingPublishedEvents.length} upcoming published event${upcomingPublishedEvents.length === 1 ? "" : "s"}`}
                    href="/admin/schedule"
                    icon="calendar"
                    label="Schedule"
                    organizationId={activeOrganizationId}
                  />
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black">Current Teams</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Teams in this organization.
                    </p>
                  </div>
                  <Link
                    className="text-sm font-bold text-blue-600"
                    href={withActiveOrganization(
                      "/admin/teams",
                      activeOrganizationId,
                    )}
                  >
                    View all teams ›
                  </Link>
                </div>
                <div className="mt-4 space-y-3">
                  {activeTeams.length === 0 ? (
                    <EmptyState>No active teams in this organization yet.</EmptyState>
                  ) : (
                    activeTeams.slice(0, 5).map((team) => (
                      <Link
                        className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-3 hover:bg-slate-50"
                        href={withActiveOrganization(
                          `/admin/teams/${team.id}`,
                          activeOrganizationId,
                        )}
                        key={team.id}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-black">
                            {team.name}
                          </span>
                          <span className="mt-1 block truncate text-xs text-slate-500">
                            {getTeamLabel(team) || "Team workspace"} ·{" "}
                            {team.playerCount} members
                          </span>
                        </span>
                        <StatusPill tone="green">Active</StatusPill>
                      </Link>
                    ))
                  )}
                </div>
                <Link
                  className="mt-4 inline-flex rounded-md px-2 py-1 text-sm font-bold text-blue-600 hover:bg-blue-50"
                  href={withActiveOrganization(
                    "/admin/setup#team",
                    activeOrganizationId,
                  )}
                >
                  + Create new team
                </Link>
              </section>
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black">Announcements</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Real communications for this organization.
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {recentAnnouncements.length === 0 ? (
                    <EmptyState>
                      No announcements have been created for this organization.
                    </EmptyState>
                  ) : (
                    recentAnnouncements.map((message) => (
                      <div
                        className="rounded-md border border-slate-200 px-3 py-3"
                        key={message.id}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black">
                              {message.subject}
                            </p>
                            <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                              {message.content}
                            </p>
                          </div>
                          <StatusPill tone="slate">{message.priority}</StatusPill>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black">Alerts</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Items that need your attention.
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {alertItems.length === 0 ? (
                    <EmptyState>No active alerts for this organization.</EmptyState>
                  ) : (
                    alertItems.map((item) => (
                      <Link
                        className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-3 hover:bg-slate-50"
                        href={withActiveOrganization(
                          item.href,
                          activeOrganizationId,
                        )}
                        key={item.label}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span
                            className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                              item.tone === "red"
                                ? "bg-red-50 text-red-600"
                                : item.tone === "orange"
                                  ? "bg-orange-50 text-orange-600"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            <WorkspaceIcon className="size-4" name="alert" />
                          </span>
                          <span className="truncate text-sm font-bold">
                            {item.label}
                          </span>
                        </span>
                        <StatusPill tone={item.tone}>Open</StatusPill>
                      </Link>
                    ))
                  )}
                </div>
              </section>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-3">
              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Registration
                </p>
                <p className="mt-2 text-3xl font-black">
                  {readModel.registrations.length}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {operatingModel.pendingRegistrations.length} pending review ·{" "}
                  {operatingModel.rosteredRegistrations.length} rostered
                </p>
                {operatingModel.openInvites[0]?.inviteCode ? (
                  <AdminJoinLinkButton
                    className="mt-4 rounded-md bg-blue-600 px-3 py-2 text-sm font-bold text-white"
                    joinPath={`/join/${operatingModel.openInvites[0].inviteCode}`}
                  />
                ) : (
                  <Link
                    className="mt-4 inline-flex rounded-md bg-blue-600 px-3 py-2 text-sm font-bold text-white"
                    href={withActiveOrganization(
                      "/admin/setup#registration-invites",
                      activeOrganizationId,
                    )}
                  >
                    Create invite
                  </Link>
                )}
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Next Event
                </p>
                {upcomingPublishedEvents[0] ? (
                  <>
                    <p className="mt-2 text-lg font-black">
                      {upcomingPublishedEvents[0].title}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {getEventShortDateLabel(upcomingPublishedEvents[0])} ·{" "}
                      {getEventTimeLabel(upcomingPublishedEvents[0])}
                    </p>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    No upcoming published events.
                  </p>
                )}
                <Link
                  className="mt-4 inline-flex rounded-md bg-blue-600 px-3 py-2 text-sm font-bold text-white"
                  href={withActiveOrganization(
                    "/admin/schedule",
                    activeOrganizationId,
                  )}
                >
                  Open schedule
                </Link>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Roster Status
                </p>
                <p className="mt-2 text-3xl font-black">
                  {
                    readModel.registrations.filter(
                      (registration) =>
                        getRegistrationRosterStatus(registration) === "rostered",
                    ).length
                  }
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  active roster records
                </p>
                <Link
                  className="mt-4 inline-flex rounded-md bg-blue-600 px-3 py-2 text-sm font-bold text-white"
                  href={withActiveOrganization(
                    "/admin/registrations",
                    activeOrganizationId,
                  )}
                >
                  Review roster
                </Link>
              </section>
            </div>

            <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black">Readiness</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {operatingModel.stageDescription}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone="slate">{operatingModel.stageLabel}</StatusPill>
                  {setupChecklist.steps.map((step) => (
                    <span
                      className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600"
                      key={step.id}
                    >
                      {step.label}: {step.count}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          </section>
        </div>
      </div>
    </main>
  );
}
