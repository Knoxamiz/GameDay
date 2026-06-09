import Link from "next/link";

const rolePreviews = [
  {
    href: "/parent",
    role: "Parent",
    title: "Athletes first",
    body: "See who is ready, where to go, and what still needs attention.",
    signal: "Documents and payment still open",
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
    signal: "Documents and payments need review",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">
            Mobile Beta Preview
          </p>
          <h1 className="text-3xl font-bold">GameDay</h1>
          <p className="mt-3 text-sm text-slate-300">
            Preview the MVP by role. This build uses demo data and local device
            state only.
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
          <p className="font-semibold">No real accounts, documents, or payments.</p>
          <p className="mt-2 text-yellow-100/80">
            Auth, Firebase, file storage, and payment processing are prepared
            for integration but intentionally not connected in this beta shell.
          </p>
        </div>

        <div className="mt-6 space-y-4">
          {rolePreviews.map((preview) => (
            <Link
              key={preview.href}
              href={preview.href}
              className="block min-h-44 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg"
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

        <Link
          href="/join/black-diamonds-12u"
          className="mt-4 block rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5 shadow-lg"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">
            Team Invite
          </p>
          <h2 className="mt-2 text-xl font-bold">Join From QR Link</h2>
          <p className="mt-2 text-sm text-slate-300">
            Add an athlete, review required documents, and record payment
            intent without coach memory.
          </p>
        </Link>
      </section>
    </main>
  );
}
