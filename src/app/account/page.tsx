import Link from "next/link";
import { redirect } from "next/navigation";
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
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <header className="border-b border-blue-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-3 py-2.5 sm:px-5">
          <Link className="text-lg font-black" href="/account">
            GameDay
          </Link>
          <SessionControls compact role="account" surface="light" />
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-3 py-4 sm:px-5">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            Account
          </p>
          <h1 className="text-xl font-black tracking-tight">
            Hi, {accountAccess.displayName}
          </h1>
          {accountAccess.email && (
            <p className="text-xs font-bold text-slate-500">
              {accountAccess.email}
            </p>
          )}
        </div>

        <section className="gd-card-light mt-3 rounded-lg p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black">Open GameDay</h2>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">
                {accountAccess.hasEstablishedContext
                  ? "Your current account access."
                  : "Start by creating a team or finding one."}
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
              {accountAccess.options.length}
            </span>
          </div>

          <div className="mt-2 grid gap-2">
            {accountAccess.options.map((option) => (
              <Link
                className="gd-card-light gd-card-interactive group flex items-center justify-between gap-3 rounded-lg px-3 py-2.5"
                href={option.href}
                key={option.id}
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-base font-black">
                      {option.title}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${getOptionTone(
                        option.kind,
                      )}`}
                    >
                      {option.badge}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">
                    {option.description}
                  </span>
                </span>
                <span className="text-base font-black text-blue-600 transition group-hover:translate-x-0.5">
                  &rsaquo;
                </span>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
