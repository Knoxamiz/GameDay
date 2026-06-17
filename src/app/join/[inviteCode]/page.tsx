import Link from "next/link";
import JoinRegistrationFlow from "../../components/JoinRegistrationFlow";
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

      <section className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        {availability.available && invite ? (
          <JoinRegistrationFlow
            invite={invite}
            organization={organization}
            team={team}
          />
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-black uppercase text-red-700">
              Registration Unavailable
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight">
              {invite?.title ?? "Invite unavailable"}
            </h1>
            <p className="mt-3 text-sm font-semibold text-slate-600">
              {getRegistrationInviteUnavailableMessage(availability.reason)}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
