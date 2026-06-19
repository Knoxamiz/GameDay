import Link from "next/link";
import type { ReactNode } from "react";
import {
  getOrganizationWorkspaceTypeLabel,
  type Organization,
} from "../data/organizations";
import { withActiveOrganization } from "../data/activeOrganization";
import AdminOrganizationSelector from "./AdminOrganizationSelector";
import SessionControls from "./SessionControls";

export type AdminShellSection =
  | "home"
  | "setup"
  | "teams"
  | "registration"
  | "schedule";

type AdminAppShellProps = {
  accountLabel?: string;
  activeOrganizationId?: string;
  activeOrganizationName?: string;
  children: ReactNode;
  currentSection: AdminShellSection;
  description: string;
  organizationSelectorAction: string;
  organizations: Organization[];
  title: string;
};

const adminNavigation: {
  href: string;
  label: string;
  section: AdminShellSection;
}[] = [
  { href: "/admin", label: "Home", section: "home" },
  { href: "/admin/setup", label: "Setup", section: "setup" },
  { href: "/admin/teams", label: "Teams", section: "teams" },
  {
    href: "/admin/registrations",
    label: "Registration",
    section: "registration",
  },
  { href: "/admin/schedule", label: "Schedule", section: "schedule" },
];

export default function AdminAppShell({
  accountLabel,
  activeOrganizationId,
  activeOrganizationName,
  children,
  currentSection,
  description,
  organizationSelectorAction,
  organizations,
  title,
}: AdminAppShellProps) {
  const activeOrganization = organizations.find(
    (organization) => organization.id === activeOrganizationId,
  );
  const workspaceTypeLabel =
    getOrganizationWorkspaceTypeLabel(activeOrganization);
  const organizationLabel = activeOrganizationName
    ? activeOrganizationName
    : organizations.length > 0
      ? "Choose a workspace"
      : "No workspace yet";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-3 py-3 sm:px-5">
        <header className="border-b border-white/10 pb-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link
                className="text-lg font-black text-white"
                href={withActiveOrganization("/admin", activeOrganizationId)}
              >
                GameDay
              </Link>
              <p className="mt-1 text-xs font-semibold uppercase text-blue-300">
                {workspaceTypeLabel}
              </p>
              {accountLabel && (
                <p className="mt-1 text-sm text-slate-400">{accountLabel}</p>
              )}
            </div>
            <SessionControls compact role="admin" />
          </div>

          <nav className="mt-3 flex gap-1 overflow-x-auto border-b border-white/10 pb-2 text-sm font-semibold">
            {adminNavigation.map((item) => {
              const isCurrent = item.section === currentSection;

              return (
                <Link
                  aria-current={isCurrent ? "page" : undefined}
                  className={`min-h-8 shrink-0 rounded-md px-2.5 py-1.5 ${
                    isCurrent
                      ? "bg-blue-500 text-white"
                      : "text-slate-300 hover:bg-slate-900"
                  }`}
                  href={withActiveOrganization(item.href, activeOrganizationId)}
                  key={item.section}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                Current workspace
              </p>
              <p className="mt-1 font-semibold text-white">{organizationLabel}</p>
            </div>
            <AdminOrganizationSelector
              action={organizationSelectorAction}
              activeOrganizationId={activeOrganizationId}
              compact
              organizations={organizations}
            />
          </div>
        </header>

        <div className="py-4">
          <div className="border-b border-white/10 pb-3">
            <h1 className="text-xl font-black">{title}</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-300">
              {description}
            </p>
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}
