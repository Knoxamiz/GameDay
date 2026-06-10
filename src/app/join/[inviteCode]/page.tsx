import { notFound } from "next/navigation";
import JoinRegistrationFlow from "../../components/JoinRegistrationFlow";
import MvpNav from "../../components/MvpNav";
import { getRegistrationInviteReadModelByCode } from "../../data/registrationInviteRead.server";

type JoinInvitePageProps = {
  params: Promise<{
    inviteCode: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function JoinInvitePage({ params }: JoinInvitePageProps) {
  const { inviteCode } = await params;
  const { invite, organization, team } =
    await getRegistrationInviteReadModelByCode(inviteCode);

  if (!invite) {
    notFound();
  }

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
