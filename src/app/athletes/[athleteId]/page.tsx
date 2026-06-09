import Link from "next/link";
import { notFound } from "next/navigation";
import AttendanceStatusPicker from "../../components/AttendanceStatusPicker";
import AthleteReadinessCard from "../../components/AthleteReadinessCard";
import MvpNav, { getRoleHref } from "../../components/MvpNav";
import RegistrationRequirementsChecklist from "../../components/RegistrationRequirementsChecklist";
import RideShareBoard from "../../components/RideShareBoard";
import TransportationStatusPicker from "../../components/TransportationStatusPicker";
import { getAttendanceEntryByAthleteAndEventId } from "../../data/attendance";
import { getCoachesByIds } from "../../data/coaches";
import { getCurrentParentUser } from "../../data/currentUser.server";
import { getEventById, getEventsByIds } from "../../data/events";
import { getMessagesByAthleteId } from "../../data/messages";
import { getAthleteRegistrationReadModel } from "../../data/parentAthleteRegistration.server";
import { getTeamById } from "../../data/teams";
import {
  getTransportationEntriesByEventId,
  getTransportationEntryByAthleteAndEventId,
  transportationOptions,
} from "../../data/transportation";

type AthleteDetailsPageProps = {
  params: Promise<{
    athleteId: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function AthleteDetailsPage({
  params,
}: AthleteDetailsPageProps) {
  const { athleteId } = await params;
  const currentUser = await getCurrentParentUser();
  const readModel = await getAthleteRegistrationReadModel(athleteId, {
    parentId: currentUser.parentId,
  });

  if (!readModel) {
    notFound();
  }

  const { athlete, registration } = readModel;
  const team = getTeamById(athlete.teamId);
  const nextEvent = athlete.nextEventId
    ? getEventById(athlete.nextEventId)
    : undefined;
  const upcomingEvents = getEventsByIds(athlete.upcomingEventIds);
  const registrationRequirements = registration?.requirements ?? [];
  const registrationId = registration?.id ?? athlete.registrationId;
  const coaches = team ? getCoachesByIds(team.coachIds) : [];
  const teamUpdates = getMessagesByAthleteId(athlete.id);
  const primaryCoach = coaches[0];
  const transportation = nextEvent
    ? getTransportationEntryByAthleteAndEventId(athlete.id, nextEvent.id)
    : undefined;
  const transportationEntries = nextEvent
    ? getTransportationEntriesByEventId(nextEvent.id)
    : [];
  const transportationStatus = transportation?.status ?? "Unknown";
  const attendance = nextEvent
    ? getAttendanceEntryByAthleteAndEventId(athlete.id, nextEvent.id)
    : undefined;
  const attendanceStatus = attendance?.status ?? "Unknown";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav role="parent" />

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <Link href="/parent" className="text-2xl font-bold">
            Back {athlete.name}
          </Link>
        </div>

        <p className="mt-5 text-slate-300">{team?.name}</p>
        <AthleteReadinessCard
          athleteId={athlete.id}
          eventId={nextEvent?.id}
          initialAttendanceStatus={attendanceStatus}
          initialTransportationStatus={transportationStatus}
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

        {nextEvent && (
          <>
            <AttendanceStatusPicker
              athleteId={athlete.id}
              eventId={nextEvent.id}
              initialStatus={attendanceStatus}
            />
            <TransportationStatusPicker
              athleteId={athlete.id}
              eventId={nextEvent.id}
              initialStatus={transportationStatus}
              registrationId={registrationId}
              registrationRequirements={registrationRequirements}
              options={transportationOptions}
            />
            <RideShareBoard
              entries={transportationEntries}
              eventId={nextEvent.id}
              role="parent"
            />
          </>
        )}

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Next Event
          </h2>
          <div className="mt-4 rounded-xl bg-slate-800 p-4">
            <p className="font-semibold">{nextEvent?.type}</p>
            <p className="mt-3 text-sm text-slate-300">
              {nextEvent?.date ?? "TBD"}
            </p>
            {nextEvent?.time && (
              <p className="mt-1 text-sm text-slate-300">{nextEvent.time}</p>
            )}
            {nextEvent?.location && (
              <p className="mt-3 text-sm text-slate-300">
                {nextEvent.location}
              </p>
            )}
          </div>

          {nextEvent?.directionsUrl && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <a
                href={nextEvent.directionsUrl}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl border border-slate-700 bg-slate-900 py-3 text-center font-semibold text-white"
              >
                Directions
              </a>
              <Link
                href={getRoleHref(`/events/${nextEvent.id}`, "parent")}
                className="block rounded-xl bg-blue-500 py-3 text-center font-semibold text-white"
              >
                Event Details
              </Link>
            </div>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Team Updates</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            {teamUpdates.map((update) => (
              <li key={update.id}>{update.content}</li>
            ))}
          </ul>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Upcoming Events</h2>
          <div className="mt-3 space-y-3">
            {upcomingEvents.map((event) => (
              <Link
                key={`${event.title}-${event.shortDate}`}
                href={getRoleHref(`/events/${event.id}`, "parent")}
                className="rounded-xl bg-slate-800 p-4"
              >
                <p className="font-semibold">
                  {event.shortDate} {event.title}
                </p>
                {event.time && (
                  <p className="mt-1 text-sm text-slate-300">{event.time}</p>
                )}
                {event.location && (
                  <p className="mt-1 text-sm text-slate-300">
                    {event.location}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>

        <RegistrationRequirementsChecklist
          registrationId={registrationId}
          requirements={registrationRequirements}
        />

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Team</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-300">
            {coaches.map((coach) => (
              <p key={coach.id}>{coach.name}</p>
            ))}
          </div>
          {team && (
            <Link
              href={getRoleHref(`/teams/${team.id}`, "parent")}
              className="mt-4 block w-full rounded-xl border border-slate-700 bg-slate-900 py-3 text-center font-semibold text-white"
            >
              Team Details
            </Link>
          )}
        </div>

        {primaryCoach ? (
          <a
            href={`mailto:${primaryCoach.email}`}
            className="mt-4 block w-full rounded-xl border border-slate-700 bg-slate-900 py-3 text-center font-semibold text-white"
          >
            Contact Coach
          </a>
        ) : (
          <p className="mt-4 rounded-xl border border-slate-700 bg-slate-900 py-3 text-center font-semibold text-slate-400">
            Coach Not Assigned
          </p>
        )}
      </section>
    </main>
  );
}
