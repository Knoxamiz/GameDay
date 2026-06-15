import Link from "next/link";
import { redirect } from "next/navigation";
import ParentAthleteCard from "../components/ParentAthleteCard";
import BottomNav from "../components/BottomNav";
import MvpNav from "../components/MvpNav";
import SessionControls from "../components/SessionControls";
import {
  getCurrentAuthSession,
  getCurrentParentUser,
} from "../data/currentUser.server";
import {
  eventHasTeamId,
  getEventDateLabel,
  getEventLocationLabel,
  getEventTimeLabel,
  isPublishedEvent,
} from "../data/events";
import { getEventScheduleReadModel } from "../data/eventSchedule.server";
import { getOrganizationContext } from "../data/organizationContext.server";
import {
  getParentAthleteRegistrationReadModel,
  getRegistrationByAthlete,
} from "../data/parentAthleteRegistration.server";
import {
  getRegistrationRosterStatus,
  isParentEventEligibleRegistration,
} from "../data/registrations";
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";
import { getLandingRouteForClaims } from "../infrastructure/auth";

export const dynamic = "force-dynamic";

export default async function ParentHome() {
  const session = await getCurrentAuthSession();

  if (!session) {
    redirect("/login");
  }

  if (session.claims.role !== "parent") {
    redirect(getLandingRouteForClaims(session.claims));
  }

  const currentUser = await getCurrentParentUser();

  if (currentUser.source !== "firebase-session") {
    redirect("/login");
  }
  const {
    athletes: parentAthletes,
    parent: currentParent,
    registrations,
  } = await getParentAthleteRegistrationReadModel(currentUser.parentId);
  const schedule = await getEventScheduleReadModel("parent");
  const organizationContext = await getOrganizationContext(
    schedule.organizationIds,
  );
  const teamsById = new Map(schedule.teams.map((team) => [team.id, team]));
  const nextEventByAthleteId = new Map(
    parentAthletes.map((athlete) => {
      const registration = getRegistrationByAthlete(athlete, registrations);

      return [
        athlete.id,
        registration && isParentEventEligibleRegistration(registration)
          ? schedule.events.find(
              (event) =>
                isPublishedEvent(event) &&
                eventHasTeamId(event, athlete.teamId),
            )
          : undefined,
      ];
    }),
  );
  const repositories = createFirestoreRepositories();
  const [attendanceEntries, transportationEntries] = await Promise.all([
    Promise.all(
      parentAthletes.map((athlete) =>
        repositories.attendance.listByAthleteId(athlete.id),
      ),
    ).then((entryLists) => entryLists.flat()),
    Promise.all(
      parentAthletes.map((athlete) =>
        repositories.transportation.listByAthleteId(athlete.id),
      ),
    ).then((entryLists) => entryLists.flat()),
  ]);
  const parentAnnouncements: { content: string; id: string }[] = [];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav organizationContext={organizationContext} />

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
            const nextEvent = nextEventByAthleteId.get(athlete.id);
            const attendanceStatus =
              attendanceEntries.find(
                (entry) =>
                  entry.athleteId === athlete.id &&
                  entry.eventId === nextEvent?.id,
              )?.status ?? "Unknown";
            const transportationStatus =
              transportationEntries.find(
                (entry) =>
                  entry.athleteId === athlete.id &&
                  entry.eventId === nextEvent?.id,
              )?.status ?? "Unknown";

            return (
              <ParentAthleteCard
                key={athlete.name}
                athleteId={athlete.id}
                athleteName={athlete.name}
                teamName={teamsById.get(athlete.teamId)?.name ?? athlete.teamId}
                nextEvent={
                  nextEvent
                    ? {
                        date: getEventDateLabel(nextEvent),
                        directionsUrl: "",
                        id: nextEvent.id,
                        location: getEventLocationLabel(nextEvent),
                        time: getEventTimeLabel(nextEvent),
                        title: nextEvent.title,
                      }
                    : undefined
                }
                initialTransportationStatus={transportationStatus}
                initialAttendanceStatus={attendanceStatus}
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
            href={"/events"}
            className="mt-4 block w-full rounded-xl bg-blue-500 py-3 text-center font-semibold text-white"
          >
            View Schedule
          </Link>
        </div>

        <BottomNav
          items={[
            { href: "/parent", label: "Home" },
            { href: "/events", label: "Schedule" },
            { href: "/registration", label: "Registration" },
          ]}
        />
      </section>
    </main>
  );
}
