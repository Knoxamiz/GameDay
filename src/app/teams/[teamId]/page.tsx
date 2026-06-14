import TeamDetails from "../../components/TeamDetails";
import { redirect } from "next/navigation";
import { getCurrentAuthSession } from "../../data/currentUser.server";

type TeamDetailsPageProps = {
  params: Promise<{
    teamId: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function TeamDetailsPage({
  params,
}: TeamDetailsPageProps) {
  const { teamId } = await params;
  const session = await getCurrentAuthSession();

  if (!session) {
    redirect("/login");
  }

  return <TeamDetails teamId={teamId} role={session.claims.role} />;
}
