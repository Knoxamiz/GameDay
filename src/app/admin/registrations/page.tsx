import BottomNav from "../../components/BottomNav";
import { redirect } from "next/navigation";
import MvpNav, { getRoleHref } from "../../components/MvpNav";
import RegistrationReviewBoard from "../../components/RegistrationReviewBoard";
import { getAdminRegistrationReadModel } from "../../data/adminRegistrationRead.server";
import { getCurrentAuthSession } from "../../data/currentUser.server";

export const dynamic = "force-dynamic";

export default async function AdminRegistrationsPage() {
  const session = await getCurrentAuthSession();

  if (session?.claims.role !== "admin") {
    redirect("/login?role=admin");
  }

  const registrationReadModel = await getAdminRegistrationReadModel();

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav role="admin" />

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h1 className="text-3xl font-bold">Registration Review</h1>
          <p className="mt-3 text-sm text-slate-300">
            Pending players, missing items, and approval readiness.
          </p>
        </div>

        <RegistrationReviewBoard
          registrations={registrationReadModel.registrations}
          source={registrationReadModel.source}
        />

        <BottomNav
          items={[
            { href: "/admin", label: "Home" },
            { href: getRoleHref("/teams", "admin"), label: "Teams" },
            { href: "/admin/registrations", label: "Registration" },
            { href: getRoleHref("/events", "admin"), label: "Schedule" },
          ]}
        />
      </section>
    </main>
  );
}
