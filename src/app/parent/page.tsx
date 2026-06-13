import Link from "next/link";
import { redirect } from "next/navigation";
import ParentAthleteCard from "../components/ParentAthleteCard";
import BottomNav from "../components/BottomNav";
import MvpNav, { getRoleHref } from "../components/MvpNav";
import SessionControls from "../components/SessionControls";
import { getCurrentParentUser } from "../data/currentUser.server";
import {
  eventHasTeamId,
  getEventDateLabel,
  getEventLocationLabel,
  getEventTimeLabel,
} from "../data/events";
import { getEventScheduleReadModel } from "../data/eventSchedule.server";
import {
  getParentAthleteRegistrationReadModel,
  getRegistrationByAthlete,
} from "../data/parentAthleteRegistration.server";
import { getRegistrationRosterStatus } from "../data/registrations";

export const dynamic = "force-dynamic";

export default async function ParentHome() {
  const currentUser = await getCurrentParentUser();

  if (currentUser.source !== "firebase-session") {
    redirect("/login?role=parent");
  }
  const {
    athletes: parentAthletes,
    parent: currentParent,
    registrations,
  } = await getParentAthleteRegistrationReadModel(currentUser.parentId);
  const schedule = await getEventScheduleReadModel("parent");
  const teamsById = new Map(schedule.teams.map((team) => [team.id, team]));
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
                teamName={teamsById.get(athlete.teamId)?.name ?? athlete.teamId}
                nextEvent={schedule.events
                  .filter((event) => eventHasTeamId(event, athlete.teamId))
                  .map((event) => ({
                    date: getEventDateLabel(event),
                    directionsUrl: "",
                    id: event.id,
                    location: getEventLocationLabel(event),
                    time: getEventTimeLabel(event),
                    title: event.title,
                  }))[0]}
                initialTransportationStatus="Unknown"
                initialAttendanceStatus="Unknown"
                paymentRequirements={registration?.paymentRequirements ?? []}
                registrationId={registration?.id ?? athlete.registrationId}
                registrationRequirements={registration?.requirements ?? []}
                registrationStatus={registration?.status ?? "Pending"}
                rosterStatus={getRegistrationRosterStatus(registration)}
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

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Schedule</h2>
          <p className="mt-3 text-sm text-slate-300">
            {schedule.events.length === 0
              ? "No events scheduled for your registered athletes."
              : `${schedule.events.length} event${
                  schedule.events.length === 1 ? "" : "s"
                } for your registered athletes.`}
          </p>
          <Link
            href={getRoleHref("/events", "parent")}
            className="mt-4 block w-full rounded-xl bg-blue-500 py-3 text-center font-semibold text-white"
          >
            View Schedule
          </Link>
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
