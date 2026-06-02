import Link from "next/link";

const navItems = [
  {
    href: "/",
    label: "Parent Home",
  },
  {
    href: "/coach",
    label: "Coach Home",
  },
  {
    href: "/athletes/emma-smith",
    label: "Athlete Details",
  },
];

export default function MvpNav() {
  return (
    <nav className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-3 shadow-lg">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        MVP Navigation
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl bg-slate-800 px-2 py-3 text-slate-200"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
