import Link from "next/link";

export type MvpNavRole = "parent" | "coach" | "admin" | "shared";

type MvpNavProps = {
  role?: MvpNavRole;
};

const mvpNavRoles: MvpNavRole[] = ["parent", "coach", "admin", "shared"];

export function getMvpNavRole(value?: string | string[]): MvpNavRole {
  const role = Array.isArray(value) ? value[0] : value;

  return role && mvpNavRoles.includes(role as MvpNavRole)
    ? (role as MvpNavRole)
    : "shared";
}

export function getRoleHref(href: string, role: MvpNavRole) {
  if (role === "shared") {
    return href;
  }

  return `${href}${href.includes("?") ? "&" : "?"}role=${role}`;
}

const roleItems = [
  {
    href: "/parent",
    label: "Parent",
    role: "parent",
  },
  {
    href: "/coach",
    label: "Coach",
    role: "coach",
  },
  {
    href: "/admin",
    label: "Admin",
    role: "admin",
  },
] as const;

const utilityItemsByRole: Record<
  MvpNavRole,
  { href: string; label: string }[]
> = {
  parent: [
    {
      href: "/parent",
      label: "Athletes",
    },
    {
      href: "/events",
      label: "Schedule",
    },
    {
      href: "/registration",
      label: "Registration",
    },
  ],
  coach: [
    {
      href: "/events",
      label: "Schedule",
    },
    {
      href: "/coach",
      label: "My Team",
    },
    {
      href: "/teams",
      label: "Teams",
    },
  ],
  admin: [
    {
      href: "/teams",
      label: "Teams",
    },
    {
      href: "/admin/registrations",
      label: "Registration",
    },
    {
      href: "/events",
      label: "Schedule",
    },
  ],
  shared: [
    {
      href: "/events",
      label: "Schedule",
    },
    {
      href: "/teams",
      label: "Teams",
    },
  ],
};

export default function MvpNav({ role = "shared" }: MvpNavProps = {}) {
  const utilityItems = utilityItemsByRole[role];

  return (
    <nav className="mb-4 space-y-2 text-sm font-semibold">
      <div className="grid grid-cols-3 gap-2 text-center">
        {roleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`min-h-11 rounded-full border px-3 py-3 ${
              item.role === role
                ? "border-blue-500 bg-blue-500/20 text-blue-200"
                : "border-slate-800 bg-slate-900 text-slate-200"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {utilityItems.map((item) => (
          <Link
            key={item.href}
            href={getRoleHref(item.href, role)}
            className="min-h-11 shrink-0 rounded-full bg-slate-900 px-4 py-3 text-slate-400"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
