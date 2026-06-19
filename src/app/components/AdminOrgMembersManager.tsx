"use client";

import { useMemo, useState } from "react";
import type {
  OrganizationMembership,
  OrganizationMembershipRole,
} from "../data/organizationMemberships";

type MembershipAuthority = "admin" | "bootstrap-admin" | "owner";

type AdminOrgMembersManagerProps = {
  activeOrganizationId: string;
  authority: MembershipAuthority | null;
  memberships: OrganizationMembership[];
};

type SetupResponse = {
  error?: string;
  message?: string;
};

const membershipRoles: {
  description: string;
  label: string;
  value: OrganizationMembershipRole;
}[] = [
  {
    description: "Full organization control and owner-level access.",
    label: "Owner",
    value: "owner",
  },
  {
    description: "Manage organization setup, teams, invites, events, and review.",
    label: "Admin",
    value: "admin",
  },
  {
    description: "Coach-facing access for assigned teams and roster workflows.",
    label: "Coach",
    value: "coach",
  },
  {
    description: "Contact or staff record without admin controls.",
    label: "Staff",
    value: "staff",
  },
];

function getRoleLabel(role: OrganizationMembershipRole) {
  return membershipRoles.find((membershipRole) => membershipRole.value === role)
    ?.label ?? role;
}

function getStatusTone(status: OrganizationMembership["status"]) {
  if (status === "active") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "invited") {
    return "bg-blue-50 text-blue-700";
  }

  if (status === "suspended") {
    return "bg-orange-50 text-orange-700";
  }

  return "bg-slate-100 text-slate-600";
}

function getPrimaryName(membership: OrganizationMembership) {
  return membership.displayName || membership.email;
}

function compareMemberships(
  first: OrganizationMembership,
  second: OrganizationMembership,
) {
  const statusRank: Record<OrganizationMembership["status"], number> = {
    active: 0,
    invited: 1,
    suspended: 2,
    removed: 3,
  };

  return (
    statusRank[first.status] - statusRank[second.status] ||
    getPrimaryName(first).localeCompare(getPrimaryName(second))
  );
}

