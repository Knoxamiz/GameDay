import ParentAthleteCard from "../components/ParentAthleteCard";
import BottomNav from "../components/BottomNav";
import MvpNav, { getRoleHref } from "../components/MvpNav";
import { getAttendanceEntryByAthleteAndEventId } from "../data/attendance";
import { getCurrentParentUser } from "../data/currentUser.server";
import { getEventById } from "../data/events";
import { getMessagesByParentId } from "../data/messages";
import {
  getParentAthleteRegistrationReadModel,
  getRegistrationByAthlete,
} from "../data/parentAthleteRegistration.server";
import { getTeamById } from "../data/teams";
import { getTransportationEntryByAthleteAndEventId } from "../data/transportation";

export default async function ParentHome() {
  const currentUser = await getCurrentParentUser();
  const {
    athletes: parentAthletes,
    parent: currentParent,
    registrations,
  } = await getParentAthleteRegistrationReadModel(currentUser.parentId);
  const parentAnnouncements = getMessagesByParentId(currentParent.id);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav role="parent" />

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h1 className="text-3xl font-bold">GameDay</h1>
        </div>

        <p className="mt-5 text-lg text-slate-300">
          Good Evening {currentParent.firstName}
        </p>

        <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-400">
          My Athletes
        </h2>

        <div className="mt-4 space-y-3">
          {parentAthletes.map((athlete) => {
            const team = getTeamById(athlete.teamId);
            const nextEvent = athlete.nextEventId
              ? getEventById(athlete.nextEventId)
              : undefined;
            const registration = getRegistrationByAthlete(
              athlete,
              registrations,
            );
            const transportation = nextEvent
              ? getTransportationEntryByAthleteAndEventId(
                  athlete.id,
                  nextEvent.id,
                )
              : undefined;
            const attendance = nextEvent
              ? getAttendanceEntryByAthleteAndEventId(athlete.id, nextEvent.id)
              : undefined;

            return (
              <ParentAthleteCard
                key={athlete.name}
                athleteId={athlete.id}
                athleteName={athlete.name}
                teamName={team?.name}
                nextEvent={nextEvent}
                initialTransportationStatus={transportation?.status ?? "Unknown"}
                initialAttendanceStatus={attendance?.status ?? "Unknown"}
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
