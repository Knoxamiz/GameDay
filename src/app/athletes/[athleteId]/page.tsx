import Link from "next/link";
import { notFound } from "next/navigation";
import MvpNav from "../../components/MvpNav";
import { athletes, getAthleteById } from "../../data/athletes";

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

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav />

        <Link href="/" className="text-sm font-semibold text-blue-400">
          Back to Parent Home
        </Link>

        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Athlete Details
          </p>
          <h1 className="mt-2 text-3xl font-bold">{athlete.name}</h1>
          <p className="mt-1 text-sm text-slate-400">{athlete.team}</p>

          <div className="mt-5 rounded-xl bg-slate-800 p-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Next Event
            </p>
            <h2 className="mt-2 text-xl font-bold">
              {athlete.nextEvent.title}
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              {athlete.nextEvent.date}
            </p>
            <p className="mt-1 text-sm text-slate-300">
              {athlete.nextEvent.time}
            </p>
            <p className="mt-1 text-sm text-slate-300">
              {athlete.nextEvent.location}
            </p>
          </div>

          <a
            href={athlete.nextEvent.directionsUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 block w-full rounded-xl bg-blue-500 py-3 text-center font-semibold text-white"
          >
            Directions
          </a>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Transportation</h2>
          <p className="mt-3 font-semibold text-blue-300">
            {athlete.transportation.status}
          </p>
          <p className="mt-1 text-sm text-slate-300">
            {athlete.transportation.details}
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Team Updates</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            {athlete.teamUpdates.map((update) => (
              <li key={update}>{update}</li>
            ))}
          </ul>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Upcoming Events</h2>
          <div className="mt-3 space-y-3">
            {athlete.upcomingEvents.map((event) => (
              <div key={`${event.title}-${event.date}`} className="rounded-xl bg-slate-800 p-4">
                <p className="font-semibold">{event.title}</p>
                <p className="mt-1 text-sm text-slate-300">{event.date}</p>
                <p className="mt-1 text-sm text-slate-300">{event.time}</p>
                <p className="mt-1 text-sm text-slate-300">{event.location}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Registration Status</h2>
          <p className="mt-3 font-semibold text-blue-300">
            {athlete.registrationStatus.status}
          </p>
          <p className="mt-1 text-sm text-slate-300">
            {athlete.registrationStatus.details}
          </p>
        </div>

        <a
          href={athlete.coach.contactUrl}
          className="mt-4 block w-full rounded-xl border border-slate-700 bg-slate-900 py-3 text-center font-semibold text-white"
        >
          Contact Coach
        </a>
      </section>
    </main>
  );
}
