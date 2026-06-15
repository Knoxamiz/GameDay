"use client";

import { useState } from "react";
import type {
  OrganizationMembership,
  OrganizationMembershipRole,
} from "../data/organizationMemberships";

type MembershipAuthority = "admin" | "bootstrap-admin" | "owner";

type OrganizationMembershipManagerProps = {
  activeOrganizationId: string;
  authority: MembershipAuthority | null;
  memberships: OrganizationMembership[];
};

type SetupResponse = {
  error?: string;
  message?: string;
};

const membershipRoles: OrganizationMembershipRole[] = [
  "owner",
  "admin",
  "coach",
  "staff",
];

function MembershipEditor({
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
    membershipId: string,
    payload: Record<string, unknown>,
  ) => Promise<void>;
}) {
  const [role, setRole] = useState<OrganizationMembershipRole>(membership.role);
  const [uid, setUid] = useState(membership.uid ?? "");
  const isRemoved = membership.status === "removed";
  const ownerRestricted = membership.role === "owner" && authority !== "owner";

  function save(operation: "activate" | "remove" | "suspend" | "update") {
    return onSave(membership.id, {
      actionType: "organization-membership-update",
      membershipId: membership.id,
      operation,
      organizationId: activeOrganizationId,
      role,
      ...(operation === "activate" ? { uid } : {}),
    });
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-all font-semibold text-white">
            {membership.email}
          </p>
          <p className="mt-1 break-all text-xs text-slate-400">
            {membership.uid ? `Firebase UID: ${membership.uid}` : "Not linked"}
          </p>
        </div>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold capitalize text-slate-300">
          {membership.status}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="text-sm font-semibold text-slate-300">Role</span>
          <select
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white disabled:opacity-60"
            disabled={isRemoved || ownerRestricted}
            onChange={(event) =>
              setRole(event.target.value as OrganizationMembershipRole)
            }
            value={role}
          >
            {membershipRoles.map((membershipRole) => (
              <option
                disabled={membershipRole === "owner" && authority !== "owner"}
                key={membershipRole}
                value={membershipRole}
              >
                {membershipRole.charAt(0).toUpperCase() + membershipRole.slice(1)}
              </option>
            ))}
          </select>
        </label>

        {!membership.uid && !isRemoved && (
          <label className="block">
            <span className="text-sm font-semibold text-slate-300">
              Firebase UID
            </span>
            <input
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"
              onChange={(event) => setUid(event.target.value)}
              placeholder="Required to activate"
              value={uid}
            />
          </label>
        )}

        {!isRemoved && !ownerRestricted && (
          <div className="grid grid-cols-2 gap-2">
            <button
              className="rounded-xl bg-blue-500 px-3 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              onClick={() =>
                void save(
                  membership.status === "active" ? "update" : "activate",
                )
              }
              type="button"
            >
              {membership.status === "active" ? "Save Role" : "Activate"}
            </button>
            {membership.status === "active" ? (
              <button
                className="rounded-xl border border-yellow-500/50 px-3 py-3 text-sm font-semibold text-yellow-200 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving}
                onClick={() => void save("suspend")}
                type="button"
              >
                Suspend
              </button>
            ) : (
              <button
                className="rounded-xl border border-red-500/50 px-3 py-3 text-sm font-semibold text-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving}
                onClick={() => void save("remove")}
                type="button"
              >
                Remove
              </button>
            )}
          </div>
        )}

        {membership.status === "active" && !ownerRestricted && (
          <button
            className="w-full rounded-xl border border-red-500/50 px-3 py-3 text-sm font-semibold text-red-200 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            onClick={() => void save("remove")}
            type="button"
          >
            Remove Access
          </button>
        )}

        {ownerRestricted && (
          <p className="text-xs text-slate-400">
            Only an active owner can change owner access.
          </p>
        )}
      </div>
    </div>
  );
}

export default function OrganizationMembershipManager({
  activeOrganizationId,
  authority,
  memberships,
}: OrganizationMembershipManagerProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrganizationMembershipRole>("staff");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        throw new Error(body?.error ?? "Could not update membership.");
      }

      setMessage(body?.message ?? "Membership updated.");
      window.setTimeout(() => window.location.reload(), 600);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not update membership.",
      );
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-xl font-bold">Organization Members</h2>
      <p className="mt-2 text-sm text-slate-300">
        Invite and manage access for the active organization.
      </p>

      {message && (
        <p className="mt-4 rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-sm font-semibold text-blue-200">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-semibold text-red-300">
          {error}
        </p>
      )}

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="text-sm font-semibold text-slate-300">Email</span>
          <input
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-300">Role</span>
          <select
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            onChange={(event) =>
              setRole(event.target.value as OrganizationMembershipRole)
            }
            value={role}
          >
            {membershipRoles.map((membershipRole) => (
              <option
                disabled={membershipRole === "owner" && authority !== "owner"}
                key={membershipRole}
                value={membershipRole}
              >
                {membershipRole.charAt(0).toUpperCase() + membershipRole.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <button
          className="w-full rounded-xl bg-blue-500 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={savingId !== null || !authority}
          onClick={() =>
            void saveMembership("invite", {
              actionType: "organization-membership-invite",
              email,
              organizationId: activeOrganizationId,
              role,
            })
          }
          type="button"
        >
          Invite Member
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {memberships.length === 0 ? (
          <p className="rounded-xl bg-slate-800 p-3 text-sm text-slate-300">
            No membership records exist for this organization.
          </p>
        ) : (
          memberships.map((membership) => (
            <MembershipEditor
              activeOrganizationId={activeOrganizationId}
              authority={authority}
              isSaving={savingId === membership.id}
              key={membership.id}
              membership={membership}
              onSave={saveMembership}
            />
          ))
        )}
      </div>
    </section>
  );
}
