import Link from "next/link";

type BottomNavItem = {
  href: string;
  label: string;
};

type BottomNavProps = {
  items: BottomNavItem[];
  surface?: "dark" | "light";
};

export default function BottomNav({ items, surface = "dark" }: BottomNavProps) {
  return (
    <nav
      className={`mt-8 grid gap-2 pb-4 text-center text-sm font-semibold ${
        surface === "light" ? "text-slate-600" : "text-slate-400"
      }`}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item) => (
        <Link
          key={`${item.href}-${item.label}`}
          href={item.href}
          className={`min-h-11 rounded-full px-3 py-3 ${
            surface === "light"
              ? "border border-slate-200 bg-white shadow-sm"
              : "bg-slate-900"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
