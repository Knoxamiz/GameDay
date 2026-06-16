import Link from "next/link";
import { withActiveOrganization } from "../data/activeOrganization";
import type { AdminHomeReadModel } from "../data/adminHomeRead.server";
import type { AdminOperatingModel } from "../data/adminOperatingModel";
import {
  getOrganizationWorkspaceTypeLabel,
  type Organization,
} from "../data/organizations";
import type { Team } from "../data/teams";
import AdminAnnouncementForm from "./AdminAnnouncementForm";
import SessionControls from "./SessionControls";

type AdminOrganizationWorkspaceHomeProps = {
  accountLabel?: string;
  activeOrganizationId: string;
  currentSection?: "alerts" | "announcements" | "overview";
  operatingModel: AdminOperatingModel;
  organizations: Organization[];
  readModel: AdminHomeReadModel;
};

type WorkspaceIconName =
  | "alert"
  | "calendar"
  | "clipboard"
  | "home"
  | "message"
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
  {
    href: "/admin/announcements",
    icon: "message",
    label: "Announcements",
  },
  { href: "/admin/alerts", icon: "alert", label: "Alerts" },
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

  if (name === "message") {
    return (
      <svg {...commonProps}>
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
        <path d="M8 9h8M8 13h5" />
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
      className={`flex items-center justify-center gap-0 rounded-md px-3 py-2.5 text-sm font-semibold lg:justify-start lg:gap-3 ${
        active
          ? "bg-blue-50 text-blue-700"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
      href={withActiveOrganization(href, organizationId)}
    >
      <WorkspaceIcon className="size-4" name={icon} />
      <span className="hidden lg:inline">{label}</span>
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
  currentSection = "overview",
  operatingModel,
  organizations,
  readModel,
}: AdminOrganizationWorkspaceHomeProps) {
  const organization = readModel.organization;
  const displayName = getDisplayName(accountLabel);
  const workspaceTypeLabel = getOrganizationWorkspaceTypeLabel(organization);
  const activeTeams = operatingModel.activeTeams;
  const activeTeamIdSet = new Set(activeTeams.map((team) => team.id));
  const currentInvites = operatingModel.currentInvites.filter((invite) =>
    activeTeamIdSet.has(invite.teamId),
  );
  const recentAnnouncements = readModel.communications
    .filter((message) => message.type === "Organization Announcement")
    .slice()
    .sort((first, second) => second.timestamp.localeCompare(first.timestamp))
    .slice(0, 3);
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
  const activeSectionHref =
    currentSection === "alerts"
      ? "/admin/alerts"
      : currentSection === "announcements"
        ? "/admin/announcements"
        : "/admin";

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <div className="flex min-h-screen">
        <aside className="block w-14 shrink-0 border-r border-slate-200 bg-white lg:w-60">
          <div className="flex h-16 items-center justify-center gap-2 border-b border-slate-200 px-2 lg:justify-start lg:px-5">
            <span className="flex size-8 items-center justify-center rounded-md bg-blue-600 text-sm font-black text-white">
              G
            </span>
            <span className="hidden font-black text-slate-950 lg:inline">
              GameDay
            </span>
          </div>
          <nav className="space-y-1 px-2 py-5 lg:px-3">
            {sidebarItems.map((item) => (
              <ShellLink
                active={item.href === activeSectionHref}
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

            {currentSection === "overview" && (
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-lg font-black">Announcements</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        New announcements and organization updates.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill tone="slate">
                        {`${recentAnnouncements.length} new`}
                      </StatusPill>
                      <Link
                        className="rounded-md bg-blue-600 px-3 py-2 text-sm font-black text-white hover:bg-blue-700"
                        href={withActiveOrganization(
                          "/admin/announcements?action=create#create-announcement",
                          activeOrganizationId,
                        )}
                      >
                        Create Announcement +
                      </Link>
                    </div>
                  </div>
                  <div className="mt-3">
                    {recentAnnouncements[0] ? (
                      <div>
                        <p className="truncate text-sm font-black">
                          {recentAnnouncements[0].subject}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                          {recentAnnouncements[0].content}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">
                        No announcements have been created for this organization.
                      </p>
                    )}
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-black">Alerts</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Items that need attention.
                      </p>
                    </div>
                    <Link
                      className="text-sm font-bold text-blue-600"
                      href={withActiveOrganization(
                        "/admin/alerts",
                        activeOrganizationId,
                      )}
                    >
                      View all ›
                    </Link>
                  </div>
                  <div className="mt-3">
                    {alertItems[0] ? (
                      <Link
                        className="flex items-center justify-between gap-3 rounded-md bg-orange-50 px-3 py-2 text-sm font-bold text-orange-800"
                        href={withActiveOrganization(
                          alertItems[0].href,
                          activeOrganizationId,
                        )}
                      >
                        <span className="truncate">{alertItems[0].label}</span>
                        <span>Open</span>
                      </Link>
                    ) : (
                      <p className="text-sm text-slate-500">
                        No active alerts for this organization.
                      </p>
                    )}
                  </div>
                </section>
              </div>
            )}

            {currentSection === "alerts" ? (
              <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-black">Alerts</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Each alert opens the exact place where the issue can be
                      fixed or reviewed.
                    </p>
                  </div>
                  <StatusPill tone={alertItems.length > 0 ? "orange" : "green"}>
                    {`${alertItems.length} open`}
                  </StatusPill>
                </div>
                <div className="mt-5 space-y-3">
                  {alertItems.length === 0 ? (
                    <EmptyState>No active alerts for this organization.</EmptyState>
                  ) : (
                    alertItems.map((item) => (
                      <Link
                        className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-4 transition hover:border-blue-200 hover:bg-blue-50"
                        href={withActiveOrganization(
                          item.href,
                          activeOrganizationId,
                        )}
                        key={item.label}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span
                            className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                              item.tone === "red"
                                ? "bg-red-50 text-red-600"
                                : item.tone === "orange"
                                  ? "bg-orange-50 text-orange-600"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            <WorkspaceIcon className="size-5" name="alert" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-base font-black">
                              {item.label}
                            </span>
                            <span className="mt-1 block text-sm text-slate-500">
                              Open the related workflow.
                            </span>
                          </span>
                        </span>
                        <StatusPill tone={item.tone}>Open</StatusPill>
                      </Link>
                    ))
                  )}
                </div>
              </section>
            ) : currentSection === "announcements" ? (
              <div className="mt-5 space-y-4">
                <AdminAnnouncementForm
                  activeOrganizationId={activeOrganizationId}
                />

                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div>
                    <h2 className="text-2xl font-black">Announcements</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Recent organization updates.
                    </p>
                  </div>

                  <div className="mt-4 space-y-3">
                    {recentAnnouncements.length > 0 ? (
                      recentAnnouncements.map((announcement) => (
                        <article
                          className="rounded-md border border-slate-200 bg-slate-50 p-3"
                          key={announcement.id}
                        >
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                            <h3 className="text-sm font-black">
                              {announcement.subject}
                            </h3>
                            <time className="text-xs font-semibold text-slate-500">
                              {new Date(
                                announcement.timestamp,
                              ).toLocaleDateString()}
                            </time>
                          </div>
                          <p className="mt-2 text-sm text-slate-600">
                            {announcement.content}
                          </p>
                        </article>
                      ))
                    ) : (
                      <EmptyState>
                        No announcements have been created for this organization.
                      </EmptyState>
                    )}
                  </div>
                </section>
              </div>
            ) : (
            <>
              <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black">Current Teams</h2>
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
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {activeTeams.length === 0 ? (
                    <EmptyState>No active teams in this organization yet.</EmptyState>
                  ) : (
                    activeTeams.slice(0, 6).map((team) => (
                      <Link
                        className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-4 py-4 hover:bg-slate-50"
                        href={withActiveOrganization(
                          `/admin/teams/${team.id}`,
                          activeOrganizationId,
                        )}
                        key={team.id}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-base font-black">
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
            </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
