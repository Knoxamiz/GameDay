import Link from "next/link";
import { withActiveOrganization } from "../data/activeOrganization";
import { summarizeAttendanceEntries } from "../data/attendance";
import type { AdminHomeReadModel } from "../data/adminHomeRead.server";
import type { AdminOperatingModel } from "../data/adminOperatingModel";
import { isActiveCoachAssignment } from "../data/coachAssignmentRecords";
import {
  eventHasTeamId,
  getEventDateLabel,
  getEventLocationLabel,
  getEventShortDateLabel,
  getEventStatusLabel,
  getEventTeamIds,
  getEventTimeLabel,
  isArchivedEvent,
  isUpcomingEvent,
  sortEventsByStartDate,
} from "../data/events";
import {
  getOrganizationWorkspaceType,
  getOrganizationWorkspaceTypeLabel,
  type Organization,
} from "../data/organizations";
import { isCoachVisibleRosterRegistration } from "../data/registrations";
import { getTeamStatusLabel, type Team } from "../data/teams";
import { summarizeTransportationEntries } from "../data/transportation";
import AdminAnnouncementForm from "./AdminAnnouncementForm";
import AdminArchiveButton from "./AdminArchiveButton";
import AdminEventForm from "./AdminEventForm";
import AdminEventLifecycleManager from "./AdminEventLifecycleManager";
import AdminOrgMembersManager from "./AdminOrgMembersManager";
import AdminTeamCreateForm from "./AdminTeamCreateForm";
import AdminTeamMembersManager from "./AdminTeamMembersManager";
import BackButton from "./BackButton";
import RegistrationInviteManager from "./RegistrationInviteManager";
import RegistrationReviewBoard from "./RegistrationReviewBoard";
import SessionControls from "./SessionControls";

