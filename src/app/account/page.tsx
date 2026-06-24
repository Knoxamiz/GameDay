import Link from "next/link";
import { redirect } from "next/navigation";
import PublicReleaseFooter from "../components/PublicReleaseFooter";
import SessionControls from "../components/SessionControls";
import { getAccountAccessReadModel } from "../data/accountAccess.server";
import { getCurrentAuthSession } from "../data/currentUser.server";

export const dynamic = "force-dynamic";

function getOptionTone(kind: string) {
  if (kind === "admin") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (kind === "coach" || kind === "start") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (kind === "parent" || kind === "join") {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default async function AccountPage() {
  const session = await getCurrentAuthSession();

  if (!session) {
    redirect("/login");
  }

  const accountAccess = await getAccountAccessReadModel(session);

  if (accountAccess.autoRoute) {
    redirect(accountAccess.autoRoute);
  }

  return (
    <main className="gd-dark-scope min-h-screen text-white">
      <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-3 py-2.5 sm:px-5">
          <Link className="text-lg font-black text-white" href="/account">
            GameDay
          </Link>
          <SessionControls compact role="account" surface="dark" />
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-3 py-4 sm:px-5">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-black uppercase tracking-wide text-blue-300">
            Account
          </p>
          <h1 className="text-xl font-black tracking-tight">
            Hi, {accountAccess.displayName}
          </h1>
          {accountAccess.email && (
            <p className="text-xs font-bold text-slate-400">
              {accountAccess.email}
            </p>
          )}
        </div>

        <section className="gd-card-light mt-3 rounded-lg p-2.5">
          <div className="flex items-center justify-between gap-3 px-1">
            <div>
              <h2 className="text-sm font-black">Open GameDay</h2>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                {accountAccess.hasEstablishedContext
                  ? "Your current account access."
                  : "Start by creating a team or finding one."}
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-black text-blue-700">
              {accountAccess.options.length}
            </span>
          </div>

          <div className="mt-2 grid gap-1.5">
            {accountAccess.options.map((option) => (
              <Link
                className="group flex items-center justify-between gap-3 rounded-md border border-blue-100/70 bg-white/70 px-2.5 py-2 transition hover:border-blue-300 hover:bg-blue-50"
                href={option.href}
                key={option.id}
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-black">
                      {option.title}
                    </span>
                    <span
                      className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-black ${getOptionTone(
                        option.kind,
                      )}`}
                    >
                      {option.badge}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-500">
                    {option.description}
                  </span>
                </span>
                <span className="text-sm font-black text-blue-600 transition group-hover:translate-x-0.5">
                  &rsaquo;
                </span>
              </Link>
            ))}
          </div>
        </section>
      </section>
      <PublicReleaseFooter />
    </main>
  );
}
