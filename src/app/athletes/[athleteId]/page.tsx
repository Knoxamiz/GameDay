import Link from "next/link";
import { notFound } from "next/navigation";
import MvpNav from "../../components/MvpNav";
import TransportationStatusPicker from "../../components/TransportationStatusPicker";
import { athletes, getAthleteById } from "../../data/athletes";
import { getCoachesByIds } from "../../data/coaches";
import { getEventById, getEventsByIds } from "../../data/events";
import { teamUpdatesByAthleteId } from "../../data/messages";
import {
  getMissingRegistrationRequirements,
  getRegistrationById,
} from "../../data/registrations";
import { getTeamById } from "../../data/teams";
import {
  getTransportationEntryByAthleteAndEventId,
  transportationOptions,
} from "../../data/transportation";

type AthleteDetailsPageProps = {
  params: Promise<{
    athleteId: string;
  }>;
};

export function generateStaticParams() {
  return athletes.map((athlete) => ({
    athleteId: athlete.id,
  }));
}

export default async function AthleteDetailsPage({
  params,
}: AthleteDetailsPageProps) {
  const { athleteId } = await params;
  const athlete = getAthleteById(athleteId);

  if (!athlete) {
    notFound();
  }

  const team = getTeamById(athlete.teamId);
  const nextEvent = athlete.nextEventId
    ? getEventById(athlete.nextEventId)
    : undefined;
  const upcomingEvents = getEventsByIds(athlete.upcomingEventIds);
  const registration = getRegistrationById(athlete.registrationId);
  const missingRequirements = getMissingRegistrationRequirements(registration);
  const coaches = team ? getCoachesByIds(team.coachIds) : [];
  const teamUpdates = teamUpdatesByAthleteId[athlete.id] ?? [];
  const primaryCoach = coaches[0];
  const transportation = nextEvent
    ? getTransportationEntryByAthleteAndEventId(athlete.id, nextEvent.id)
    : undefined;
  const transportationStatus = transportation?.status ?? "Unknown";
  const missingRequirementLabels = missingRequirements.map(
    (requirement) => requirement.label,
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav />

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <Link href="/" className="text-2xl font-bold">
            Back {athlete.name}
          </Link>
        </div>

        <p className="mt-5 text-slate-300">{team?.name}</p>
        {nextEvent && (
          <TransportationStatusPicker
            athleteId={athlete.id}
            eventId={nextEvent.id}
            initialStatus={transportationStatus}
            missingRequirementLabels={missingRequirementLabels}
            options={transportationOptions}
          />
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
            <a
              href={nextEvent.directionsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 block w-full rounded-xl bg-blue-500 py-3 text-center font-semibold text-white"
            >
              Directions
            </a>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Team Updates</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            {teamUpdates.map((update) => (
              <li key={update}>{update}</li>
            ))}
          </ul>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Upcoming Events</h2>
          <div className="mt-3 space-y-3">
            {upcomingEvents.map((event) => (
              <div
                key={`${event.title}-${event.shortDate}`}
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
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Registration Status</h2>
          <p
            className={`mt-3 text-sm font-semibold ${
              missingRequirements.length === 0 ? "text-blue-300" : "text-red-300"
            }`}
          >
            {missingRequirements.length === 0
              ? "Ready"
              : `${missingRequirements.length} Missing`}
          </p>
          <div className="mt-3 space-y-2 text-sm text-slate-300">
            {registration && registration.requirements.length > 0 ? (
              registration.requirements.map((requirement) => (
                <div
                  key={requirement.label}
                  className="flex items-center justify-between gap-3"
                >
                  <span>{requirement.label}</span>
                  <span
                    className={
                      requirement.status === "Complete"
                        ? "font-semibold text-blue-300"
                        : "font-semibold text-red-300"
                    }
                  >
                    {requirement.status}
                  </span>
                </div>
              ))
            ) : (
              <p>No registration requirements listed.</p>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Team</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-300">
            {coaches.map((coach) => (
              <p key={coach.id}>{coach.name}</p>
            ))}
          </div>
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
