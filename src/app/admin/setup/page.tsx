import BottomNav from "../../components/BottomNav";
import AdminSetupPanel from "../../components/AdminSetupPanel";
import MvpNav, { getRoleHref } from "../../components/MvpNav";
import SessionControls from "../../components/SessionControls";
import { getAdminSetupReadModel } from "../../data/adminSetup.server";

export const dynamic = "force-dynamic";

export default async function AdminSetupPage() {
  const setup = await getAdminSetupReadModel();

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav role="admin" />

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h1 className="text-3xl font-bold">Setup</h1>
          <p className="mt-3 text-sm text-slate-300">
            Create the real organization, team, coach, and registration records.
          </p>
        </div>

        <SessionControls role="admin" />

        <AdminSetupPanel
          canManageSetup={setup.canManageSetup}
          coaches={setup.coaches}
          organizationIds={setup.organizationIds}
          organizations={setup.organizations}
          registrationInvites={setup.registrationInvites}
          teams={setup.teams}
        />

        <BottomNav
          items={[
            { href: "/admin", label: "Home" },
            { href: "/admin/setup", label: "Setup" },
            { href: "/admin/registrations", label: "Registration" },
            { href: getRoleHref("/events", "admin"), label: "Schedule" },
          ]}
        />
      </section>
    </main>
  );
}
