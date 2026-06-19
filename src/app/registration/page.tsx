import Link from "next/link";
import {
  lookupPublicRegistrationInviteReadModels,
  type PublicRegistrationInviteLookup,
} from "../data/registrationInviteRead.server";

export const dynamic = "force-dynamic";

type RegistrationHomeProps = {
  searchParams?: Promise<{
    code?: string | string[];
    q?: string | string[];
  }>;
};

function getSearchValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function getResultMessage({
  hasCode,
  resultCount,
  searchReason,
}: {
  hasCode: boolean;
  resultCount: number;
  searchReason: PublicRegistrationInviteLookup["reason"];
}) {
  if (searchReason === "empty") {
    return "Search by team or organization, or enter the invite code from your coach.";
  }

  if (searchReason === "query-too-short") {
    return "Type at least two letters to search.";
  }

  if (searchReason === "service-unavailable") {
    return "Registration lookup is temporarily unavailable.";
  }

  if (searchReason === "code-not-found") {
    return "No open registration matched that code.";
  }

  if (resultCount === 0) {
    return hasCode
      ? "No open registration matched that code."
      : "No open registrations matched that search.";
  }

  return `${resultCount} open registration${resultCount === 1 ? "" : "s"} found.`;
}

export default async function RegistrationHome({
  searchParams,
}: RegistrationHomeProps) {
  const resolvedSearchParams = await searchParams;
  const query = getSearchValue(resolvedSearchParams?.q);
  const code = getSearchValue(resolvedSearchParams?.code);
  const lookup = await lookupPublicRegistrationInviteReadModels({
    code,
    query,
  });
  const hasCode = Boolean(code?.trim());
  const hasSearch = Boolean(query?.trim()) || hasCode;
  const resultMessage = getResultMessage({
    hasCode,
    resultCount: lookup.models.length,
    searchReason: lookup.reason,
  });

  return (
    <main className="gd-dark-scope min-h-screen text-white">
      <header className="border-b border-blue-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-3 py-2.5 sm:px-5">
          <Link className="text-lg font-black" href="/">
            GameDay
          </Link>
          <Link
            className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50"
            href="/login?role=parent"
          >
            Parent Sign In
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-3 py-4 sm:px-5">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            Registration
          </p>
          <h1 className="text-xl font-black tracking-tight">
            Find registration
          </h1>
          <p className="max-w-2xl text-xs font-semibold leading-5 text-slate-600">
            Search for the team or organization, or enter the invite code from
            your coach. QR codes and direct join links still work too.
          </p>
        </div>

        <div className="gd-card-light mt-3 grid gap-3 rounded-lg p-3 md:grid-cols-2">
          <form action="/registration" className="space-y-2">
            <label
              className="text-xs font-black uppercase text-slate-500"
              htmlFor="registration-search"
            >
              Search team or organization
            </label>
            <div className="flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-blue-400"
                defaultValue={query ?? ""}
                id="registration-search"
                name="q"
                placeholder="ZOO Squad, PineWood, 10U"
                type="search"
              />
              <button
                className="rounded-md bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-500"
                type="submit"
              >
                Search
              </button>
            </div>
          </form>

          <form action="/registration" className="space-y-2">
            <label
              className="text-xs font-black uppercase text-slate-500"
              htmlFor="registration-code"
            >
              Invite ID or join link
            </label>
            <div className="flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-blue-400"
                defaultValue={code ?? ""}
                id="registration-code"
                name="code"
                placeholder="Paste ID, code, or /join link"
              />
              <button
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                type="submit"
              >
                Look up
              </button>
            </div>
          </form>
        </div>

        <div className="mt-3">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            {resultMessage}
          </p>
        </div>

        <div className="mt-2 space-y-2">
          {lookup.models.length > 0 ? (
            lookup.models.map((model) =>
              model.invite ? (
                <Link
                  className="gd-card-light gd-card-interactive block rounded-lg px-3 py-2.5"
                  href={`/join/${model.invite.inviteCode}`}
                  key={model.invite.id}
                >
                  <span className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      <span className="block text-base font-black">
                        {model.team?.name ?? model.invite.title}
                      </span>
                      <span className="mt-0.5 block text-xs font-semibold text-slate-500">
                        {model.organization?.name ?? "Organization"} /{" "}
                        {model.invite.title}
                      </span>
                      <span className="mt-0.5 block text-[11px] font-black uppercase text-slate-400">
                        Code: {model.invite.inviteCode}
                      </span>
                    </span>
                    <span className="w-fit rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-black text-white">
                      Register
                    </span>
                  </span>
                </Link>
              ) : null,
            )
          ) : hasSearch ? (
            <div className="gd-card-light rounded-lg border-dashed p-3">
              <h2 className="text-base font-black">
                No matching registration found.
              </h2>
              <p className="mt-1 text-xs font-semibold text-slate-600">
                Check the spelling, ask your coach for the invite code, or use
                their direct join link if they shared one.
              </p>
            </div>
          ) : (
            <div className="gd-card-light rounded-lg border-dashed p-3">
              <h2 className="text-base font-black">
                Start with a search or code.
              </h2>
              <p className="mt-1 text-xs font-semibold text-slate-600">
                GameDay does not show every open team by default. That keeps the
                parent path useful when there are thousands of teams.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
