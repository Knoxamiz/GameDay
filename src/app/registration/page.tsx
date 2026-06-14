import Link from "next/link";
import JoinRegistrationFlow from "../components/JoinRegistrationFlow";
import MvpNav from "../components/MvpNav";
import { getOrganizationContext } from "../data/organizationContext.server";
import { getParentRegistrationInviteReadModels } from "../data/registrationInviteRead.server";

export const dynamic = "force-dynamic";

export default async function RegistrationHome() {
  const inviteModels = await getParentRegistrationInviteReadModels();
  const primaryInvite = inviteModels.length === 1 ? inviteModels[0] : undefined;
  const organizationContext = await getOrganizationContext(
    inviteModels
      .map((model) => model.organization?.id)
      .filter((organizationId): organizationId is string => Boolean(organizationId)),
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav organizationContext={organizationContext} />

        {primaryInvite?.invite ? (
          <JoinRegistrationFlow
            invite={primaryInvite.invite}
            organization={primaryInvite.organization}
            team={primaryInvite.team}
          />
        ) : inviteModels.length > 1 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Registration
            </p>
            <h1 className="mt-3 text-3xl font-bold">Choose a team invite</h1>
            <div className="mt-5 space-y-3">
              {inviteModels.map((model) =>
                model.invite ? (
                  <Link
                    className="block rounded-xl border border-slate-700 bg-slate-950 p-4"
                    href={`/join/${model.invite.inviteCode}`}
                    key={model.invite.id}
                  >
                    <span className="block font-semibold text-white">
                      {model.invite.title}
                    </span>
                    <span className="mt-1 block text-sm text-slate-400">
                      {model.organization?.name} - {model.team?.name}
                    </span>
                  </Link>
                ) : null,
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Registration
            </p>
            <h1 className="mt-3 text-3xl font-bold">Registration is not open.</h1>
            <p className="mt-3 text-slate-300">
              No open invite is available for your teams. Use the join link
              provided by your organization for a new team registration.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
