import TeamDetails from "../../components/TeamDetails";
import { teams } from "../../data/teams";

type TeamDetailsPageProps = {
  params: Promise<{
    teamId: string;
  }>;
};

export function generateStaticParams() {
  return teams.map((team) => ({
    teamId: team.id,
  }));
}

export default async function TeamDetailsPage({
  params,
}: TeamDetailsPageProps) {
  const { teamId } = await params;

  return <TeamDetails teamId={teamId} />;
}
