import { notFound } from "next/navigation";
import JoinRegistrationFlow from "../../components/JoinRegistrationFlow";
import MvpNav from "../../components/MvpNav";
import {
  getActiveRegistrationInviteByCode,
  getRegistrationInviteContext,
  registrationInvites,
} from "../../data/invites";

type JoinInvitePageProps = {
  params: Promise<{
    inviteCode: string;
  }>;
};

export function generateStaticParams() {
  return registrationInvites.map((invite) => ({
    inviteCode: invite.code,
  }));
}

export default async function JoinInvitePage({ params }: JoinInvitePageProps) {
  const { inviteCode } = await params;
  const invite = getActiveRegistrationInviteByCode(inviteCode);

  if (!invite) {
    notFound();
  }

  const { organization, team } = getRegistrationInviteContext(invite);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav role="parent" />
        <JoinRegistrationFlow
          invite={invite}
          organization={organization}
          team={team}
        />
      </section>
    </main>
  );
}