function MemberCard({
  activeOrganizationId,
  authority,
  isSaving,
  membership,
  onSave,
}: {
  activeOrganizationId: string;
  authority: MembershipAuthority | null;
  isSaving: boolean;
  membership: OrganizationMembership;
  onSave: (
    savingKey: string,
    payload: Record<string, unknown>,
  ) => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState(membership.displayName ?? "");
  const [role, setRole] = useState<OrganizationMembershipRole>(membership.role);
  const [title, setTitle] = useState(membership.title ?? "");
  const isRemoved = membership.status === "removed";
  const ownerRestricted = membership.role === "owner" && authority !== "owner";
  const canEdit = Boolean(authority) && !isRemoved && !ownerRestricted;
  const canRestore = membership.status === "suspended" && Boolean(membership.uid);

  function save(operation: "activate" | "remove" | "suspend" | "update") {
    return onSave(membership.id, {
      actionType: "organization-membership-update",
      displayName,
      membershipId: membership.id,
      operation,
      organizationId: activeOrganizationId,
      role,
      title,
    });
  }

  return (
    <details className="gd-card-dark gd-card-interactive group overflow-hidden rounded-lg">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block truncate text-base font-black text-white">
            {getPrimaryName(membership)}
          </span>
          <span className="mt-0.5 block truncate text-xs font-semibold text-slate-400">
            {membership.title || membership.email}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-black capitalize ${getStatusTone(
              membership.status,
            )}`}
          >
            {membership.status}
          </span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-black text-slate-200">
            {getRoleLabel(membership.role)}
          </span>
          <span className="text-base font-black text-blue-300 transition group-open:rotate-90">
            &gt;
          </span>
        </span>
      </summary>

      <div className="border-t border-white/10 px-3 pb-3 pt-2.5">
        <p className="break-all text-xs font-semibold text-slate-400">
          {membership.email}
        </p>

        <div className="mt-2.5 grid gap-2 lg:grid-cols-[1fr_1fr_150px]">
        <label className="block">
          <span className="text-xs font-bold uppercase text-slate-400">
            Contact Name
          </span>
          <input
            className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400 disabled:bg-slate-900/60"
            disabled={!canEdit}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Alex Morgan"
            value={displayName}
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase text-slate-400">
            Organization Title
          </span>
          <input
            className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400 disabled:bg-slate-900/60"
            disabled={!canEdit}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Head Coach, Board Member, Team Mom"
            value={title}
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase text-slate-400">
            App Permission
          </span>
          <select
            className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400 disabled:bg-slate-900/60"
            disabled={!canEdit}
            onChange={(event) =>
              setRole(event.target.value as OrganizationMembershipRole)
            }
            value={role}
          >
            {membershipRoles.map((membershipRole) => (
              <option
                disabled={membershipRole.value === "owner" && authority !== "owner"}
                key={membershipRole.value}
                value={membershipRole.value}
              >
                {membershipRole.label}
              </option>
            ))}
          </select>
        </label>
        </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canEdit || isSaving}
          onClick={() => void save("update")}
          type="button"
        >
          Save Member
        </button>
        {membership.status === "active" && (
          <button
            className="rounded-md border border-orange-400/30 px-2.5 py-1.5 text-xs font-black text-orange-200 hover:bg-orange-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canEdit || isSaving}
            onClick={() => void save("suspend")}
            type="button"
          >
            Suspend Access
          </button>
        )}
        {canRestore && (
          <button
            className="rounded-md border border-emerald-400/30 px-2.5 py-1.5 text-xs font-black text-emerald-200 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canEdit || isSaving}
            onClick={() => void save("activate")}
            type="button"
          >
            Restore Access
          </button>
        )}
        {membership.status !== "removed" && (
          <button
            className="rounded-md border border-red-400/30 px-2.5 py-1.5 text-xs font-black text-red-200 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canEdit || isSaving}
            onClick={() => void save("remove")}
            type="button"
          >
            Remove Access
          </button>
        )}
      </div>

      {ownerRestricted && (
        <p className="mt-3 text-xs font-semibold text-slate-400">
          Only an active owner can change owner access.
        </p>
      )}
      </div>
    </details>
  );
}

export default function AdminOrgMembersManager({
  activeOrganizationId,
  authority,
  memberships,
}: AdminOrgMembersManagerProps) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrganizationMembershipRole>("staff");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sortedMemberships = useMemo(
    () => memberships.slice().sort(compareMemberships),
    [memberships],
  );

  async function saveMembership(
    savingKey: string,
    payload: Record<string, unknown>,
  ) {
    setError(null);
    setMessage(null);
    setSavingId(savingKey);

    try {
      const response = await fetch("/api/admin/setup", {
        body: JSON.stringify({ activeOrganizationId, ...payload }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as
        | SetupResponse
        | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Could not update org member.");
      }

      setMessage(body?.message ?? "Org member updated.");
      window.setTimeout(() => window.location.reload(), 600);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not update org member.",
      );
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {message && (
        <p className="rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-xs font-bold text-blue-700">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-bold text-red-700">
          {error}
        </p>
      )}

      <details className="gd-card-dark gd-card-interactive group overflow-hidden rounded-lg">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block text-base font-black text-white">
              Invite org member
            </span>
            <span className="mt-0.5 block text-xs font-semibold text-slate-400">
              Add coaches, staff, board members, or team contacts.
            </span>
          </span>
          <span className="text-base font-black text-blue-300 transition group-open:rotate-90">
            &gt;
          </span>
        </summary>

        <div className="grid gap-2 border-t border-white/10 px-3 pb-3 pt-2.5 lg:grid-cols-[1fr_1fr_150px_1fr]">
          <label className="block">
            <span className="text-xs font-bold uppercase text-slate-400">
              Contact Name
            </span>
            <input
              className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Alex Morgan"
              value={displayName}
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase text-slate-400">
              Email
            </span>
            <input
              className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase text-slate-400">
              Permission
            </span>
            <select
              className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
              onChange={(event) =>
                setRole(event.target.value as OrganizationMembershipRole)
              }
              value={role}
            >
              {membershipRoles.map((membershipRole) => (
                <option
                  disabled={membershipRole.value === "owner" && authority !== "owner"}
                  key={membershipRole.value}
                  value={membershipRole.value}
                >
                  {membershipRole.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase text-slate-400">
              Title
            </span>
            <input
              className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Board Member"
              value={title}
            />
          </label>
        </div>
        <button
          className="mx-3 mb-3 rounded-md bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={savingId !== null || !authority}
          onClick={() =>
            void saveMembership("invite", {
              actionType: "organization-membership-invite",
              displayName,
              email,
              organizationId: activeOrganizationId,
              role,
              title,
            })
          }
          type="button"
        >
          Invite Org Member
        </button>
      </details>

      <section className="grid gap-2">
        {sortedMemberships.length === 0 ? (
          <p className="gd-card-dark rounded-lg border-dashed p-3 text-sm font-semibold text-slate-400">
            No organization members have been added yet.
          </p>
        ) : (
          sortedMemberships.map((membership) => (
            <MemberCard
              activeOrganizationId={activeOrganizationId}
              authority={authority}
              isSaving={savingId === membership.id}
              key={membership.id}
              membership={membership}
              onSave={saveMembership}
            />
          ))
        )}
      </section>

      <details className="gd-card-dark group overflow-hidden rounded-lg">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block text-base font-black text-white">
              Permission guide
            </span>
            <span className="mt-0.5 block text-xs font-semibold text-slate-400">
              Owner, admin, coach, and staff access.
            </span>
          </span>
          <span className="text-base font-black text-blue-300 transition group-open:rotate-90">
            &gt;
          </span>
        </summary>
        <div className="grid gap-2 border-t border-white/10 p-3 sm:grid-cols-2">
          {membershipRoles.map((membershipRole) => (
            <div
              className="rounded-md border border-white/10 bg-white/5 p-2.5"
              key={membershipRole.value}
            >
              <p className="font-black text-white">
                {membershipRole.label}
              </p>
              <p className="mt-1 text-sm text-slate-300">
                {membershipRole.description}
              </p>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
