import Link from "next/link";
import { notFound } from "next/navigation";
import AthleteReadinessCard from "../../components/AthleteReadinessCard";
import MvpNav from "../../components/MvpNav";
import RegistrationRequirementsChecklist from "../../components/RegistrationRequirementsChecklist";
import { getCurrentParentUser } from "../../data/currentUser.server";
import type { DocumentRequirement } from "../../data/documents";
import { getOrganizationContext } from "../../data/organizationContext.server";
import { getAthleteRegistrationReadModel } from "../../data/parentAthleteRegistration.server";
import type { RegistrationRequirement } from "../../data/registrations";

type AthleteDetailsPageProps = {
  params: Promise<{
    athleteId: string;
  }>;
};

export const dynamic = "force-dynamic";

function getDocumentRequirementsFromRegistration(
  registrationId: string,
  athleteId: string,
  organizationId: string,
  parentId: string,
  teamId: string,
  requirements: RegistrationRequirement[],
): DocumentRequirement[] {
  return requirements.map((requirement) => ({
    athleteId,
    description: requirement.description ?? "",
    id: `${registrationId}-${requirement.label.toLowerCase().replaceAll(" ", "-")}`,
    label: requirement.label,
    organizationId,
    parentId,
    registrationId,
    required: requirement.required ?? true,
    status: requirement.status,
    teamId,
  }));
}

export default async function AthleteDetailsPage({
  params,
}: AthleteDetailsPageProps) {
  const { athleteId } = await params;
  const currentUser = await getCurrentParentUser();

  if (currentUser.source !== "firebase-session") {
    notFound();
  }
  const readModel = await getAthleteRegistrationReadModel(athleteId, {
    parentId: currentUser.parentId,
  });

  if (!readModel) {
    notFound();
  }

  const { athlete, registration } = readModel;
  const registrationRequirements = Array.isArray(registration?.requirements)
    ? registration.requirements
    : [];
  const registrationId = registration?.id ?? athlete.registrationId;
  const organizationId = registration?.organizationId ?? athlete.organizationId ?? "";
  const documentRequirements = getDocumentRequirementsFromRegistration(
    registrationId,
    athlete.id,
    organizationId,
    currentUser.parentId,
    athlete.teamId,
    registrationRequirements,
  );
  const organizationContext = await getOrganizationContext(
    organizationId ? [organizationId] : [],
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav organizationContext={organizationContext} />

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <Link href="/parent" className="text-2xl font-bold">
            Back {athlete.name}
          </Link>
        </div>

        <p className="mt-5 text-slate-300">{athlete.teamId || "No team listed"}</p>
        <AthleteReadinessCard
          athleteId={athlete.id}
          documentRequirements={documentRequirements}
          initialAttendanceStatus="Unknown"
          initialTransportationStatus="Unknown"
          paymentRequirements={registration?.paymentRequirements ?? []}
          registrationId={registrationId}
          registrationRequirements={registrationRequirements}
          registrationStatus={registration?.status ?? "Pending"}
        />

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Player Info</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-slate-800 p-3">
              <p className="text-slate-400">Grade</p>
              <p className="mt-1 font-semibold text-white">{athlete.grade}</p>
            </div>
            <div className="rounded-xl bg-slate-800 p-3">
              <p className="text-slate-400">Jersey</p>
              <p className="mt-1 font-semibold text-white">
                {athlete.jerseySize}
              </p>
            </div>
          </div>
          <p className="mt-3 rounded-xl bg-slate-800 p-3 text-sm text-slate-300">
            {athlete.school}
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Next Event
          </h2>
          <div className="mt-4 rounded-xl bg-slate-800 p-4">
            <p className="font-semibold">No upcoming event is set.</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Team Updates</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li>No team updates listed.</li>
          </ul>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Upcoming Events</h2>
          <div className="mt-3 space-y-3">
            <p className="rounded-xl bg-slate-800 p-4 text-sm text-slate-300">
              No upcoming events listed.
            </p>
          </div>
        </div>

        <RegistrationRequirementsChecklist
          athleteId={athlete.id}
          documentRequirements={documentRequirements}
          organizationId={organizationId}
          parentId={currentUser.parentId}
          paymentRequirements={registration?.paymentRequirements ?? []}
          registrationId={registrationId}
          requirements={registrationRequirements}
        />

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Team</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-300">
            <p>{athlete.teamId || "No team listed."}</p>
          </div>
        </div>

        <p className="mt-4 rounded-xl border border-slate-700 bg-slate-900 py-3 text-center font-semibold text-slate-400">
          Coach Not Assigned
        </p>
      </section>
    </main>
  );
}
