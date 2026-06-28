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
      className={`mt-4 grid gap-1.5 pb-3 text-center text-[11px] font-bold ${
        surface === "light" ? "text-slate-600" : "text-slate-400"
      }`}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item) => (
        <Link
          key={`${item.href}-${item.label}`}
          href={item.href}
          className={`min-h-7 rounded-md px-2.5 py-1.5 ${
            surface === "light"
              ? "border border-blue-100 bg-white/80 shadow-sm hover:border-blue-300 hover:bg-blue-50"
              : "border border-blue-300/15 bg-white/[0.045] text-slate-300 hover:border-blue-300/35 hover:bg-blue-500/10 hover:text-white"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
