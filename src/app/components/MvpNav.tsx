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
  authenticated: [
    { href: "/account", label: "Account" },
    { href: "/registration", label: "Find Team" },
  ],
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
  const sessionRole = role === "shared" ? undefined : role;
  const homeHref = session
    ? role === "admin"
      ? withActiveOrganization(
          await getLandingRouteForSession(session, sessionRole),
          activeOrganizationId,
        )
      : await getLandingRouteForSession(session, sessionRole)
    : "/";

  return (
    <nav className="mb-3 space-y-2 text-xs font-bold">
      <div className="gd-card-dark flex items-center justify-between gap-3 rounded-lg px-3 py-2">
        <Link className="text-sm font-black text-white" href={homeHref}>
          GameDay
        </Link>
        <div className="text-right">
          <p className="font-black text-blue-200">{getRoleLabel(role)}</p>
          {organizationContext && (
            <p className="mt-0.5 max-w-44 truncate text-[11px] font-semibold text-slate-400">
              {organizationContext.count === 1
                ? organizationContext.label
                : `Access: ${organizationContext.label}`}
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
            className="shrink-0 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
