import ParentAthleteCard from "../components/ParentAthleteCard";
import BottomNav from "../components/BottomNav";
import MvpNav, { getRoleHref } from "../components/MvpNav";
import SessionControls from "../components/SessionControls";
import { getCurrentParentUser } from "../data/currentUser.server";
import {
  getParentAthleteRegistrationReadModel,
  getRegistrationByAthlete,
} from "../data/parentAthleteRegistration.server";

export const dynamic = "force-dynamic";

export default async function ParentHome() {
  const currentUser = await getCurrentParentUser();
  const {
    athletes: parentAthletes,
    parent: currentParent,
    registrations,
  } = await getParentAthleteRegistrationReadModel(currentUser.parentId);
  const parentAnnouncements: { content: string; id: string }[] = [];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav role="parent" />

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h1 className="text-3xl font-bold">GameDay</h1>
        </div>

        <SessionControls role="parent" />

        <p className="mt-5 text-lg text-slate-300">
          Good Evening {currentParent.firstName}
        </p>

        <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-400">
          My Athletes
        </h2>

        <div className="mt-4 space-y-3">
          {parentAthletes.map((athlete) => {
            const registration = getRegistrationByAthlete(
              athlete,
              registrations,
            );

            return (
              <ParentAthleteCard
                key={athlete.name}
                athleteId={athlete.id}
                athleteName={athlete.name}
                teamName={athlete.teamId}
                initialTransportationStatus="Unknown"
                initialAttendanceStatus="Unknown"
                paymentRequirements={registration?.paymentRequirements ?? []}
                registrationId={registration?.id ?? athlete.registrationId}
                registrationRequirements={registration?.requirements ?? []}
                registrationStatus={registration?.status ?? "Pending"}
              />
            );
          })}
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Important Announcements</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            {parentAnnouncements.map((announcement) => (
              <li key={announcement.id}>{announcement.content}</li>
            ))}
          </ul>
        </div>

        <BottomNav
          items={[
            { href: "/parent", label: "Home" },
            { href: getRoleHref("/events", "parent"), label: "Schedule" },
            { href: "/registration", label: "Registration" },
          ]}
        />
      </section>
    </main>
  );
}
