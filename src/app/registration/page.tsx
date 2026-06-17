import Link from "next/link";
import { getPublicRegistrationInviteReadModels } from "../data/registrationInviteRead.server";

export const dynamic = "force-dynamic";

export default async function RegistrationHome() {
  const inviteModels = await getPublicRegistrationInviteReadModels();

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <Link className="text-xl font-black" href="/">
            GameDay
          </Link>
          <Link
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
            href="/login?role=parent"
          >
            Parent Sign In
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-black uppercase text-blue-700">
            Registration
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Find your team
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-600">
            Choose an open organization or team registration. If your coach gave
            you a QR code or direct link, that still works too.
          </p>
        </div>

        <div className="mt-4 space-y-3">
          {inviteModels.length > 0 ? (
            inviteModels.map((model) =>
              model.invite ? (
                <Link
                  className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
                  href={`/join/${model.invite.inviteCode}`}
                  key={model.invite.id}
                >
                  <span className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      <span className="block text-lg font-black">
                        {model.team?.name ?? model.invite.title}
                      </span>
                      <span className="mt-1 block text-sm font-semibold text-slate-500">
                        {model.organization?.name ?? "Organization"} /{" "}
                        {model.invite.title}
                      </span>
                    </span>
                    <span className="w-fit rounded-md bg-blue-600 px-3 py-2 text-sm font-black text-white">
                      Register
                    </span>
                  </span>
                </Link>
              ) : null,
            )
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black">
                No open registrations found.
              </h2>
              <p className="mt-2 text-sm font-semibold text-slate-600">
                Ask your coach or organization to open registration in GameDay,
                or use their direct join link when they share it.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
