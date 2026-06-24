import Link from "next/link";
import { withActiveOrganization } from "../data/activeOrganization";
import { summarizeAttendanceEntries } from "../data/attendance";
import type { AdminHomeReadModel } from "../data/adminHomeRead.server";
import type { AdminOperatingModel } from "../data/adminOperatingModel";
import { isActiveCoachAssignment } from "../data/coachAssignmentRecords";
import {
  getEventDateLabel,
  getEventLocationLabel,
  getEventStatusLabel,
  getEventTeamIds,
  getEventTimeLabel,
  isArchivedEvent,
  isUpcomingEvent,
  sortEventsByStartDate,
} from "../data/events";
import {
  getRegistrationInviteStatus,
  type RegistrationInvite,
} from "../data/invites";
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
import AdminJoinLinkButton from "./AdminJoinLinkButton";
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
    label: "Messages",
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

function getInviteJoinPath(invite: RegistrationInvite) {
  return invite.inviteUrl || `/join/${invite.inviteCode}`;
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
      className={`flex items-center justify-center gap-0 rounded-lg px-2.5 py-2 text-xs font-bold lg:justify-start lg:gap-2.5 ${
        active
          ? "bg-blue-600 text-white shadow-[0_0_24px_rgba(37,99,235,0.22)]"
          : "text-slate-300 hover:bg-white/10 hover:text-white"
      }`}
      href={withActiveOrganization(href, organizationId)}
    >
      <WorkspaceIcon className="size-3.5" name={icon} />
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
    blue: "bg-blue-500/15 text-blue-100 ring-1 ring-blue-300/20",
    green: "bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-300/20",
    orange: "bg-orange-500/15 text-orange-100 ring-1 ring-orange-300/20",
    red: "bg-red-500/15 text-red-100 ring-1 ring-red-300/20",
    slate: "bg-white/10 text-slate-200 ring-1 ring-white/10",
  }[tone];

  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${toneClass}`}>
      {children}
    </span>
  );
}

function EmptyState({ children }: { children: string }) {
  return (
    <p className="rounded-md border border-dashed border-white/15 bg-white/[0.04] p-3 text-sm font-semibold text-slate-400">
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
  const recentCommunications = readModel.communications
    .filter(
      (message) =>
        message.type === "Organization Announcement" ||
        message.type === "Team Announcement",
    )
    .slice()
    .sort((first, second) => second.timestamp.localeCompare(first.timestamp))
    .slice(0, 5);
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
            : currentSection === "announcements"
              ? "Messages"
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
            : currentSection === "announcements"
              ? "Organization and team communication"
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

  const selectedTeamRosteredRegistrations = selectedTeam
    ? getTeamRosteredRegistrations(selectedTeam.id)
    : [];
  const selectedTeamCoachCount = selectedTeam ? getCoachCount(selectedTeam) : 0;
  const selectedTeamInvites = selectedTeam
    ? readModel.registrationInvites
        .filter((invite) => invite.teamId === selectedTeam.id)
        .filter((invite) => getRegistrationInviteStatus(invite) !== "archived")
    : [];
  const selectedTeamOpenInvite = selectedTeamInvites.find(
    (invite) => getRegistrationInviteStatus(invite) === "open",
  );
  const selectedTeamPrimaryInvite =
    selectedTeamOpenInvite ?? selectedTeamInvites[0];
  const selectedTeamJoinPath = selectedTeamPrimaryInvite
    ? getInviteJoinPath(selectedTeamPrimaryInvite)
    : undefined;
  const visibleScheduleEvents = readModel.events
    .filter((event) => !isArchivedEvent(event))
    .slice()
    .sort(sortEventsByStartDate);
  const upcomingScheduleEvents = visibleScheduleEvents.filter((event) =>
    isUpcomingEvent(event),
  );
  const scheduleTeamMap = new Map(readModel.teams.map((team) => [team.id, team]));
  const presidentAttentionItem = alertItems[0];
  const organizationHealthTone =
    alertItems.some((item) => item.tone === "red")
      ? "red"
      : alertItems.length > 0
        ? "orange"
        : "green";
  const organizationHealthLabel =
    organizationHealthTone === "green"
      ? "Healthy"
      : organizationHealthTone === "red"
        ? "Urgent"
        : "Needs attention";
  const pulseItems = [
    {
      label: "Active teams",
      tone: activeTeams.length > 0 ? "blue" : "orange",
      value: activeTeams.length,
    },
    {
      label: "Players",
      tone: readModel.registrations.length > 0 ? "green" : "slate",
      value: readModel.registrations.length,
    },
    {
      label: "Need coaches",
      tone:
        operatingModel.teamsNeedingCoaches.length > 0 ? "orange" : "green",
      value: operatingModel.teamsNeedingCoaches.length,
    },
    {
      label: "Upcoming",
      tone: upcomingScheduleEvents.length > 0 ? "blue" : "slate",
      value: upcomingScheduleEvents.length,
    },
    {
      label: "Pending review",
      tone:
        operatingModel.pendingRegistrations.length > 0 ? "orange" : "green",
      value: operatingModel.pendingRegistrations.length,
    },
    {
      label: "Open items",
      tone: operatingModel.readinessIssueCount > 0 ? "orange" : "green",
      value: operatingModel.readinessIssueCount,
    },
    {
      label: "Messages",
      tone: recentCommunications.length > 0 ? "blue" : "slate",
      value: recentCommunications.length,
    },
  ] satisfies {
    label: string;
    tone: "blue" | "green" | "orange" | "slate";
    value: number;
  }[];
  const isFirstRunOrganization = activeTeams.length === 0;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020817] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_84%_12%,rgba(37,99,235,0.26),transparent_30%),linear-gradient(115deg,#020817_0%,#061431_58%,#0b2447_100%)]" />
      <div className="flex min-h-screen">
        <aside className="relative z-10 block w-12 shrink-0 border-r border-white/10 bg-slate-950/70 backdrop-blur lg:w-52">
          <div className="flex h-14 items-center justify-center gap-2 border-b border-white/10 px-2 lg:justify-start lg:px-4">
            <Link
              aria-label="Back to Admin welcome"
              className="flex items-center gap-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
              href="/admin"
              title="Back to Admin welcome"
            >
              <span className="flex size-7 items-center justify-center rounded-md bg-blue-600 text-xs font-black text-white shadow-[0_0_24px_rgba(37,99,235,0.35)]">
                G
              </span>
              <span className="hidden font-black text-white lg:inline">
                GameDay
              </span>
            </Link>
          </div>
          <nav className="space-y-1 px-1.5 py-3 lg:px-2.5">
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
              className="rounded-md px-2.5 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white"
              href="/admin"
            >
              Switch workspace
            </Link>
          </div>
        </aside>

        <div className="relative z-10 min-w-0 flex-1">
          <header className="relative z-[120] flex min-h-12 items-center justify-between gap-2 border-b border-white/10 bg-slate-950/55 px-3 backdrop-blur sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <BackButton fallbackHref={backFallbackHref} />
              <p className="truncate text-xs font-bold text-slate-300 sm:text-sm">
                Organizations / {organization.name}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {organizations.length > 1 && (
                <Link
                  className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/10"
                  href="/admin"
                >
                  Switch
                </Link>
              )}
              <SessionControls compact role="admin" />
              <div className="hidden items-center gap-3 sm:flex">
                <span className="flex size-8 items-center justify-center rounded-full border border-blue-300/30 bg-blue-500/15 text-xs font-black text-blue-100">
                  {getInitial(displayName)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">
                    {displayName}
                  </span>
                  <span className="block text-xs text-slate-400">Admin</span>
                </span>
              </div>
            </div>
          </header>

          <section className="mx-auto max-w-5xl px-3 py-4 sm:px-5">
            <div>
              <h1 className="text-xl font-black tracking-tight text-white">
                {pageTitle}
              </h1>
              <p className="mt-1 text-sm font-semibold text-slate-300">
                {pageSubtitle}
              </p>
            </div>

            {currentSection === "overview" && (
              <div className="mt-3 grid gap-2 lg:grid-cols-2">
                {isFirstRunOrganization ? (
                  <section className="gd-card-dark overflow-hidden rounded-lg backdrop-blur lg:col-span-2">
                    <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase text-blue-200">
                          First step
                        </p>
                        <h2 className="mt-0.5 truncate text-lg font-black">
                          Create Team
                        </h2>
                      </div>
                      <Link
                        aria-label="Messages"
                        className={`relative flex size-9 shrink-0 items-center justify-center rounded-md border border-white/15 bg-white/5 text-blue-100 hover:bg-white/10 ${
                          recentCommunications.length > 0
                            ? "shadow-[0_0_18px_rgba(59,130,246,0.32)]"
                            : ""
                        }`}
                        href={withActiveOrganization(
                          "/admin/announcements",
                          activeOrganizationId,
                        )}
                        title="Messages"
                      >
                        <WorkspaceIcon className="size-4" name="message" />
                        {recentCommunications.length > 0 && (
                          <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-blue-300 ring-2 ring-slate-950" />
                        )}
                      </Link>
                    </div>
                    <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="max-w-xl text-sm font-semibold text-slate-300">
                        Create the first active team. Registration, schedule,
                        roster, and coach tools open after that team exists.
                      </p>
                      <Link
                        className="inline-flex shrink-0 items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-500"
                        href={withActiveOrganization(
                          "/admin/teams#create-team",
                          activeOrganizationId,
                        )}
                      >
                        Create team
                      </Link>
                    </div>
                  </section>
                ) : (
                  <>
                <Link
                  className="gd-card-dark flex flex-wrap items-center gap-1.5 rounded-lg px-3 py-2 backdrop-blur lg:col-span-2"
                  href={withActiveOrganization(
                    presidentAttentionItem?.href ?? "/admin/alerts",
                    activeOrganizationId,
                  )}
                >
                  <span className="mr-1 text-xs font-black uppercase tracking-[0.18em] text-blue-200">
                    Pulse
                  </span>
                  <StatusPill tone={organizationHealthTone}>
                    {organizationHealthLabel}
                  </StatusPill>
                  {pulseItems.map((item) => (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full border border-blue-300/10 bg-white/[0.04] px-2 py-1 text-[11px] font-bold text-slate-300"
                      key={item.label}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          item.tone === "green"
                            ? "bg-emerald-300"
                            : item.tone === "orange"
                              ? "bg-orange-300"
                              : item.tone === "blue"
                                ? "bg-blue-300"
                                : "bg-slate-400"
                        }`}
                      />
                      <span className="text-white">{item.value}</span>
                      <span>{item.label}</span>
                    </span>
                  ))}
                  <span className="ml-auto text-xs font-black text-blue-300">
                    Open
                  </span>
                </Link>

                <section className="hidden">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-base font-black">Messages</h2>
                      <p className="mt-1 text-sm text-slate-400">
                        Team and organization updates.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill tone="slate">
                        {`${recentCommunications.length} recent`}
                      </StatusPill>
                      <Link
                        className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-black text-white hover:bg-blue-500"
                        href={withActiveOrganization(
                          "/admin/announcements?action=create#create-announcement",
                          activeOrganizationId,
                        )}
                      >
                        Create Message +
                      </Link>
                    </div>
                  </div>
                  <div className="mt-2">
                    {recentCommunications[0] ? (
                      <div>
                        <p className="truncate text-sm font-black">
                          {recentCommunications[0].subject}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                          {recentCommunications[0].content}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">
                        No messages have been created for this organization.
                      </p>
                    )}
                  </div>
                </section>

                <section className="hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-black">Alerts</h2>
                      <p className="mt-1 text-sm text-slate-400">
                        Items that need attention.
                      </p>
                    </div>
                    <Link
                      className="text-sm font-bold text-blue-300"
                      href={withActiveOrganization(
                        "/admin/alerts",
                        activeOrganizationId,
                      )}
                    >
                      View all ›
                    </Link>
                  </div>
                  <div className="mt-2">
                    {alertItems[0] ? (
                      <Link
                        className="flex items-center justify-between gap-3 rounded-md border border-orange-300/20 bg-orange-500/10 px-3 py-2 text-xs font-bold text-orange-100"
                        href={withActiveOrganization(
                          alertItems[0].href,
                          activeOrganizationId,
                        )}
                      >
                        <span className="truncate">{alertItems[0].label}</span>
                        <span>Open</span>
                      </Link>
                    ) : (
                      <p className="text-sm text-slate-400">
                        No active alerts for this organization.
                      </p>
                    )}
                  </div>
                </section>

                <section className="gd-card-dark rounded-lg p-3 backdrop-blur lg:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-black">Teams</h2>
                      <p className="mt-0.5 text-sm text-slate-400">
                        Open one team workspace.
                      </p>
                    </div>
                    <Link
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-black text-white hover:bg-blue-500"
                      href={withActiveOrganization(
                        "/admin/teams#create-team",
                        activeOrganizationId,
                      )}
                    >
                      Create team
                    </Link>
                  </div>
                  <div className="mt-2 divide-y divide-white/10">
                    {visibleTeams.length === 0 ? (
                      <p className="py-2 text-sm font-semibold text-slate-400">
                        No teams in this organization yet.
                      </p>
                    ) : (
                      visibleTeams.map((team) => (
                          <Link
                            className="flex items-center justify-between gap-3 py-2.5 hover:text-blue-200"
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
                              <span className="mt-0.5 block truncate text-xs text-slate-400">
                                {getTeamLabel(team) || "Team workspace"}
                              </span>
                            </span>
                            <span className="shrink-0 text-sm font-black text-blue-300">
                              Open
                            </span>
                          </Link>
                        ))
                    )}
                  </div>
                </section>
                  </>
                )}
              </div>
            )}

            {currentSection === "overview" ? null : currentSection === "alerts" ? (
              <section className="gd-card-dark mt-3 rounded-lg p-4 backdrop-blur">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-xl font-black">Alerts</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Each alert opens the exact place where the issue can be
                      fixed or reviewed.
                    </p>
                  </div>
                  <StatusPill tone={alertItems.length > 0 ? "orange" : "green"}>
                    {`${alertItems.length} open`}
                  </StatusPill>
                </div>
                <div className="mt-3 space-y-2">
                  {alertItems.length === 0 ? (
                    <EmptyState>No active alerts for this organization.</EmptyState>
                  ) : (
                    alertItems.map((item) => (
                      <Link
                        className="gd-card-dark gd-card-interactive flex items-center justify-between gap-3 rounded-lg px-3 py-3"
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
                                ? "bg-red-500/15 text-red-100"
                                : item.tone === "orange"
                                  ? "bg-orange-500/15 text-orange-100"
                                  : "bg-white/10 text-slate-200"
                            }`}
                          >
                            <WorkspaceIcon className="size-4" name="alert" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-black">
                              {item.label}
                            </span>
                            <span className="mt-1 block text-sm text-slate-400">
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
              <div className="mt-3 space-y-3">
                <AdminAnnouncementForm
                  activeOrganizationId={activeOrganizationId}
                  teams={readModel.teams}
                />

                <section className="gd-card-dark rounded-lg p-4 backdrop-blur">
                  <div>
                    <h2 className="text-xl font-black">Messages</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Recent organization and team updates.
                    </p>
                  </div>

                  <div className="mt-4 space-y-3">
                    {recentCommunications.length > 0 ? (
                      recentCommunications.map((announcement) => (
                        <article
                          className="rounded-md border border-blue-300/10 bg-white/[0.045] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                          key={announcement.id}
                        >
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <h3 className="text-sm font-black">
                                {announcement.subject}
                              </h3>
                              <p className="mt-1 text-xs font-semibold text-blue-200">
                                {announcement.teamId
                                  ? `Team: ${
                                      readModel.teams.find(
                                        (team) =>
                                          team.id === announcement.teamId,
                                      )?.name ?? announcement.teamId
                                    }`
                                  : "Whole organization"}
                              </p>
                            </div>
                            <time className="text-xs font-semibold text-slate-400">
                              {new Date(
                                announcement.timestamp,
                              ).toLocaleDateString()}
                            </time>
                          </div>
                          <p className="mt-2 text-sm text-slate-300">
                            {announcement.content}
                          </p>
                        </article>
                      ))
                    ) : (
                      <EmptyState>
                        No messages have been created for this organization.
                      </EmptyState>
                    )}
                  </div>
                </section>
              </div>
            ) : currentSection === "registration" ? (
              <div className="mt-3 space-y-3">
                <RegistrationInviteManager
                  organizationId={activeOrganizationId}
                  registrationInvites={readModel.registrationInvites}
                  teams={readModel.teams}
                  workspaceType={getOrganizationWorkspaceType(organization)}
                />

                <section
                  className="gd-card-dark scroll-mt-4 rounded-lg p-4 backdrop-blur"
                  id="review"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-xl font-black">
                        Registered Players
                      </h2>
                      <p className="mt-1 text-sm text-slate-400">
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
              <div className="mt-3 space-y-3">
                <div className="flex justify-end">
                  <a
                    className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm font-black text-white shadow-sm hover:bg-white/10"
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
                  defaultOpen={scheduleDefaultCreateOpen}
                  events={visibleScheduleEvents}
                  teams={readModel.teams}
                />

                <section className="gd-card-dark rounded-lg p-4 backdrop-blur">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-xl font-black">Upcoming Events</h2>
                      <p className="mt-1 text-sm text-slate-400">
                        Published, draft, and canceled events still ahead.
                      </p>
                    </div>
                    <StatusPill tone="blue">
                      {`${upcomingScheduleEvents.length} upcoming`}
                    </StatusPill>
                  </div>

                  <div className="mt-3 space-y-2">
                    {upcomingScheduleEvents.length === 0 ? (
                      <EmptyState>
                        No events are scheduled for this organization yet.
                      </EmptyState>
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
                            className="gd-card-dark gd-card-interactive flex flex-col gap-2 rounded-lg px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                            href={withActiveOrganization(
                              `/admin/schedule/${event.id}`,
                              activeOrganizationId,
                            )}
                            key={event.id}
                          >
                            <div className="min-w-0 sm:w-40 sm:shrink-0">
                              <p className="text-sm font-black text-white">
                                {getEventDateLabel(event)}
                              </p>
                              <p className="mt-0.5 text-xs font-semibold text-slate-400">
                                {getEventTimeLabel(event)}
                              </p>
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-xs font-bold uppercase text-slate-400">
                                  {event.type}
                                </p>
                                <StatusPill tone={statusTone}>
                                  {statusLabel}
                                </StatusPill>
                              </div>
                              <h3 className="mt-1 truncate text-base font-black">
                                {event.title}
                              </h3>
                              <p className="mt-0.5 truncate text-xs font-semibold text-slate-400">
                                {eventTeams.map((team) => team?.name).join(", ") ||
                                  "Organization"}{" "}
                                / {getEventLocationLabel(event)}
                              </p>
                            </div>
                            <p className="shrink-0 text-xs font-bold text-slate-400 sm:text-right">
                              {attendance.attending} attending -{" "}
                              {transportation.needsRide} need ride
                            </p>
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
              <section className="mt-3">
                <AdminOrgMembersManager
                  activeOrganizationId={activeOrganizationId}
                  authority={readModel.organizationManagementAuthority}
                  memberships={readModel.organizationMemberships}
                />
              </section>
            ) : currentSection === "teams" ? (
              <div className="mt-3 space-y-3">
                <AdminTeamCreateForm
                  activeOrganizationId={activeOrganizationId}
                  defaultOpen={visibleTeams.length === 0}
                  disabledReason={
                    isSingleTeamWorkspace && visibleTeams.length > 0
                      ? "This Team Builder workspace already has its team."
                      : undefined
                  }
                />

                <section className="gd-card-dark rounded-lg p-4 backdrop-blur">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-xl font-black">Current Teams</h2>
                      <p className="mt-1 text-sm text-slate-400">
                        Open one team workspace.
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
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
                            className="gd-card-dark gd-card-interactive flex flex-col gap-3 rounded-lg px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                            key={team.id}
                          >
                            <Link
                              className="flex min-w-0 flex-1 flex-col gap-3 transition hover:text-blue-300 sm:flex-row sm:items-center sm:justify-between"
                              href={withActiveOrganization(
                                `/admin/teams/${team.id}`,
                                activeOrganizationId,
                              )}
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-base font-black">
                                  {team.name}
                                </span>
                                <span className="mt-1 block truncate text-xs text-slate-400">
                                  {getTeamLabel(team) || "Team workspace"}
                                </span>
                              </span>
                              <span className="hidden items-center gap-2 text-xs font-bold text-slate-400 sm:flex">
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
                                <span className="text-sm font-black text-blue-300">
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
              <section className="mt-3">
                {!selectedTeam ? (
                  <section className="gd-card-dark rounded-lg p-4 backdrop-blur">
                    <EmptyState>Team not found in this organization.</EmptyState>
                  </section>
                ) : (
                  <div className="space-y-3">
                    <section className="gd-card-dark rounded-lg p-3 backdrop-blur">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="text-2xl font-black">
                            {selectedTeam.name}
                          </h2>
                          <p className="mt-0.5 text-sm font-semibold text-slate-400">
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

                      <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-base font-black">Invite</h3>
                          <p className="mt-0.5 text-xs font-semibold text-slate-400">
                            QR team link parents scan or open directly.
                          </p>
                        </div>
                        <Link
                          className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-black text-blue-200 hover:bg-white/10"
                          href={withActiveOrganization(
                            "/admin/registrations",
                            activeOrganizationId,
                          )}
                        >
                          Manage invites
                        </Link>
                      </div>

                      {selectedTeamPrimaryInvite && selectedTeamJoinPath ? (
                        <div className="mt-2 grid gap-2 lg:grid-cols-[1fr_auto]">
                          <div className="rounded-md border border-blue-300/10 bg-white/[0.045] px-3 py-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-black">
                                {selectedTeamPrimaryInvite.title}
                              </span>
                              <StatusPill
                                tone={
                                  getRegistrationInviteStatus(
                                    selectedTeamPrimaryInvite,
                                  ) === "open"
                                    ? "green"
                                    : "orange"
                                }
                              >
                                {getRegistrationInviteStatus(
                                  selectedTeamPrimaryInvite,
                                )}
                              </StatusPill>
                            </div>
                            <p className="mt-2 truncate rounded-md bg-slate-950/55 px-2 py-1.5 text-xs font-bold text-blue-100">
                              {selectedTeamJoinPath}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <AdminJoinLinkButton
                              className="rounded-md bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-500"
                              joinPath={selectedTeamJoinPath}
                              label="Copy QR team link"
                            />
                            <Link
                              className="rounded-md border border-white/15 px-3 py-2 text-xs font-black text-slate-100 hover:bg-white/10"
                              href={selectedTeamJoinPath}
                              target="_blank"
                            >
                              Open link
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 flex flex-col gap-2 rounded-md border border-dashed border-blue-300/25 bg-white/[0.035] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm font-semibold text-slate-300">
                            No invite link yet. Create the link parents use from
                            QR codes, texts, and handouts.
                          </p>
                          <Link
                            className="inline-flex shrink-0 items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-500"
                            href={withActiveOrganization(
                              "/admin/registrations",
                              activeOrganizationId,
                            )}
                          >
                            Create invite
                          </Link>
                        </div>
                      )}
                    </section>

                    <div className="space-y-3">
                      <AdminTeamMembersManager
                        activeOrganizationId={activeOrganizationId}
                        coachAssignments={readModel.coachAssignments}
                        coaches={readModel.coaches}
                        defaultOpen
                        playersDefaultOpen
                        rosteredRegistrations={selectedTeamRosteredRegistrations}
                        showCoaches={false}
                        teamId={selectedTeam.id}
                        title="Editable roster"
                      />
                      <div className="flex flex-wrap items-center gap-2 text-xs font-black">
                        <Link
                          className="rounded-md border border-white/15 px-2.5 py-1.5 text-slate-100 hover:bg-white/10"
                          href={withActiveOrganization(
                            "/admin/people#coach-access",
                            activeOrganizationId,
                          )}
                        >
                          Coach access
                        </Link>
                        <Link
                          className="rounded-md border border-white/15 px-2.5 py-1.5 text-slate-100 hover:bg-white/10"
                          href={withActiveOrganization(
                            "/admin/schedule",
                            activeOrganizationId,
                          )}
                        >
                          Schedule
                        </Link>
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
                    </div>
                  </div>
                )}
              </section>
            ) : (
            <>
              <section className="gd-card-dark mt-3 rounded-lg p-4 backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black">Current Teams</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Teams in this organization.
                    </p>
                  </div>
                  <Link
                    className="text-sm font-bold text-blue-300"
                    href={withActiveOrganization(
                      "/admin/teams",
                      activeOrganizationId,
                    )}
                  >
                    View all teams ›
                  </Link>
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  {activeTeams.length === 0 ? (
                    <EmptyState>No active teams in this organization yet.</EmptyState>
                  ) : (
                    activeTeams.slice(0, 6).map((team) => (
                      <Link
                        className="gd-card-dark gd-card-interactive flex items-center justify-between gap-3 rounded-lg px-3 py-3"
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
                          <span className="mt-1 block truncate text-xs text-slate-400">
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
                  className="mt-4 inline-flex rounded-md px-2 py-1 text-sm font-bold text-blue-300 hover:bg-white/10"
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
