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
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link className="text-xl font-black" href="/account">
            GameDay
          </Link>
          <SessionControls compact role="account" surface="light" />
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-blue-700">
            Account Home
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">
            Hi, {accountAccess.displayName}
          </h1>
          <p className="mt-2 max-w-xl text-sm font-semibold text-slate-600">
            Choose what you need to open. GameDay only shows access tied to this
            signed-in account.
          </p>
          {accountAccess.email && (
            <p className="mt-3 text-xs font-bold text-slate-500">
              {accountAccess.email}
            </p>
          )}
        </div>

        <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Open GameDay</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {accountAccess.hasEstablishedContext
                  ? "Your current account access."
                  : "Start by creating a team or finding one."}
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
              {accountAccess.options.length}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {accountAccess.options.map((option) => (
              <Link
                className="group rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
                href={option.href}
                key={option.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-black ${getOptionTone(
                      option.kind,
                    )}`}
                  >
                    {option.badge}
                  </span>
                  <span className="text-xl font-black text-blue-600 transition group-hover:translate-x-0.5">
                    &rsaquo;
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-black">{option.title}</h3>
                <p className="mt-2 text-sm font-semibold leading-5 text-slate-600">
                  {option.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
