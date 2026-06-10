import JoinRegistrationFlow from "../components/JoinRegistrationFlow";
import MvpNav from "../components/MvpNav";
import { getPrimaryRegistrationInviteReadModel } from "../data/registrationInviteRead.server";

export const dynamic = "force-dynamic";

export default async function RegistrationHome() {
  const { invite, organization, team } =
    await getPrimaryRegistrationInviteReadModel();

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav role="parent" />

        {invite ? (
          <JoinRegistrationFlow
            invite={invite}
            organization={organization}
            team={team}
          />
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Registration
            </p>
            <h1 className="mt-3 text-3xl font-bold">Registration is not open.</h1>
            <p className="mt-3 text-slate-300">
              No active team invite is available right now.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
