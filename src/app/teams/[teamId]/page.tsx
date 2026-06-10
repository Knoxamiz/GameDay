import TeamDetails from "../../components/TeamDetails";
import { getMvpNavRole } from "../../components/MvpNav";

type TeamDetailsPageProps = {
  params: Promise<{
    teamId: string;
  }>;
  searchParams?: Promise<{
    role?: string | string[];
  }>;
};

export const dynamic = "force-dynamic";

export default async function TeamDetailsPage({
  params,
  searchParams,
}: TeamDetailsPageProps) {
  const { teamId } = await params;
  const role = getMvpNavRole((await searchParams)?.role);

  return <TeamDetails teamId={teamId} role={role} />;
}
