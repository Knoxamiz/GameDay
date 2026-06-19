"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import type {
  CoachAssignment,
  CoachAssignmentStatus,
} from "../data/coachAssignmentRecords";
import { isActiveCoachAssignment } from "../data/coachAssignmentRecords";
import type { Coach } from "../data/coaches";
import {
  getRegistrationInviteStatus,
  type RegistrationInvite,
} from "../data/invites";
import type { OrganizationMembership } from "../data/organizationMemberships";
import type { Organization } from "../data/organizations";
import { withActiveOrganization } from "../data/activeOrganization";
import { getOrganizationWorkspaceType } from "../data/organizations";
import { isActiveTeam, type Team } from "../data/teams";
import CoachAssignmentLifecycleManager from "./CoachAssignmentLifecycleManager";

type AdminSetupPanelProps = {
  activeOrganizationId?: string;
  canCreateOrganization: boolean;
  canManageSetup: boolean;
  coachAssignments: CoachAssignment[];
  coaches: Coach[];
  defaultOpenSection?: SetupSectionId;
  organizationMemberships: OrganizationMembership[];
  organizations: Organization[];
  registrationInvites: RegistrationInvite[];
  teams: Team[];
};

export type SetupSectionId =
  | "organization"
  | "members"
  | "teams"
  | "coaches"
  | "invites"
  | "summary";

type SetupResponse = {
  error?: string;
  id?: string;
  message?: string;
};

