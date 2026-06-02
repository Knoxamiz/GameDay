import Link from "next/link";

const rolePreviews = [
  {
    href: "/parent",
    role: "Parent",
    title: "Athletes first",
    body: "See who is ready, where to go, and what still needs attention.",
    signal: "Emma needs a physical",
  },
  {
    href: "/coach",
    role: "Coach",
    title: "Team status first",
    body: "Check attendance, transportation, and event readiness fast.",
    signal: "2 players need rides",
  },
  {
    href: "/admin",
    role: "Admin",
    title: "Organization status first",
    body: "Review teams, registrations, schedule pressure, and open issues.",
    signal: "8 registrations pending",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h1 className="text-3xl font-bold">GameDay</h1>
          <p className="mt-3 text-sm text-slate-300">
            Preview the MVP by role.
          </p>
        </div>

        <div className="mt-6 space-y-4">
          {rolePreviews.map((preview) => (
            <Link
              key={preview.href}
              href={preview.href}
              className="block rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Continue as
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">{preview.role}</h2>
                </div>
                <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300">
                  Preview
                </span>
              </div>
              <p className="mt-4 font-semibold text-white">{preview.title}</p>
              <p className="mt-2 text-sm text-slate-300">{preview.body}</p>
              <p className="mt-4 rounded-xl bg-slate-800 p-3 text-sm font-semibold text-blue-300">
                {preview.signal}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
