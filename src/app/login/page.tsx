import { redirect } from "next/navigation";
import ParentLoginForm from "../components/ParentLoginForm";
import { getCurrentAuthSession } from "../data/currentUser.server";
import { getLandingRouteForSession } from "../data/sessionAccess.server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getCurrentAuthSession();

  if (session) {
    redirect(await getLandingRouteForSession(session));
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <section className="mx-auto max-w-md px-5 py-8">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-blue-700">
            GameDay Account
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Sign in</h1>
          <p className="mt-3 text-sm font-semibold leading-5 text-slate-600">
            Use one GameDay account. After sign-in, we open the parent, coach,
            or admin workspace tied to this account.
          </p>
        </div>

        <ParentLoginForm />
      </section>
    </main>
  );
}