function getOrganizationNameFromId(organizationId: string) {
  return organizationId
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function SetupHubSection({
  children,
  description,
  id,
  isOpen,
  label,
  onToggle,
  status,
}: {
  children: ReactNode;
  description: string;
  id: string;
  isOpen: boolean;
  label: string;
  onToggle: () => void;
  status: string;
}) {
  return (
    <section className="gd-card-dark rounded-lg" id={id}>
      <button
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
        onClick={onToggle}
        type="button"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-bold text-white">{label}</h2>
            <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300">
              {status}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-slate-400">{description}</p>
        </div>
        <span className="shrink-0 text-sm font-semibold text-blue-300">
          {isOpen ? "Close" : "Open"}
        </span>
      </button>
      {isOpen && <div className="border-t border-white/10 p-3">{children}</div>}
    </section>
  );
}

export default function AdminSetupPanel({
  activeOrganizationId,
  canCreateOrganization,
  canManageSetup,
  coachAssignments,
  coaches,
  defaultOpenSection,
  organizationMemberships,
  organizations,
  registrationInvites,
  teams,
}: AdminSetupPanelProps) {
  const organizationId = activeOrganizationId ?? "";
  const [organizationName, setOrganizationName] = useState(
    organizations[0]?.name ?? getOrganizationNameFromId(organizationId),
  );
  const [coachName, setCoachName] = useState("");
  const [coachEmail, setCoachEmail] = useState("");
  const [coachUid, setCoachUid] = useState("");
  const [coachStatus, setCoachStatus] =
    useState<Exclude<CoachAssignmentStatus, "archived">>("active");
  const [coachTeamIds, setCoachTeamIds] = useState<string[]>([]);
  const [newOrganizationName, setNewOrganizationName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<SetupSectionId | null>(
    defaultOpenSection ?? null,
  );
  const activeTeams = teams.filter(
    (team) => team.organizationId === organizationId && isActiveTeam(team),
  );
  const isSingleTeamWorkspace =
    getOrganizationWorkspaceType(organizations[0]) === "single_team";
  const activeTeamIdSet = new Set(activeTeams.map((team) => team.id));
  const selectedCoachTeamIds = coachTeamIds.filter((teamId) =>
    activeTeamIdSet.has(teamId),
  );
  const activeCoachAssignmentCount = coachAssignments.filter(
    (assignment) =>
      assignment.organizationId === organizationId &&
      isActiveCoachAssignment(assignment),
  ).length;
  const currentInviteCount = registrationInvites.filter(
    (invite) =>
      invite.organizationId === organizationId &&
      getRegistrationInviteStatus(invite) !== "archived",
  ).length;
  const workspaceLabel = isSingleTeamWorkspace
    ? "Team Workspace"
    : "Organization";

  useEffect(() => {
    const sectionByHash: Record<string, SetupSectionId> = {
      "#coach-assignments": "coaches",
      "#members": "members",
      "#organization": "organization",
      "#team": "teams",
    };
    const openHashSection = () => {
      const hashSection = sectionByHash[window.location.hash];

      if (hashSection) {
        setOpenSection(hashSection);
      }
    };

    openHashSection();
    window.addEventListener("hashchange", openHashSection);
    return () => window.removeEventListener("hashchange", openHashSection);
  }, []);

  function toggleCoachTeam(teamId: string) {
    setCoachTeamIds((currentTeamIds) =>
      currentTeamIds.includes(teamId)
        ? currentTeamIds.filter((currentTeamId) => currentTeamId !== teamId)
        : [...currentTeamIds, teamId],
    );
  }

  async function saveSetup(payload: Record<string, unknown>) {
    setError(null);
    setMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/setup", {
        body: JSON.stringify({ activeOrganizationId, ...payload }),
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as
        | SetupResponse
        | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Could not save setup.");
      }

      setMessage(body?.message ?? "Setup saved.");
      window.setTimeout(() => window.location.reload(), 600);
    } catch (setupError) {
      setError(
        setupError instanceof Error ? setupError.message : "Could not save setup.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!canManageSetup) {
    if (canCreateOrganization) {
      return (
        <div
          className="gd-card-dark mt-4 rounded-lg p-3"
          id="organization"
        >
          <h2 className="text-base font-black">Create Organization</h2>
          <p className="mt-1 text-sm text-slate-300">
            Create a real organization and owner membership for this account.
          </p>
          <div className="mt-3 space-y-2.5">
            <label className="block">
              <span className="text-sm font-semibold text-slate-300">
                Organization Name
              </span>
              <input
                className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/75 px-3 py-2 text-white outline-none"
                onChange={(event) => setNewOrganizationName(event.target.value)}
                value={newOrganizationName}
              />
            </label>
            <button
              className="w-full rounded-md bg-blue-500 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              onClick={() =>
                void saveSetup({
                  actionType: "organization-provisioning",
                  name: newOrganizationName,
                })
              }
              type="button"
            >
              Create Organization
            </button>
          </div>
          {message && (
            <p className="mt-3 rounded-md border border-blue-500/30 bg-blue-500/10 p-2.5 text-sm font-semibold text-blue-200">
              {message}
            </p>
          )}
          {error && (
            <p className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-2.5 text-sm font-semibold text-red-300">
              {error}
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="gd-card-dark mt-4 rounded-lg p-3 text-sm text-slate-300">
        Sign in as an admin with organization setup access.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2.5">
      {message && (
        <p className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-sm font-semibold text-blue-200">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm font-semibold text-red-300">
          {error}
        </p>
      )}

      <SetupHubSection
        description={`${organizationName} is the display name shown throughout GameDay.`}
        id="organization"
        isOpen={openSection === "organization"}
        label={workspaceLabel}
        onToggle={() =>
          setOpenSection(openSection === "organization" ? null : "organization")
        }
        status="Complete"
      >
        <div className="max-w-xl space-y-3">
          <p className="text-lg font-bold text-white">{organizationName}</p>
          <label className="block">
            <span className="text-sm font-semibold text-slate-300">
              Workspace Name
            </span>
            <input
            className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/75 px-3 py-2 text-white outline-none"
              onChange={(event) => setOrganizationName(event.target.value)}
              value={organizationName}
            />
          </label>
          <button
            className="rounded-md bg-blue-500 px-3 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            onClick={() =>
              void saveSetup({
                actionType: "organization",
                name: organizationName,
                organizationId,
              })
            }
            type="button"
          >
            Save Workspace
          </button>
          <details className="text-xs text-slate-500">
            <summary className="cursor-pointer font-semibold">
              Technical details
            </summary>
            <p className="mt-2 break-all">
              Internal Workspace ID: {organizationId}
            </p>
          </details>
        </div>
      </SetupHubSection>

      <SetupHubSection
        description="Org member permissions and contact titles live on their own screen."
        id="members"
        isOpen={openSection === "members"}
        label="Org Members"
        onToggle={() =>
          setOpenSection(openSection === "members" ? null : "members")
        }
        status={`${organizationMemberships.length} record${organizationMemberships.length === 1 ? "" : "s"}`}
      >
        <div className="max-w-xl">
          <p className="text-sm text-slate-300">
            Manage app permissions, public contact titles, and member status
            from the dedicated Org Members page.
          </p>
          <Link
            className="mt-3 inline-flex rounded-md bg-blue-500 px-3 py-2 text-sm font-black text-white hover:bg-blue-600"
            href={withActiveOrganization("/admin/people", organizationId)}
          >
            Open Org Members
          </Link>
        </div>
      </SetupHubSection>

      <SetupHubSection
        description={
          isSingleTeamWorkspace && activeTeams.length > 0
            ? `${activeTeams[0]?.name ?? "The team"} is the active Team Builder team.`
            : activeTeams.length > 0
            ? `${activeTeams.length} active team${activeTeams.length === 1 ? "" : "s"} available for registration.`
            : "Create an active team before opening registration."
        }
        id="team"
        isOpen={openSection === "teams"}
        label={isSingleTeamWorkspace ? "Team" : "Teams"}
        onToggle={() =>
          setOpenSection(openSection === "teams" ? null : "teams")
        }
        status={activeTeams.length > 0 ? "Complete" : "Next"}
      >
        <div className="max-w-xl">
          <p className="text-sm text-slate-300">
            Team creation, opening a team workspace, and removing teams now
            live on the dedicated Teams screen.
          </p>
          <Link
            className="mt-3 inline-flex rounded-md bg-blue-500 px-3 py-2 text-sm font-black text-white hover:bg-blue-600"
            href={withActiveOrganization("/admin/teams#create-team", organizationId)}
          >
            Open Teams
          </Link>
        </div>
      </SetupHubSection>

      <SetupHubSection
        description={
          activeCoachAssignmentCount > 0
            ? `${activeCoachAssignmentCount} active assignment${activeCoachAssignmentCount === 1 ? "" : "s"}.`
            : "Optional until a coach needs roster and event access."
        }
        id="coach-assignments"
        isOpen={openSection === "coaches"}
        label="Coach Assignments"
        onToggle={() =>
          setOpenSection(openSection === "coaches" ? null : "coaches")
        }
        status={activeCoachAssignmentCount > 0 ? "Complete" : "Optional"}
      >
        {activeTeams.length === 0 ? (
          <p className="text-sm text-slate-300">Create an active team first.</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            <div>
              <h3 className="font-bold text-white">Assign Coach</h3>
              <div className="mt-3 space-y-3">
                <label className="block"><span className="text-xs font-black uppercase text-slate-400">Coach Name</span><input className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/75 px-3 py-2 text-white outline-none" onChange={(event) => setCoachName(event.target.value)} value={coachName} /></label>
                <label className="block"><span className="text-xs font-black uppercase text-slate-400">Coach Email</span><input className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/75 px-3 py-2 text-white outline-none" onChange={(event) => setCoachEmail(event.target.value)} type="email" value={coachEmail} /></label>
                <label className="block"><span className="text-xs font-black uppercase text-slate-400">Status</span><select className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/75 px-3 py-2 text-white" onChange={(event) => setCoachStatus(event.target.value === "inactive" ? "inactive" : "active")} value={coachStatus}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
                <fieldset className="space-y-1.5"><legend className="text-sm font-semibold text-slate-300">Teams</legend>{activeTeams.map((team) => (<label className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/5 p-2.5 text-sm font-semibold text-slate-300" key={team.id}>{team.name}<input checked={selectedCoachTeamIds.includes(team.id)} onChange={() => toggleCoachTeam(team.id)} type="checkbox" /></label>))}</fieldset>
                <details className="rounded-md border border-white/10 bg-slate-950/75 p-2.5"><summary className="cursor-pointer text-sm font-semibold text-slate-300">Technical account linking</summary><label className="mt-3 block"><span className="text-sm font-semibold text-slate-300">Firebase UID</span><input className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/75 px-3 py-2 text-white outline-none" onChange={(event) => setCoachUid(event.target.value)} placeholder="Optional" value={coachUid} /></label></details>
                <button className="rounded-md bg-blue-500 px-3 py-2 text-sm font-black text-white disabled:opacity-60" disabled={isSaving} onClick={() => void saveSetup({ actionType: "coach-assignment", email: coachEmail, name: coachName, organizationId, status: coachStatus, teamIds: selectedCoachTeamIds, uid: coachUid })} type="button">Save Coach Assignment</button>
              </div>
            </div>
            <div className="border-t border-slate-800 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <CoachAssignmentLifecycleManager activeOrganizationId={organizationId} assignments={coachAssignments} coaches={coaches} embedded teams={teams} />
            </div>
          </div>
        )}
      </SetupHubSection>

      <SetupHubSection
        description={
          isSingleTeamWorkspace && currentInviteCount > 0
            ? "A team registration link exists for this workspace."
            : currentInviteCount > 0
            ? `${currentInviteCount} current invite${currentInviteCount === 1 ? "" : "s"}.`
            : isSingleTeamWorkspace
              ? "Create a real team registration link after the team exists."
              : "Create an invite after an active team exists."
        }
        id="registration-invites"
        isOpen={openSection === "invites"}
        label={isSingleTeamWorkspace ? "Team Registration Link" : "Registration Invites"}
        onToggle={() =>
          setOpenSection(openSection === "invites" ? null : "invites")
        }
        status={currentInviteCount > 0 ? "Configured" : activeTeams.length > 0 ? "Next" : "Waiting"}
      >
        <div className="max-w-xl">
          <p className="text-sm text-slate-300">
            Create, open, copy, and manage parent registration links from the
            dedicated Registration screen.
          </p>
          <Link
            className="mt-3 inline-flex rounded-md bg-blue-500 px-3 py-2 text-sm font-black text-white hover:bg-blue-600"
            href={withActiveOrganization("/admin/registrations", organizationId)}
          >
            Open Registration
          </Link>
        </div>
      </SetupHubSection>
    </div>
  );
}
