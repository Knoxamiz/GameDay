import JoinRegistrationFlow from "../../components/JoinRegistrationFlow";
import MvpNav from "../../components/MvpNav";
import { getRegistrationInviteUnavailableMessage } from "../../data/invites";
import { getRegistrationInviteReadModelByCode } from "../../data/registrationInviteRead.server";

type JoinInvitePageProps = {
  params: Promise<{
    inviteCode: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function JoinInvitePage({ params }: JoinInvitePageProps) {
  const { inviteCode } = await params;
  const { availability, invite, organization, team } =
    await getRegistrationInviteReadModelByCode(inviteCode);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav
          organizationContext={
            organization
              ? { count: 1, label: organization.name }
              : undefined
          }
        />
        {availability.available && invite ? (
          <JoinRegistrationFlow
            invite={invite}
            organization={organization}
            team={team}
          />
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Registration Unavailable
            </p>
            <h1 className="mt-3 text-3xl font-bold">
              {invite?.title ?? "Invite unavailable"}
            </h1>
            <p className="mt-3 text-slate-300">
              {getRegistrationInviteUnavailableMessage(availability.reason)}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