type AdminOrganizationWorkspaceHomeProps = {
  accountLabel?: string;
  activeOrganizationId: string;
  currentSection?:
    | "alerts"
    | "announcements"
    | "overview"
    | "people"
    | "registration"
    | "schedule"
    | "teamDetails"
    | "teams";
  registrationReviewSource?: "empty" | "firestore";
  operatingModel: AdminOperatingModel;
  organizations: Organization[];
  readModel: AdminHomeReadModel;
  scheduleDefaultCreateOpen?: boolean;
  selectedTeamId?: string;
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
  { href: "/admin/people", icon: "people", label: "Org Members" },
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
  tone?: "blue" | "green" | "orange" | "red" | "slate";
}) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700",
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
  registrationReviewSource = "firestore",
  organizations,
  readModel,
  scheduleDefaultCreateOpen = false,
  selectedTeamId,
}: AdminOrganizationWorkspaceHomeProps) {
  const organization = readModel.organization;
  const displayName = getDisplayName(accountLabel);
  const workspaceTypeLabel = getOrganizationWorkspaceTypeLabel(organization);
  const isSingleTeamWorkspace =
    getOrganizationWorkspaceType(organization) === "single_team";
  const activeTeams = operatingModel.activeTeams;
  const visibleTeams = readModel.teams;
  const selectedTeam = selectedTeamId
    ? visibleTeams.find((team) => team.id === selectedTeamId)
    : undefined;
  const activeTeamIdSet = new Set(activeTeams.map((team) => team.id));
  const currentInvites = operatingModel.currentInvites.filter((invite) =>
    activeTeamIdSet.has(invite.teamId),
  );
  const activeCoachAssignments = readModel.coachAssignments.filter(
    isActiveCoachAssignment,
  );
  const recentAnnouncements = readModel.communications
    .filter((message) => message.type === "Organization Announcement")
    .slice()
    .sort((first, second) => second.timestamp.localeCompare(first.timestamp))
    .slice(0, 3);
  const alertItems = [
    activeTeams.length === 0
      ? {
          href: "/admin/teams#create-team",
          label: "Create the first active team.",
          tone: "red" as const,
        }
      : null,
    currentInvites.length === 0 && activeTeams.length > 0
      ? {
          href: "/admin/registrations",
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
        : currentSection === "people"
          ? "/admin/people"
          : currentSection === "registration"
            ? "/admin/registrations"
            : currentSection === "schedule"
              ? "/admin/schedule"
        : currentSection === "teams" || currentSection === "teamDetails"
          ? "/admin/teams"
          : "/admin";
  const backFallbackHref =
    currentSection === "teamDetails"
      ? withActiveOrganization("/admin/teams", activeOrganizationId)
      : currentSection === "overview" || currentSection === "teams"
      ? "/admin"
      : withActiveOrganization("/admin", activeOrganizationId);
  const pageTitle =
    currentSection === "teams"
      ? "Teams"
      : currentSection === "people"
        ? "Org Members"
        : currentSection === "registration"
          ? "Registration"
          : currentSection === "schedule"
            ? "Schedule"
      : currentSection === "teamDetails" && selectedTeam
        ? selectedTeam.name
        : organization.name;
  const pageSubtitle =
    currentSection === "teams"
      ? "Team workspaces"
      : currentSection === "people"
        ? "Permissions, titles, and points of contact"
        : currentSection === "registration"
          ? "Links, submitted players, and roster review"
          : currentSection === "schedule"
            ? "Create and manage real team events"
      : currentSection === "teamDetails"
        ? "Team workspace"
        : `${workspaceTypeLabel} Workspace`;

  function getTeamRosteredRegistrations(teamId: string) {
    return readModel.registrations
      .filter((registration) => registration.teamId === teamId)
      .filter(isCoachVisibleRosterRegistration);
  }

  function getCoachCount(team: Team) {
    const assignmentCoachIds = new Set(
      activeCoachAssignments
        .filter((assignment) => assignment.teamIds.includes(team.id))
        .map((assignment) => assignment.coachId),
    );

    return Math.max(team.coachIds.length, assignmentCoachIds.size);
  }

  function getNextTeamEvent(teamId: string) {
    return readModel.events
      .filter((event) => event.status !== "archived")
      .filter((event) => eventHasTeamId(event, teamId))
      .filter((event) => isUpcomingEvent(event))
      .sort(sortEventsByStartDate)[0];
  }

  const selectedTeamRosteredRegistrations = selectedTeam
    ? getTeamRosteredRegistrations(selectedTeam.id)
    : [];
  const selectedTeamCoachCount = selectedTeam ? getCoachCount(selectedTeam) : 0;
  const selectedTeamNextEvent = selectedTeam
    ? getNextTeamEvent(selectedTeam.id)
    : undefined;
  const visibleScheduleEvents = readModel.events
    .filter((event) => !isArchivedEvent(event))
    .slice()
    .sort(sortEventsByStartDate);
  const upcomingScheduleEvents = visibleScheduleEvents.filter((event) =>
    isUpcomingEvent(event),
  );
  const scheduleTeamMap = new Map(readModel.teams.map((team) => [team.id, team]));

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <div className="flex min-h-screen">
        <aside className="block w-14 shrink-0 border-r border-slate-200 bg-white lg:w-60">
          <div className="flex h-16 items-center justify-center gap-2 border-b border-slate-200 px-2 lg:justify-start lg:px-5">
            <Link
              aria-label="Back to Admin welcome"
              className="flex items-center gap-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              href="/admin"
              title="Back to Admin welcome"
            >
              <span className="flex size-8 items-center justify-center rounded-md bg-blue-600 text-sm font-black text-white">
                G
              </span>
              <span className="hidden font-black text-slate-950 lg:inline">
                GameDay
              </span>
            </Link>
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
          <header className="flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <BackButton fallbackHref={backFallbackHref} />
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
                {pageTitle}
              </h1>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {pageSubtitle}
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
            ) : currentSection === "registration" ? (
              <div className="mt-5 space-y-4">
                <RegistrationInviteManager
                  organizationId={activeOrganizationId}
                  registrationInvites={readModel.registrationInvites}
                  teams={readModel.teams}
                  workspaceType={getOrganizationWorkspaceType(organization)}
                />

                <section
                  className="scroll-mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                  id="review"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-2xl font-black">
                        Registered Players
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Review submitted players and move approved athletes onto
                        the roster.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusPill tone="orange">
                        {`${operatingModel.pendingRegistrations.length} pending`}
                      </StatusPill>
                      <StatusPill tone="blue">
                        {`${operatingModel.approvedNotRosteredRegistrations.length} ready`}
                      </StatusPill>
                      <StatusPill tone="green">
                        {`${operatingModel.rosteredRegistrations.length} rostered`}
                      </StatusPill>
                    </div>
                  </div>
                  <div className="scroll-mt-4" id="roster" />
                  <div className="scroll-mt-4" id="readiness" />
                  <RegistrationReviewBoard
                    activeOrganizationId={activeOrganizationId}
                    registrations={readModel.registrations}
                    source={registrationReviewSource}
                  />
                </section>
              </div>
            ) : currentSection === "schedule" ? (
              <div className="mt-5 space-y-4">
                <div className="flex justify-end">
                  <a
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50"
                    href={withActiveOrganization(
                      "/calendar.ics",
                      activeOrganizationId,
                    )}
                  >
                    Subscribe Calendar
                  </a>
                </div>

                <AdminEventForm
                  activeOrganizationId={activeOrganizationId}
                  canCreateEvents={Boolean(readModel.organizationExists)}
                  defaultOpen={
                    scheduleDefaultCreateOpen ||
                    upcomingScheduleEvents.length === 0
                  }
                  teams={readModel.teams}
                />

                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-2xl font-black">Upcoming Events</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Published, draft, and canceled events still ahead.
                      </p>
                    </div>
                    <StatusPill tone="blue">
                      {`${upcomingScheduleEvents.length} upcoming`}
                    </StatusPill>
                  </div>

                  <div className="mt-5 grid gap-3 lg:grid-cols-2">
                    {upcomingScheduleEvents.length === 0 ? (
                      <div className="lg:col-span-2">
                        <EmptyState>
                          No events are scheduled for this organization yet.
                        </EmptyState>
                      </div>
                    ) : (
                      upcomingScheduleEvents.map((event) => {
                        const eventTeams = getEventTeamIds(event)
                          .map((teamId) => scheduleTeamMap.get(teamId))
                          .filter(Boolean);
                        const attendance = summarizeAttendanceEntries(
                          event.id,
                          readModel.attendanceEntries.filter(
                            (entry) => entry.eventId === event.id,
                          ),
                        );
                        const transportation = summarizeTransportationEntries(
                          event.id,
                          readModel.transportationEntries.filter(
                            (entry) => entry.eventId === event.id,
                          ),
                        );
                        const hasTransportationIssue =
                          transportation.needsRide > 0;
                        const statusTone =
                          event.status === "canceled"
                            ? "red"
                            : event.status === "draft"
                              ? "orange"
                              : hasTransportationIssue
                                ? "red"
                                : "green";
                        const statusLabel =
                          event.status === "published" &&
                          hasTransportationIssue
                            ? "Ride Help"
                            : getEventStatusLabel(event);

                        return (
                          <Link
                            className="block rounded-lg border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50"
                            href={withActiveOrganization(
                              `/admin/schedule/${event.id}`,
                              activeOrganizationId,
                            )}
                            key={event.id}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs font-bold uppercase text-slate-500">
                                  {event.type}
                                </p>
                                <h3 className="mt-1 truncate text-lg font-black">
                                  {event.title}
                                </h3>
                              </div>
                              <StatusPill tone={statusTone}>
                                {statusLabel}
                              </StatusPill>
                            </div>

                            <p className="mt-2 truncate text-sm font-semibold text-slate-500">
                              {eventTeams.map((team) => team?.name).join(", ") ||
                                "Organization"}
                            </p>
                            <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                              <div className="rounded-md bg-slate-50 p-3">
                                <p className="font-black text-slate-900">
                                  {getEventDateLabel(event)}
                                </p>
                                <p className="mt-1">
                                  {getEventTimeLabel(event)}
                                </p>
                              </div>
                              <div className="rounded-md bg-slate-50 p-3">
                                <p className="font-black text-slate-900">
                                  {getEventLocationLabel(event)}
                                </p>
                                <p className="mt-1">
                                  {attendance.attending} attending ·{" "}
                                  {transportation.needsRide} need ride
                                </p>
                              </div>
                            </div>
                          </Link>
                        );
                      })
                    )}
                  </div>
                </section>

                <AdminEventLifecycleManager
                  activeOrganizationId={activeOrganizationId}
                  events={readModel.events}
                  teams={readModel.teams}
                />
              </div>
            ) : currentSection === "people" ? (
              <section className="mt-5">
                <AdminOrgMembersManager
                  activeOrganizationId={activeOrganizationId}
                  authority={readModel.organizationManagementAuthority}
                  memberships={readModel.organizationMemberships}
                />
              </section>
            ) : currentSection === "teams" ? (
              <div className="mt-5 space-y-4">
                <AdminTeamCreateForm
                  activeOrganizationId={activeOrganizationId}
                  defaultOpen={visibleTeams.length === 0}
                  disabledReason={
                    isSingleTeamWorkspace && visibleTeams.length > 0
                      ? "This Team Builder workspace already has its team."
                      : undefined
                  }
                />

                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-2xl font-black">Current Teams</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Open one team workspace.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {visibleTeams.length === 0 ? (
                      <EmptyState>No teams in this organization yet.</EmptyState>
                    ) : (
                      visibleTeams.map((team) => {
                        const rosteredCount = getTeamRosteredRegistrations(
                          team.id,
                        ).length;
                        const coachCount = getCoachCount(team);

                        return (
                          <div
                            className="flex flex-col gap-3 rounded-lg border border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                            key={team.id}
                          >
                            <Link
                              className="flex min-w-0 flex-1 flex-col gap-3 transition hover:text-blue-700 sm:flex-row sm:items-center sm:justify-between"
                              href={withActiveOrganization(
                                `/admin/teams/${team.id}`,
                                activeOrganizationId,
                              )}
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-base font-black">
                                  {team.name}
                                </span>
                                <span className="mt-1 block truncate text-xs text-slate-500">
                                  {getTeamLabel(team) || "Team workspace"}
                                </span>
                              </span>
                              <span className="hidden items-center gap-2 text-xs font-bold text-slate-500 sm:flex">
                                <span>{rosteredCount} rostered</span>
                                <span>{coachCount} coaches</span>
                              </span>
                              <span className="flex items-center gap-2">
                                <StatusPill
                                  tone={coachCount > 0 ? "green" : "orange"}
                                >
                                  {coachCount > 0
                                    ? getTeamStatusLabel(team)
                                    : "Needs coach"}
                                </StatusPill>
                                <span className="text-sm font-black text-blue-600">
                                  Open
                                </span>
                              </span>
                            </Link>
                            <AdminArchiveButton
                              buttonLabel="Remove"
                              confirmMessage={`Remove ${team.name}? This archives the team and preserves registrations, events, invites, and assignments.`}
                              payload={{
                                activeOrganizationId,
                                actionType: "team-archive",
                                organizationId: activeOrganizationId,
                                teamId: team.id,
                              }}
                              redirectHref={withActiveOrganization(
                                "/admin/teams",
                                activeOrganizationId,
                              )}
                            />
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>
              </div>
            ) : currentSection === "teamDetails" ? (
              <section className="mt-5">
                {!selectedTeam ? (
                  <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <EmptyState>Team not found in this organization.</EmptyState>
                  </section>
                ) : (
                  <div className="space-y-4">
                    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h2 className="text-2xl font-black">
                            {selectedTeam.name}
                          </h2>
                          <p className="mt-1 text-sm text-slate-500">
                            {getTeamLabel(selectedTeam) || "Team workspace"}
                          </p>
                        </div>
                        <StatusPill
                          tone={
                            selectedTeamCoachCount > 0 ? "green" : "orange"
                          }
                        >
                          {selectedTeamCoachCount > 0
                            ? getTeamStatusLabel(selectedTeam)
                            : "Needs coach"}
                        </StatusPill>
                      </div>
                      <div className="mt-4">
                        <AdminArchiveButton
                          buttonLabel="Remove team"
                          confirmMessage={`Remove ${selectedTeam.name}? This archives the team and preserves registrations, events, invites, and assignments.`}
                          payload={{
                            activeOrganizationId,
                            actionType: "team-archive",
                            organizationId: activeOrganizationId,
                            teamId: selectedTeam.id,
                          }}
                          redirectHref={withActiveOrganization(
                            "/admin/teams",
                            activeOrganizationId,
                          )}
                        />
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-md bg-slate-50 p-3">
                          <p className="text-xs font-bold uppercase text-slate-500">
                            Rostered
                          </p>
                          <p className="mt-1 text-2xl font-black">
                            {selectedTeamRosteredRegistrations.length}
                          </p>
                        </div>
                        <div className="rounded-md bg-slate-50 p-3">
                          <p className="text-xs font-bold uppercase text-slate-500">
                            Coaches
                          </p>
                          <p className="mt-1 text-2xl font-black">
                            {selectedTeamCoachCount}
                          </p>
                        </div>
                        <div className="rounded-md bg-slate-50 p-3">
                          <p className="text-xs font-bold uppercase text-slate-500">
                            Next Event
                          </p>
                          <p className="mt-1 truncate text-sm font-black">
                            {selectedTeamNextEvent?.title ?? "None scheduled"}
                          </p>
                        </div>
                      </div>
                    </section>

                    <div className="space-y-3">
                      <AdminTeamMembersManager
                        activeOrganizationId={activeOrganizationId}
                        coachAssignments={readModel.coachAssignments}
                        coaches={readModel.coaches}
                        rosteredRegistrations={selectedTeamRosteredRegistrations}
                        teamId={selectedTeam.id}
                      />
                      <details className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
                          <span>
                            <span className="block text-lg font-black text-slate-950">
                              Next Event
                            </span>
                            <span className="mt-1 block text-sm text-slate-500">
                              {selectedTeamNextEvent
                                ? selectedTeamNextEvent.title
                                : "None scheduled"}
                            </span>
                          </span>
                          <span className="text-2xl font-black text-blue-600 transition group-open:rotate-90">
                            &rsaquo;
                          </span>
                        </summary>
                        <div className="border-t border-slate-200 p-4">
                          {selectedTeamNextEvent ? (
                            <Link
                              className="block rounded-md border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50"
                              href={withActiveOrganization(
                                `/admin/schedule/${selectedTeamNextEvent.id}`,
                                activeOrganizationId,
                              )}
                            >
                              <p className="font-black">
                                {selectedTeamNextEvent.title}
                              </p>
                              <p className="mt-2 text-sm text-slate-500">
                                {getEventShortDateLabel(
                                  selectedTeamNextEvent,
                                )}{" "}
                                {getEventTimeLabel(
                                  selectedTeamNextEvent,
                                )}
                              </p>
                            </Link>
                          ) : (
                            <EmptyState>No upcoming event.</EmptyState>
                          )}
                        </div>
                      </details>
                    </div>
                  </div>
                )}
              </section>
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
                    "/admin/teams#create-team",
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
