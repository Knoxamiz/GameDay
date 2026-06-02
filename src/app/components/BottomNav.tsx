import Link from "next/link";

type BottomNavItem = {
  href: string;
  label: string;
};

type BottomNavProps = {
  items: BottomNavItem[];
};

export default function BottomNav({ items }: BottomNavProps) {
  return (
    <nav
      className="mt-8 grid gap-2 text-center text-xs font-semibold text-slate-400"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item) => (
        <Link
          key={`${item.href}-${item.label}`}
          href={item.href}
          className="rounded-full bg-slate-900 px-3 py-2"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
