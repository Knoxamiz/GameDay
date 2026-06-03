import ParentAthleteCard from "../components/ParentAthleteCard";
import BottomNav from "../components/BottomNav";
import MvpNav, { getRoleHref } from "../components/MvpNav";
import { getAthletesByIds, parentHomeAthleteIds } from "../data/athletes";
import { getAttendanceEntryByAthleteAndEventId } from "../data/attendance";
import { getEventById } from "../data/events";
import { parentHomeAnnouncements } from "../data/messages";
import { getRegistrationById } from "../data/registrations";
import { getTeamById } from "../data/teams";
import { getTransportationEntryByAthleteAndEventId } from "../data/transportation";

const parentAthletes = getAthletesByIds(parentHomeAthleteIds);

export default function ParentHome() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav role="parent" />

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h1 className="text-3xl font-bold">GameDay</h1>
        </div>

        <p className="mt-5 text-lg text-slate-300">Good Evening Jennifer</p>

        <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-400">
          My Athletes
        </h2>

        <div className="mt-4 space-y-3">
          {parentAthletes.map((athlete) => {
            const team = getTeamById(athlete.teamId);
            const nextEvent = athlete.nextEventId
              ? getEventById(athlete.nextEventId)
              : undefined;
            const registration = getRegistrationById(athlete.registrationId);
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
            {parentHomeAnnouncements.map((announcement) => (
              <li key={announcement}>{announcement}</li>
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
