import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAuthSession } from "./data/currentUser.server";
import { getLandingRouteForSession } from "./data/sessionAccess.server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getCurrentAuthSession();

  if (session) {
    redirect(await getLandingRouteForSession(session));
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">
            Youth Sports Logistics
          </p>
          <h1 className="text-3xl font-bold">GameDay</h1>
          <p className="mt-3 text-sm text-slate-300">
            Sign in once. GameDay opens the dashboard and organization scope
            assigned to your account.
          </p>
        </div>

        <Link
          href="/login"
          className="mt-6 block rounded-xl bg-blue-500 px-5 py-4 text-center text-lg font-bold text-white"
        >
          Sign In
        </Link>

        <Link
          href="/registration"
          className="mt-4 block rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5 shadow-lg"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">
            Team Invite
          </p>
          <h2 className="mt-2 text-xl font-bold">Open Registration</h2>
          <p className="mt-2 text-sm text-slate-300">
            Registration is available only through a real open organization
            invite.
          </p>
        </Link>
      </section>
    </main>
  );
}
