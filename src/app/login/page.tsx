import { redirect } from "next/navigation";
import MvpNav from "../components/MvpNav";
import ParentLoginForm from "../components/ParentLoginForm";
import { getCurrentAuthSession } from "../data/currentUser.server";
import { getLandingRouteForClaims } from "../infrastructure/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getCurrentAuthSession();

  if (session) {
    redirect(getLandingRouteForClaims(session.claims));
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav />

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h1 className="text-3xl font-bold">GameDay</h1>
          <p className="mt-3 text-sm text-slate-300">
            Sign in with your GameDay account. Your verified account role
            determines the dashboard and navigation you can access.
          </p>
        </div>

        <ParentLoginForm />
      </section>
    </main>
  );
}
