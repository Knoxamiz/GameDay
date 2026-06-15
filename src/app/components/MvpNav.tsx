import Link from "next/link";
import type { AccessRole } from "../data/accessControl";
import { withActiveOrganization } from "../data/activeOrganization";
import { getCurrentAuthSession } from "../data/currentUser.server";
import {
  getLandingRouteForSession,
  resolveSessionAccessRole,
} from "../data/sessionAccess.server";

export type MvpNavRole = AccessRole | "authenticated" | "shared";

type OrganizationContext = {
  count: number;
  label: string;
};

type MvpNavProps = {
  activeOrganizationId?: string;
  organizationContext?: OrganizationContext;
};

function getRoleLabel(role: MvpNavRole) {
  if (role === "admin") {
    return "Admin / Owner";
  }

  if (role === "coach") {
    return "Coach";
  }

  if (role === "parent") {
    return "Parent";
  }

  if (role === "authenticated") {
    return "Verified";
  }

  return "Signed Out";
}

const utilityItemsByRole: Record<
  MvpNavRole,
  { href: string; label: string }[]
> = {
  authenticated: [{ href: "/login", label: "Sign In" }],
  parent: [
    { href: "/parent", label: "Athletes" },
    { href: "/events", label: "Schedule" },
    { href: "/registration", label: "Registration" },
  ],
  coach: [
    { href: "/coach", label: "My Team" },
    { href: "/events", label: "Schedule" },
    { href: "/teams", label: "Teams" },
  ],
  admin: [
    { href: "/admin", label: "Home" },
    { href: "/admin/setup", label: "Setup" },
    { href: "/teams", label: "Teams" },
    { href: "/admin/registrations", label: "Registration" },
    { href: "/events", label: "Schedule" },
  ],
  shared: [
    { href: "/", label: "Home" },
    { href: "/login", label: "Sign In" },
  ],
};

export default async function MvpNav({
  activeOrganizationId,
  organizationContext,
}: MvpNavProps = {}) {
  const session = await getCurrentAuthSession();
  const role: MvpNavRole = session
    ? await resolveSessionAccessRole(session)
    : "shared";
  const utilityItems = utilityItemsByRole[role];
  const homeHref = session
    ? role === "admin"
      ? withActiveOrganization(
          await getLandingRouteForSession(session),
          activeOrganizationId,
        )
      : await getLandingRouteForSession(session)
    : "/";

  return (
    <nav className="mb-4 space-y-2 text-sm font-semibold">
      <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
        <Link className="text-base font-bold text-white" href={homeHref}>
          GameDay
        </Link>
        <div className="text-right">
          <p className="text-blue-300">{getRoleLabel(role)} Account</p>
          {organizationContext && (
            <p className="mt-1 text-xs font-medium text-slate-400">
              {organizationContext.count === 1
                ? `Current organization: ${organizationContext.label}`
                : `Organization access: ${organizationContext.label}`}
            </p>
          )}
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {utilityItems.map((item) => (
          <Link
            key={item.href}
            href={
              role === "admin"
                ? withActiveOrganization(item.href, activeOrganizationId)
                : item.href
            }
            className="min-h-11 shrink-0 rounded-full bg-slate-900 px-4 py-3 text-slate-300"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
