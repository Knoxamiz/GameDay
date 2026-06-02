import TeamDetails from "../../components/TeamDetails";
import { getMvpNavRole } from "../../components/MvpNav";
import { teams } from "../../data/teams";

type TeamDetailsPageProps = {
  params: Promise<{
    teamId: string;
  }>;
  searchParams?: Promise<{
    role?: string | string[];
  }>;
};

export function generateStaticParams() {
  return teams.map((team) => ({
    teamId: team.id,
  }));
}

export default async function TeamDetailsPage({
  params,
  searchParams,
}: TeamDetailsPageProps) {
  const { teamId } = await params;
  const role = getMvpNavRole((await searchParams)?.role);

  return <TeamDetails teamId={teamId} role={role} />;
}
