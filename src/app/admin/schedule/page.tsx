import EventsHome from "../../events/page";

type AdminSchedulePageProps = {
  searchParams?: Promise<{
    action?: string | string[];
    organizationId?: string | string[];
  }>;
};

export const dynamic = "force-dynamic";

export default async function AdminSchedulePage(props: AdminSchedulePageProps) {
  return EventsHome({ ...props, adminRouteBase: true });
}
