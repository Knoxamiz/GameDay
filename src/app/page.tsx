import Link from "next/link";

const signInActions = [
  {
    body: "Family account for athlete readiness, registration, and logistics.",
    href: "/login?role=parent",
    label: "Sign in as Parent",
  },
  {
    body: "Team account for attendance, transportation, and readiness.",
    href: "/login?role=coach",
    label: "Sign in as Coach",
  },
  {
    body: "Organization account for registrations, documents, and payments.",
    href: "/login?role=admin",
    label: "Sign in as Admin",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">
            Youth Sports Logistics
          </p>
          <h1 className="text-3xl font-bold">GameDay</h1>
          <p className="mt-3 text-sm text-slate-300">
            Sign in for live parent, coach, and admin workflows.
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-100">
          <p className="font-semibold">Live Firebase sign-in is available.</p>
          <p className="mt-2 text-blue-100/80">
            If no live records exist yet, pages show empty states instead of
            placeholder teams or players.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {signInActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="block rounded-2xl border border-blue-500/40 bg-blue-500 p-5 shadow-lg"
            >
              <p className="text-xl font-bold text-white">{action.label}</p>
              <p className="mt-2 text-sm text-blue-50/90">{action.body}</p>
            </Link>
          ))}
        </div>

        <Link
          href="/registration"
          className="mt-4 block rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5 shadow-lg"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">
            Team Invite
          </p>
          <h2 className="mt-2 text-xl font-bold">Join From QR Link</h2>
          <p className="mt-2 text-sm text-slate-300">
            Add an athlete from an active team invite when registration is open.
          </p>
        </Link>
      </section>
    </main>
  );
}
