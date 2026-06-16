import TeamsHome from "../../teams/page";

type AdminTeamsPageProps = {
  searchParams?: Promise<{
    organizationId?: string | string[];
  }>;
};

export const dynamic = "force-dynamic";

export default async function AdminTeamsPage(props: AdminTeamsPageProps) {
  return TeamsHome({ ...props, adminRouteBase: true });
}
