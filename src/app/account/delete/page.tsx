import type { Metadata } from "next";
import Link from "next/link";
import AccountDeletionRequestForm from "../../components/AccountDeletionRequestForm";
import PublicReleaseFooter from "../../components/PublicReleaseFooter";
import { getCurrentAuthSession } from "../../data/currentUser.server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Delete Account | GameDay",
  description: "Request deletion of a GameDay account.",
};

export default async function DeleteAccountPage() {
  const session = await getCurrentAuthSession();

  return (
    <main className="gd-dark-scope min-h-screen text-white">
      <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-3 py-2.5 sm:px-5">
          <Link className="text-lg font-black text-white" href="/">
            GameDay
          </Link>
          <Link
            className="rounded-md border border-blue-300/25 bg-blue-500/10 px-2.5 py-1.5 text-xs font-black text-blue-100 hover:bg-blue-500/20"
            href={session ? "/account" : "/login"}
          >
            {session ? "Account" : "Log in"}
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-3 py-4 sm:px-5">
        <div className="gd-card-light rounded-lg p-3">
          <p className="text-xs font-black uppercase tracking-wide text-blue-300">
            Account
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">
            Delete account
          </h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
            Start a deletion request for the signed-in GameDay account. This is
            a release-readiness workflow and should be reviewed before public
            app-store launch.
          </p>
          {session?.user.email && (
            <p className="mt-3 inline-flex rounded-full border border-blue-300/25 bg-blue-500/10 px-2.5 py-1 text-xs font-black text-blue-100">
              {session.user.email}
            </p>
          )}
        </div>

        <div className="mt-3">
          {session ? (
            <AccountDeletionRequestForm />
          ) : (
            <div className="gd-card-light rounded-lg p-3">
              <h2 className="text-base font-black">Sign in required</h2>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-300">
                GameDay needs a verified session before it can attach a deletion
                request to the correct account.
              </p>
              <Link
                className="mt-3 inline-flex rounded-md bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-500"
                href="/login"
              >
                Sign in
              </Link>
            </div>
          )}
        </div>

        <div className="gd-card-light mt-3 rounded-lg p-3">
          <h2 className="text-base font-black">What happens next</h2>
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-300">
            The request is stored for review. GameDay should remove or anonymize
            account data that is not required for legal, safety, transaction,
            or operational records. Do not use this page as final legal language
            until the release policy is reviewed.
          </p>
        </div>
      </section>

      <PublicReleaseFooter />
    </main>
  );
}
