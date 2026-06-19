import Link from "next/link";
import SignupStartOptions, {
  type SignupIntent,
} from "../components/SignupStartOptions";
import { getCurrentAuthSession } from "../data/currentUser.server";

export const dynamic = "force-dynamic";

type SignupPageProps = {
  searchParams?: Promise<{
    intent?: string | string[];
  }>;
};

function getIntent(value?: string | string[]): SignupIntent {
  const intent = Array.isArray(value) ? value[0] : value;

  if (
    intent === "organization" ||
    intent === "invite" ||
    intent === "team" ||
    intent === "parent"
  ) {
    return intent;
  }

  return "organization";
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const [session, resolvedSearchParams] = await Promise.all([
    getCurrentAuthSession(),
    searchParams,
  ]);
  const intent = getIntent(resolvedSearchParams?.intent);
  const heading =
    intent === "invite"
      ? "Open your invited GameDay access."
      : "Start with the role that creates the work.";
  const subheading =
    intent === "invite"
      ? "Use the same email your organization invited. GameDay will connect the matching membership when you sign in."
      : "Admins create paid organization workspaces. Coaches can create one free team. Parents are free and attach to a real team through registration.";

  return (
    <main className="min-h-screen overflow-hidden bg-[#020713] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.28),transparent_24%),linear-gradient(120deg,#020713_0%,#061528_100%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-[linear-gradient(180deg,transparent,rgba(2,6,23,0.95))]" />
      </div>

      <header className="relative z-10 border-b border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-3 py-2.5 sm:px-5">
          <Link className="text-lg font-black tracking-wide text-white" href="/">
            GAMEDAY
          </Link>
          <Link
            className="rounded-md border border-white/20 px-3 py-1.5 text-xs font-black text-white hover:bg-white/10"
            href={session ? "/account" : "/login"}
          >
            {session ? "Account" : "Log in"}
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-5xl px-3 py-4 sm:px-5">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-wide text-blue-300">
            Signup
          </p>
          <h1 className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">
            {heading}
          </h1>
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-300">
            {subheading}
          </p>
          {session?.user.email && (
            <p className="mt-3 inline-flex rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1.5 text-xs font-black text-blue-200">
              Signed in as {session.user.email}
            </p>
          )}
        </div>

        <div className="mt-3">
          <SignupStartOptions
            initialIntent={intent}
            isSignedIn={Boolean(session)}
          />
        </div>
      </section>
    </main>
  );
}
